// backend/src/services/education/simulate.ts
//
// §6.4 — the scenario pipeline, as a pure function.
//
//   1. clone the original course
//   2. apply assignment and exam changes to the cloned domain objects
//   3. rebuild all weekly schedules if any assignment or exam changed
//   4. apply week-level lecture, laboratory and homework changes
//   5. recalculate stress sequentially across all weeks
//   6. produce the comparison and audit output
//
// The order matters: a rebuild after a week-level edit would silently discard
// it, which is exactly what §6.4 exists to prevent.
//
// Determinism is a hard requirement (§13 compares two systems to 1e-6), so
// nothing in here reads the clock or a random source. `created_at` is passed
// in by the caller.

import {
    buildWeekSchedules,
    COURSE_MODEL_THRESHOLDS,
    COURSE_STRESS_MODEL_V1,
    SCHEDULE_ONLY_STRESS_CEILING,
    parseDate,
    predictTrajectory,
    rawWeekIndexForDate,
    semesterWeekCount,
    weekIndexForDate,
    type AssignmentExtension,
    type CourseAssignment,
    type CourseDefinition,
    type CourseExam,
    type ScheduleBuildWarning,
    type StressModelConfig,
    type TrajectoryWeekResult,
    type WeekScheduleV1,
} from "../stressModel";
import {
    isDomainAdjustment,
    OUTCOME_CODES,
    validateAdjustmentShape,
    type AdjustmentOutcome,
    type AdjustmentRequest,
} from "./adjustments";
import {
    redistributeCancelledHours,
    type RedistributionFlow,
    type RedistributionObjective,
} from "./redistribute";
import {
    buildObjectiveMetrics,
    buildWeeklyResults,
    summarizeTrajectory,
    type ObjectiveMetrics,
    type TrajectorySummary,
    type WeeklyResult,
} from "./compare";

const EPSILON = 1e-9;
/** Weekly fields differing by more than this are reported by the rebuild diff. */
const PARITY_TOLERANCE = 1e-6;

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/**
 * An observed weekly stress reading. Matched to a week by date first and by
 * week key second — never by position in the array (§12.8).
 */
export interface ObservedStressEntry {
    week_start?: string;
    week_index?: number;
    week_number?: number;
    value: number;
}

export interface SimulationOptions {
    redistribution_objective: RedistributionObjective;
    max_extensions_per_assignment: number;
    stress_threshold_warning: number;
    stress_threshold_critical: number;
    /** When false, week-level edits and redistribution targets must be in the future. */
    allow_past_week_changes: boolean;
    config: StressModelConfig;
}

export const DEFAULT_SIMULATION_OPTIONS: SimulationOptions = {
    redistribution_objective: "local_week",
    max_extensions_per_assignment: 2,
    // Course-model thresholds (45/55), not the specification's 75/85. The
    // model owners have clarified that 75/85 belong to a total-stress scale
    // this model's additive output cannot reach; thresholds used inside the
    // tool are calibrated to the model's own range instead. See
    // specifications/education_stress/decisions.md §1 and constants.ts.
    stress_threshold_warning: COURSE_MODEL_THRESHOLDS.warning,
    stress_threshold_critical: COURSE_MODEL_THRESHOLDS.critical,
    allow_past_week_changes: false,
    config: COURSE_STRESS_MODEL_V1,
};

export interface ScenarioContext {
    course: CourseDefinition;
    observed_stress?: ObservedStressEntry[];
    /** Zero-based index of the week the course is currently in. */
    current_week_index?: number;
    /**
     * A schedule handed over by the main application. When present it becomes
     * the baseline, and our own rebuild is used only to check agreement (D4).
     */
    supplied_schedule?: WeekScheduleV1[] | null;
    /**
     * D4 — diff a supplied schedule against our own rebuild and warn on any
     * week that disagrees. Defaults to true. Up-converted legacy payloads set
     * it false: they have no assignment hours, no exams and a synthetic
     * homework total, so every week would "disagree" by construction and the
     * noise would bury the warnings that matter.
     */
    verify_supplied_schedule?: boolean;
    options?: Partial<SimulationOptions>;
}

export interface ScenarioMeta {
    scenario_id: string;
    /** Injected rather than read from the clock, so results stay reproducible. */
    created_at: string;
    name?: string;
    description?: string;
    origin?: "generated" | "user";
}

export interface ScenarioWarning {
    code: string;
    message: string;
    subject?: string;
}

// ---------------------------------------------------------------------------
// Output (§11)
// ---------------------------------------------------------------------------

export interface AppliedExtensionRecord extends AssignmentExtension {
    assignment_id: string;
    original_end_week: number;
}

export interface ScenarioResult {
    scenario_id: string;
    created_at: string;
    name: string | null;
    description: string | null;
    origin: "generated" | "user";

    stress_model: StressModelConfig;
    stress_model_version: string;
    redistribution_objective: RedistributionObjective;
    known_limitations: string[];

    current_week_index: number;
    current_week_number: number;

    baseline: {
        week_schedules: WeekScheduleV1[];
        trajectory: TrajectoryWeekResult[];
        summary: TrajectorySummary;
    };
    simulation: {
        week_schedules: WeekScheduleV1[];
        trajectory: TrajectoryWeekResult[];
        summary: TrajectorySummary;
        assignments: CourseAssignment[];
        exams: CourseExam[];
    };

    adjustments: AdjustmentRequest[];
    adjustment_outcomes: AdjustmentOutcome[];
    applied_adjustment_ids: string[];
    partially_applied_adjustment_ids: string[];
    rejected_adjustment_ids: string[];

    redistribution_flows: RedistributionFlow[];
    extensions_applied: AppliedExtensionRecord[];

    objective: ObjectiveMetrics;
    warnings: ScenarioWarning[];
    weekly_results: WeeklyResult[];
}

// ---------------------------------------------------------------------------
// Observed stress (§12.8)
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/**
 * Attach observations to weeks by date containment, then by week_index, then
 * by week_number. Anything that matches nothing becomes a warning rather than
 * being quietly dropped.
 */
export function attachObservedStress(
    weeks: WeekScheduleV1[],
    entries: ObservedStressEntry[] | undefined
): ScenarioWarning[] {
    const warnings: ScenarioWarning[] = [];
    for (const week of weeks) week.actual_stress = null;
    if (!entries || entries.length === 0) return warnings;

    entries.forEach((entry, i) => {
        const where = `observed_stress[${i}]`;
        let target: WeekScheduleV1 | undefined;

        if (entry.week_start) {
            const observedAt = parseDate(entry.week_start);
            if (!observedAt) {
                warnings.push({
                    code: "observed_stress_invalid_date",
                    message: `${where}: week_start "${entry.week_start}" is not a valid date.`,
                });
                return;
            }
            target = weeks.find((w) => {
                const start = parseDate(w.week_start);
                if (!start) return false;
                const end = start.getTime() + 7 * MS_PER_DAY;
                return (
                    observedAt.getTime() >= start.getTime() &&
                    observedAt.getTime() < end
                );
            });
        } else if (typeof entry.week_index === "number") {
            target = weeks.find((w) => w.week_index === entry.week_index);
        } else if (typeof entry.week_number === "number") {
            target = weeks.find((w) => w.week_number === entry.week_number);
        } else {
            warnings.push({
                code: "observed_stress_unkeyed",
                message: `${where}: needs one of week_start, week_index or week_number. Positional matching is not supported.`,
            });
            return;
        }

        if (!target) {
            warnings.push({
                code: "observed_stress_unmatched",
                message: `${where}: no week in the semester matches this observation; it was ignored.`,
            });
            return;
        }
        if (target.actual_stress !== null) {
            warnings.push({
                code: "observed_stress_duplicate",
                message: `${where}: week ${target.week_number} already has an observation; the later value was ignored.`,
            });
            return;
        }
        target.actual_stress = entry.value;
    });

    return warnings;
}

// ---------------------------------------------------------------------------
// Domain adjustments (§6.2, §6.3)
// ---------------------------------------------------------------------------

interface DomainApplyContext {
    course: CourseDefinition;
    semesterStart: Date;
    weekCount: number;
    options: SimulationOptions;
    meta: ScenarioMeta;
    extensions: AppliedExtensionRecord[];
    changedSubjects: Set<string>;
}

function outcome(
    adjustment: AdjustmentRequest,
    status: AdjustmentOutcome["status"],
    code: string,
    message: string,
    details?: Record<string, unknown>
): AdjustmentOutcome {
    return {
        adjustment_id: adjustment.id,
        type: adjustment.type,
        status,
        code,
        message,
        reason: adjustment.reason,
        details,
    };
}

/** §8 — dates must stay inside the semester. */
function dateInSemester(date: Date, ctx: DomainApplyContext): boolean {
    const raw = rawWeekIndexForDate(date, ctx.semesterStart);
    return raw >= 0 && raw <= ctx.weekCount - 1;
}

function applyDomainAdjustment(
    adjustment: AdjustmentRequest,
    ctx: DomainApplyContext
): AdjustmentOutcome {
    const findAssignment = (id: string) =>
        ctx.course.assignments.find((a) => a.assignment_id === id);
    const findExam = (id: string) => ctx.course.exams.find((e) => e.exam_id === id);

    switch (adjustment.type) {
        case "move_assignment":
        case "update_assignment":
        case "extend_assignment": {
            const assignment = findAssignment(adjustment.assignment_id);
            if (!assignment) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.ASSIGNMENT_NOT_FOUND,
                    `Assignment "${adjustment.assignment_id}" does not exist in this course.`
                );
            }

            if (adjustment.type === "extend_assignment") {
                const currentEnd = parseDate(assignment.end_date);
                const newEnd = parseDate(adjustment.new_end_date);
                if (!newEnd) {
                    return outcome(
                        adjustment,
                        "rejected",
                        OUTCOME_CODES.INVALID_DATE,
                        `new_end_date "${adjustment.new_end_date}" is not a valid date.`
                    );
                }
                if (!dateInSemester(newEnd, ctx)) {
                    return outcome(
                        adjustment,
                        "rejected",
                        OUTCOME_CODES.DATE_OUTSIDE_SEMESTER,
                        `new_end_date "${adjustment.new_end_date}" falls outside the semester.`
                    );
                }
                if (currentEnd && newEnd.getTime() <= currentEnd.getTime()) {
                    return outcome(
                        adjustment,
                        "rejected",
                        OUTCOME_CODES.EXTENSION_NOT_LATER,
                        `new_end_date "${adjustment.new_end_date}" is not later than the current deadline "${assignment.end_date}".`
                    );
                }
                if (
                    assignment.extensions.length >=
                    ctx.options.max_extensions_per_assignment
                ) {
                    return outcome(
                        adjustment,
                        "rejected",
                        OUTCOME_CODES.EXTENSION_LIMIT,
                        `Assignment "${assignment.assignment_id}" already has ${assignment.extensions.length} extension(s); the policy allows ${ctx.options.max_extensions_per_assignment}.`
                    );
                }

                const originalEndWeek = currentEnd
                    ? weekIndexForDate(currentEnd, ctx.semesterStart, ctx.weekCount)
                    : 0;
                const newEndWeek = weekIndexForDate(
                    newEnd,
                    ctx.semesterStart,
                    ctx.weekCount
                );
                const record: AppliedExtensionRecord = {
                    assignment_id: assignment.assignment_id,
                    extension_id: `${adjustment.id}:${assignment.assignment_id}`,
                    original_end_week: originalEndWeek + 1,
                    new_end_week: newEndWeek + 1,
                    reason: adjustment.reason ?? "",
                    weeks_extended: newEndWeek - originalEndWeek,
                    scenario_id: ctx.meta.scenario_id,
                    created_at: ctx.meta.created_at,
                };

                assignment.end_date = adjustment.new_end_date;
                assignment.extensions.push({
                    extension_id: record.extension_id,
                    new_end_week: record.new_end_week,
                    reason: record.reason,
                    weeks_extended: record.weeks_extended,
                    scenario_id: record.scenario_id,
                    created_at: record.created_at,
                });
                ctx.extensions.push(record);
                ctx.changedSubjects.add(`assignment:${assignment.assignment_id}`);

                return outcome(
                    adjustment,
                    "applied",
                    OUTCOME_CODES.OK,
                    `Assignment "${assignment.assignment_id}" extended by ${record.weeks_extended} week(s) to week ${record.new_end_week}.`,
                    { extension: record }
                );
            }

            // move_assignment / update_assignment share validation.
            const nextStartRaw =
                adjustment.type === "move_assignment"
                    ? adjustment.new_start_date
                    : adjustment.new_start_date ?? assignment.start_date;
            const nextEndRaw =
                adjustment.type === "move_assignment"
                    ? adjustment.new_end_date
                    : adjustment.new_end_date ?? assignment.end_date;
            const nextHours =
                adjustment.type === "update_assignment" &&
                adjustment.new_estimated_hours !== undefined
                    ? adjustment.new_estimated_hours
                    : assignment.estimated_hours;

            const nextStart = parseDate(nextStartRaw);
            const nextEnd = parseDate(nextEndRaw);
            if (!nextStart || !nextEnd) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.INVALID_DATE,
                    `Assignment dates "${nextStartRaw}" / "${nextEndRaw}" could not be parsed.`
                );
            }
            if (nextStart.getTime() > nextEnd.getTime()) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.START_AFTER_END,
                    `Assignment start "${nextStartRaw}" is after its end "${nextEndRaw}".`
                );
            }
            if (!dateInSemester(nextStart, ctx) || !dateInSemester(nextEnd, ctx)) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.DATE_OUTSIDE_SEMESTER,
                    `Assignment span "${nextStartRaw}" - "${nextEndRaw}" falls outside the semester.`
                );
            }
            if (nextHours < 0) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.NEGATIVE_HOURS,
                    `new_estimated_hours ${nextHours} is negative.`
                );
            }

            const unchanged =
                nextStartRaw === assignment.start_date &&
                nextEndRaw === assignment.end_date &&
                Math.abs(nextHours - assignment.estimated_hours) < EPSILON;
            if (unchanged) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.NOTHING_TO_CHANGE,
                    `Assignment "${assignment.assignment_id}" already has these values.`
                );
            }

            const before = {
                start_date: assignment.start_date,
                end_date: assignment.end_date,
                estimated_hours: assignment.estimated_hours,
            };
            assignment.start_date = nextStartRaw;
            assignment.end_date = nextEndRaw;
            assignment.estimated_hours = nextHours;
            ctx.changedSubjects.add(`assignment:${assignment.assignment_id}`);

            return outcome(
                adjustment,
                "applied",
                OUTCOME_CODES.OK,
                `Assignment "${assignment.assignment_id}" updated; its hours were redistributed over the new span.`,
                { before, after: { ...before, ...{ start_date: nextStartRaw, end_date: nextEndRaw, estimated_hours: nextHours } } }
            );
        }

        case "move_exam": {
            const exam = findExam(adjustment.exam_id);
            if (!exam) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.EXAM_NOT_FOUND,
                    `Exam "${adjustment.exam_id}" does not exist in this course.`
                );
            }
            const nextDate = parseDate(adjustment.new_date);
            if (!nextDate) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.INVALID_DATE,
                    `new_date "${adjustment.new_date}" is not a valid date.`
                );
            }
            if (!dateInSemester(nextDate, ctx)) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.DATE_OUTSIDE_SEMESTER,
                    `new_date "${adjustment.new_date}" falls outside the semester.`
                );
            }
            if (adjustment.new_date === exam.date_time) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.NOTHING_TO_CHANGE,
                    `Exam "${exam.exam_id}" is already scheduled at "${exam.date_time}".`
                );
            }

            const from = exam.date_time;
            exam.date_time = adjustment.new_date;
            ctx.changedSubjects.add(`exam:${exam.exam_id}`);

            return outcome(
                adjustment,
                "applied",
                OUTCOME_CODES.OK,
                `Exam "${exam.exam_id}" moved from "${from}" to "${adjustment.new_date}"; exam-week, pre-exam and post-exam effects were rebuilt.`,
                { from, to: adjustment.new_date }
            );
        }

        case "cancel_exam": {
            const index = ctx.course.exams.findIndex(
                (e) => e.exam_id === adjustment.exam_id
            );
            if (index === -1) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.EXAM_NOT_FOUND,
                    `Exam "${adjustment.exam_id}" does not exist in this course.`
                );
            }
            const [removed] = ctx.course.exams.splice(index, 1);
            ctx.changedSubjects.add(`exam:${removed.exam_id}`);
            return outcome(
                adjustment,
                "applied",
                OUTCOME_CODES.OK,
                `Exam "${removed.exam_id}" cancelled; all of its weekly effects were removed by the rebuild.`,
                { removed }
            );
        }

        default:
            return outcome(
                adjustment,
                "rejected",
                OUTCOME_CODES.UNKNOWN_TYPE,
                `"${(adjustment as AdjustmentRequest).type}" is not a domain adjustment.`
            );
    }
}

// ---------------------------------------------------------------------------
// Week-level adjustments (§6.1)
// ---------------------------------------------------------------------------

interface WeekApplyContext {
    weeks: WeekScheduleV1[];
    options: SimulationOptions;
    currentWeekIndex: number;
    flows: RedistributionFlow[];
}

function weekGuard(
    adjustment: AdjustmentRequest,
    index: number,
    ctx: WeekApplyContext,
    label: string
): AdjustmentOutcome | null {
    if (index < 0 || index >= ctx.weeks.length) {
        return outcome(
            adjustment,
            "rejected",
            OUTCOME_CODES.WEEK_OUT_OF_RANGE,
            `${label} ${index} is outside the semester (0-${ctx.weeks.length - 1}).`
        );
    }
    if (!ctx.options.allow_past_week_changes && index < ctx.currentWeekIndex) {
        return outcome(
            adjustment,
            "rejected",
            OUTCOME_CODES.WEEK_IN_PAST,
            `${label} ${index} (week ${index + 1}) has already passed; the current week is ${ctx.currentWeekIndex + 1}.`
        );
    }
    return null;
}

function applyWeekAdjustment(
    adjustment: AdjustmentRequest,
    ctx: WeekApplyContext
): AdjustmentOutcome {
    switch (adjustment.type) {
        case "cancel_lecture":
        case "cancel_lab": {
            const field =
                adjustment.type === "cancel_lecture" ? "lecture_hours" : "lab_hours";
            const label = adjustment.type === "cancel_lecture" ? "lecture" : "lab";
            const guard = weekGuard(
                adjustment,
                adjustment.source_week_index,
                ctx,
                "source_week_index"
            );
            if (guard) return guard;

            const week = ctx.weeks[adjustment.source_week_index];
            const removed = week[field];
            if (removed <= EPSILON) {
                return outcome(
                    adjustment,
                    "rejected",
                    adjustment.type === "cancel_lecture"
                        ? OUTCOME_CODES.NO_LECTURE_HOURS
                        : OUTCOME_CODES.NO_LAB_HOURS,
                    `Week ${week.week_number} has no ${label} hours to cancel.`
                );
            }

            week[field] = 0;
            week.adjusted = true;
            week.adjustment_details.push(
                `cancelled ${removed.toFixed(2)}h ${label}`
            );

            const result = redistributeCancelledHours(
                ctx.weeks,
                adjustment.source_week_index,
                removed,
                field,
                {
                    objective: ctx.options.redistribution_objective,
                    config: ctx.options.config,
                    earliestTargetIndex: ctx.options.allow_past_week_changes
                        ? 0
                        : ctx.currentWeekIndex,
                }
            );
            ctx.flows.push(...result.flows);

            if (result.remaining_hours > EPSILON) {
                return outcome(
                    adjustment,
                    "partially_applied",
                    OUTCOME_CODES.PARTIAL_REDISTRIBUTION,
                    `Cancelled ${removed.toFixed(2)}h ${label} in week ${week.week_number}, but ${result.remaining_hours.toFixed(2)}h could not be placed: no valid later week remained.`,
                    { removed, placed: removed - result.remaining_hours, remaining: result.remaining_hours }
                );
            }
            return outcome(
                adjustment,
                "applied",
                OUTCOME_CODES.OK,
                `Cancelled ${removed.toFixed(2)}h ${label} in week ${week.week_number} and redistributed it across ${result.flows.length} later week placement(s).`,
                { removed, flows: result.flows.length }
            );
        }

        case "reduce_homework": {
            const guard = weekGuard(
                adjustment,
                adjustment.source_week_index,
                ctx,
                "source_week_index"
            );
            if (guard) return guard;

            const week = ctx.weeks[adjustment.source_week_index];
            const available = week.homework_hours;
            if (available <= EPSILON) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.INSUFFICIENT_HOMEWORK,
                    `Week ${week.week_number} has no homework hours to reduce.`
                );
            }

            const applied = Math.min(adjustment.hours, available);
            week.homework_hours = Math.max(0, available - applied);
            week.adjusted = true;
            week.adjustment_details.push(
                `reduced homework by ${applied.toFixed(2)}h`
            );

            if (applied < adjustment.hours - EPSILON) {
                return outcome(
                    adjustment,
                    "partially_applied",
                    OUTCOME_CODES.INSUFFICIENT_HOMEWORK,
                    `Week ${week.week_number} only had ${available.toFixed(2)}h of homework; reduced by that instead of the requested ${adjustment.hours}h.`,
                    { requested: adjustment.hours, applied }
                );
            }
            return outcome(
                adjustment,
                "applied",
                OUTCOME_CODES.OK,
                `Reduced week ${week.week_number} homework by ${applied.toFixed(2)}h.`,
                { applied }
            );
        }

        case "move_homework": {
            const sourceGuard = weekGuard(
                adjustment,
                adjustment.source_week_index,
                ctx,
                "source_week_index"
            );
            if (sourceGuard) return sourceGuard;
            const targetGuard = weekGuard(
                adjustment,
                adjustment.target_week_index,
                ctx,
                "target_week_index"
            );
            if (targetGuard) return targetGuard;

            if (adjustment.source_week_index === adjustment.target_week_index) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.SAME_WEEK,
                    `source_week_index and target_week_index are both ${adjustment.source_week_index}.`
                );
            }

            const source = ctx.weeks[adjustment.source_week_index];
            const target = ctx.weeks[adjustment.target_week_index];
            const available = source.homework_hours;
            if (available <= EPSILON) {
                return outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.INSUFFICIENT_HOMEWORK,
                    `Week ${source.week_number} has no homework hours to move.`
                );
            }

            const moved = Math.min(adjustment.hours, available);
            source.homework_hours = Math.max(0, available - moved);
            target.homework_hours += moved;
            source.adjusted = true;
            target.adjusted = true;
            source.adjustment_details.push(
                `moved ${moved.toFixed(2)}h homework to week ${target.week_number}`
            );
            target.adjustment_details.push(
                `received ${moved.toFixed(2)}h homework from week ${source.week_number}`
            );

            if (moved < adjustment.hours - EPSILON) {
                return outcome(
                    adjustment,
                    "partially_applied",
                    OUTCOME_CODES.INSUFFICIENT_HOMEWORK,
                    `Week ${source.week_number} only had ${available.toFixed(2)}h of homework; moved that to week ${target.week_number} instead of the requested ${adjustment.hours}h.`,
                    { requested: adjustment.hours, moved }
                );
            }
            return outcome(
                adjustment,
                "applied",
                OUTCOME_CODES.OK,
                `Moved ${moved.toFixed(2)}h homework from week ${source.week_number} to week ${target.week_number}.`,
                { moved }
            );
        }

        default:
            return outcome(
                adjustment,
                "rejected",
                OUTCOME_CODES.UNKNOWN_TYPE,
                `"${(adjustment as AdjustmentRequest).type}" is not a week-level adjustment.`
            );
    }
}

// ---------------------------------------------------------------------------
// Baseline construction
// ---------------------------------------------------------------------------

function toWarnings(list: ScheduleBuildWarning[]): ScenarioWarning[] {
    return list.map((w) => ({ code: w.code, message: w.message, subject: w.subject }));
}

const WORKLOAD_FIELDS = [
    "lecture_hours",
    "lab_hours",
    "homework_hours",
    "assignment_hours",
    "exam_hours",
] as const;

/**
 * D4 — when the caller supplies a schedule *and* the domain objects that
 * should produce it, build our own and report any week that disagrees beyond
 * the §13 tolerance. This is the parity check applied to live traffic.
 */
const MAX_MISMATCH_WARNINGS = 10;

function diffSuppliedSchedule(
    supplied: WeekScheduleV1[],
    built: WeekScheduleV1[]
): ScenarioWarning[] {
    const warnings: ScenarioWarning[] = [];

    if (supplied.length !== built.length) {
        warnings.push({
            code: "schedule_rebuild_mismatch",
            message: `Supplied schedule has ${supplied.length} week(s) but rebuilding the course from its assignments and exams produces ${built.length}.`,
        });
    }

    const n = Math.min(supplied.length, built.length);
    let mismatched = 0;

    for (let i = 0; i < n; i++) {
        const differing = WORKLOAD_FIELDS.filter(
            (f) => Math.abs(supplied[i][f] - built[i][f]) > PARITY_TOLERANCE
        );
        if (differing.length === 0) continue;
        mismatched += 1;
        if (mismatched > MAX_MISMATCH_WARNINGS) continue;

        warnings.push({
            code: "schedule_rebuild_mismatch",
            subject: `week_index:${i}`,
            message: `Week ${i + 1} differs from our rebuild in ${differing
                .map(
                    (f) =>
                        `${f} (supplied ${supplied[i][f]}, rebuilt ${built[i][f]})`
                )
                .join(", ")}.`,
        });
    }

    if (mismatched > MAX_MISMATCH_WARNINGS) {
        warnings.push({
            code: "schedule_rebuild_mismatch_truncated",
            message: `${mismatched} of ${n} weeks disagree with our rebuild; the first ${MAX_MISMATCH_WARNINGS} are listed above. A disagreement this widespread usually means the two systems are building schedules differently rather than one week being off.`,
        });
    }

    return warnings;
}

/** Fill in anything the caller left off a supplied week. */
export function normalizeSuppliedSchedule(
    supplied: WeekScheduleV1[],
    reference: WeekScheduleV1[]
): WeekScheduleV1[] {
    return supplied.map((week, i) => ({
        week_index: week.week_index ?? i,
        week_number: week.week_number ?? i + 1,
        week_start: week.week_start ?? reference[i]?.week_start ?? "",
        week_end: week.week_end ?? reference[i]?.week_end ?? "",
        adjusted: false,
        lecture_hours: week.lecture_hours ?? 0,
        lab_hours: week.lab_hours ?? 0,
        homework_hours: week.homework_hours ?? 0,
        assignment_hours: week.assignment_hours ?? 0,
        exam_hours: week.exam_hours ?? 0,
        actual_stress: week.actual_stress ?? null,
        adjustment_details: [],
    }));
}

function courseHasDomainData(course: CourseDefinition): boolean {
    return (
        (course.assignments?.length ?? 0) > 0 ||
        (course.exams?.length ?? 0) > 0 ||
        (course.total_homework_hours ?? 0) > 0 ||
        (course.course_sessions?.length ?? 0) > 0 ||
        (course.lab_sessions?.length ?? 0) > 0
    );
}

// ---------------------------------------------------------------------------
// The pipeline
// ---------------------------------------------------------------------------

export function simulateScenario(
    context: ScenarioContext,
    adjustments: AdjustmentRequest[],
    meta: ScenarioMeta
): ScenarioResult {
    const options: SimulationOptions = {
        ...DEFAULT_SIMULATION_OPTIONS,
        ...(context.options ?? {}),
        config: context.options?.config ?? DEFAULT_SIMULATION_OPTIONS.config,
    };
    const warnings: ScenarioWarning[] = [];
    const outcomes: AdjustmentOutcome[] = [];

    // A threshold above the schedule-only ceiling can never fire on this
    // model's output. That usually means the caller passed total-stress
    // values (75/85), which the model owners have said belong to a broader
    // baseline-plus-course scale — say so instead of reporting empty warning
    // lists that look like a healthy course. decisions.md §1.
    if (options.stress_threshold_warning > SCHEDULE_ONLY_STRESS_CEILING) {
        warnings.push({
            code: "thresholds_exceed_model_range",
            message: `stress_threshold_warning ${options.stress_threshold_warning} is above the schedule-only ceiling of ${SCHEDULE_ONLY_STRESS_CEILING.toFixed(2)}, so no week can ever be flagged. These values belong to the total-stress scale (personal baseline + course); the course-model equivalents are ${COURSE_MODEL_THRESHOLDS.warning}/${COURSE_MODEL_THRESHOLDS.critical}.`,
        });
    }

    const currentWeekIndex = Math.max(0, context.current_week_index ?? 0);

    // --- Step 1: clone -------------------------------------------------
    const originalCourse = clone(context.course);
    const workingCourse = clone(context.course);
    for (const a of workingCourse.assignments ?? []) {
        if (!Array.isArray(a.extensions)) a.extensions = [];
    }

    // --- Baseline ------------------------------------------------------
    const built = buildWeekSchedules(originalCourse);
    warnings.push(...toWarnings(built.warnings));

    let baselineWeeks: WeekScheduleV1[];
    if (context.supplied_schedule && context.supplied_schedule.length > 0) {
        baselineWeeks = normalizeSuppliedSchedule(
            context.supplied_schedule,
            built.weeks
        );
        if (
            context.verify_supplied_schedule !== false &&
            courseHasDomainData(originalCourse)
        ) {
            warnings.push(...diffSuppliedSchedule(baselineWeeks, built.weeks));
        }
    } else {
        baselineWeeks = built.weeks;
    }

    warnings.push(...attachObservedStress(baselineWeeks, context.observed_stress));

    // --- Validate and split the adjustment list ------------------------
    const seenIds = new Set<string>();
    const domainAdjustments: AdjustmentRequest[] = [];
    const weekAdjustments: AdjustmentRequest[] = [];

    for (const raw of adjustments ?? []) {
        const shape = validateAdjustmentShape(raw);
        if (!shape.valid) {
            outcomes.push({
                adjustment_id:
                    typeof (raw as AdjustmentRequest)?.id === "string"
                        ? (raw as AdjustmentRequest).id
                        : "(missing id)",
                type: ((raw as AdjustmentRequest)?.type ?? "unknown") as never,
                status: "rejected",
                code: OUTCOME_CODES.MALFORMED,
                message: shape.errors.join("; "),
            });
            continue;
        }
        const adjustment = raw as AdjustmentRequest;
        if (seenIds.has(adjustment.id)) {
            outcomes.push(
                outcome(
                    adjustment,
                    "rejected",
                    OUTCOME_CODES.DUPLICATE_ID,
                    `Adjustment id "${adjustment.id}" appears more than once; only the first occurrence was applied.`
                )
            );
            continue;
        }
        seenIds.add(adjustment.id);
        (isDomainAdjustment(adjustment) ? domainAdjustments : weekAdjustments).push(
            adjustment
        );
    }

    // --- Step 2: domain changes ----------------------------------------
    const semesterStart = parseDate(workingCourse.start_date);
    const weekCount = semesterWeekCount(
        workingCourse.start_date,
        workingCourse.end_date
    );
    const extensions: AppliedExtensionRecord[] = [];
    const changedSubjects = new Set<string>();

    if (domainAdjustments.length > 0) {
        if (!semesterStart) {
            for (const adjustment of domainAdjustments) {
                outcomes.push(
                    outcome(
                        adjustment,
                        "rejected",
                        OUTCOME_CODES.INVALID_DATE,
                        `The course has no usable start_date, so assignment and exam changes cannot be positioned.`
                    )
                );
            }
        } else if (!Array.isArray(workingCourse.assignments) || !Array.isArray(workingCourse.exams)) {
            for (const adjustment of domainAdjustments) {
                outcomes.push(
                    outcome(
                        adjustment,
                        "rejected",
                        OUTCOME_CODES.DOMAIN_UNAVAILABLE,
                        `This simulation has no assignment/exam objects, so domain-level adjustments cannot be applied.`
                    )
                );
            }
        } else {
            const domainCtx: DomainApplyContext = {
                course: workingCourse,
                semesterStart,
                weekCount,
                options,
                meta,
                extensions,
                changedSubjects,
            };
            for (const adjustment of domainAdjustments) {
                outcomes.push(applyDomainAdjustment(adjustment, domainCtx));
            }

            // A zero-hour assignment contributes nothing to A_w, so moving or
            // extending it changes no number. That is almost always an
            // up-converted legacy case (§12.1) rather than an intentional
            // zero, so say so instead of reporting a successful no-op.
            for (const assignment of workingCourse.assignments) {
                if (
                    changedSubjects.has(`assignment:${assignment.assignment_id}`) &&
                    assignment.estimated_hours <= 0
                ) {
                    warnings.push({
                        code: "assignment_has_no_hours",
                        subject: assignment.assignment_id,
                        message: `Assignment "${assignment.assignment_id}" was changed, but its estimated_hours is 0, so it contributes no assignment pressure and the change has no effect on predicted stress.`,
                    });
                }
            }
        }
    }

    // --- Step 3: rebuild if the domain changed -------------------------
    let simulatedWeeks: WeekScheduleV1[];
    const domainChanged = changedSubjects.size > 0;

    if (domainChanged) {
        const rebuilt = buildWeekSchedules(workingCourse);
        warnings.push(...toWarnings(rebuilt.warnings));
        simulatedWeeks = rebuilt.weeks;

        // A rebuild reconstructs lectures/labs/homework from the course
        // definition, which would discard week-level edits the *baseline*
        // carried. Preserve any lecture/lab/homework difference the supplied
        // baseline had relative to our own build of the original course.
        if (context.supplied_schedule && context.supplied_schedule.length > 0) {
            for (let i = 0; i < simulatedWeeks.length; i++) {
                const suppliedWeek = baselineWeeks[i];
                const originalBuild = built.weeks[i];
                if (!suppliedWeek || !originalBuild) continue;
                simulatedWeeks[i].lecture_hours +=
                    suppliedWeek.lecture_hours - originalBuild.lecture_hours;
                simulatedWeeks[i].lab_hours +=
                    suppliedWeek.lab_hours - originalBuild.lab_hours;
                simulatedWeeks[i].homework_hours +=
                    suppliedWeek.homework_hours - originalBuild.homework_hours;
                for (const f of WORKLOAD_FIELDS) {
                    if (simulatedWeeks[i][f] < 0) simulatedWeeks[i][f] = 0;
                }
            }
        }
        warnings.push(...attachObservedStress(simulatedWeeks, context.observed_stress));
    } else {
        simulatedWeeks = clone(baselineWeeks);
    }

    // --- Step 4: week-level changes ------------------------------------
    const flows: RedistributionFlow[] = [];
    if (weekAdjustments.length > 0) {
        const weekCtx: WeekApplyContext = {
            weeks: simulatedWeeks,
            options,
            currentWeekIndex,
            flows,
        };
        for (const adjustment of weekAdjustments) {
            outcomes.push(applyWeekAdjustment(adjustment, weekCtx));
        }
    }

    // Mark every week whose workload actually moved, including weeks changed
    // only by a rebuild (a moved exam changes three weeks, none of which were
    // named in an adjustment).
    for (let i = 0; i < simulatedWeeks.length; i++) {
        const before = baselineWeeks[i];
        if (!before) {
            simulatedWeeks[i].adjusted = true;
            continue;
        }
        const changed = WORKLOAD_FIELDS.some(
            (f) => Math.abs(simulatedWeeks[i][f] - before[f]) > PARITY_TOLERANCE
        );
        if (changed) simulatedWeeks[i].adjusted = true;
    }

    // --- Step 5: sequential recalculation ------------------------------
    const baselineTrajectory = predictTrajectory(baselineWeeks, {
        config: options.config,
    });
    const simulatedTrajectory = predictTrajectory(simulatedWeeks, {
        config: options.config,
    });

    // --- Step 6: comparison and audit ----------------------------------
    const thresholds = {
        warning: options.stress_threshold_warning,
        critical: options.stress_threshold_critical,
    };
    const baselineSummary = summarizeTrajectory(baselineTrajectory, thresholds);
    const simulationSummary = summarizeTrajectory(simulatedTrajectory, thresholds);

    const knownLimitations: string[] = [];
    if (options.redistribution_objective === "local_week") {
        knownLimitations.push(
            "Redistribution used the local weekly impact rule (§7). Candidate weeks were scored in isolation, so the fatigue carry-over that added hours cause in *later* weeks was not considered. Set redistribution_objective to \"trajectory_peak\" for the full-trajectory objective."
        );
    }

    const applied = outcomes.filter((o) => o.status === "applied");
    const partial = outcomes.filter((o) => o.status === "partially_applied");
    const rejected = outcomes.filter((o) => o.status === "rejected");

    return {
        scenario_id: meta.scenario_id,
        created_at: meta.created_at,
        name: meta.name ?? null,
        description: meta.description ?? null,
        origin: meta.origin ?? "user",

        stress_model: options.config,
        stress_model_version: options.config.version,
        redistribution_objective: options.redistribution_objective,
        known_limitations: knownLimitations,

        current_week_index: currentWeekIndex,
        current_week_number: currentWeekIndex + 1,

        baseline: {
            week_schedules: baselineWeeks,
            trajectory: baselineTrajectory,
            summary: baselineSummary,
        },
        simulation: {
            week_schedules: simulatedWeeks,
            trajectory: simulatedTrajectory,
            summary: simulationSummary,
            assignments: workingCourse.assignments ?? [],
            exams: workingCourse.exams ?? [],
        },

        adjustments: adjustments ?? [],
        adjustment_outcomes: outcomes,
        applied_adjustment_ids: applied.map((o) => o.adjustment_id),
        partially_applied_adjustment_ids: partial.map((o) => o.adjustment_id),
        rejected_adjustment_ids: rejected.map((o) => o.adjustment_id),

        redistribution_flows: flows,
        extensions_applied: extensions,

        objective: buildObjectiveMetrics(
            baselineSummary,
            simulationSummary,
            baselineWeeks,
            simulatedWeeks,
            changedSubjects.size
        ),
        warnings,
        weekly_results: buildWeeklyResults(
            baselineWeeks,
            baselineTrajectory,
            simulatedWeeks,
            simulatedTrajectory
        ),
    };
}
