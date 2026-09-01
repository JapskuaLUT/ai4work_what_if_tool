// backend/src/services/education/legacyBridge.ts
//
// §6 backwards compatibility. Callers still sending the pre-v1.0 payload
// (`course_info` + week-numbered `assignment_weeks` + `week_schedules` whose
// `homework_hours` silently bundles assignment work) are up-converted here.
//
// The conversion is deliberately conservative: it never invents assignment or
// exam hours it cannot know about. It returns warnings saying exactly what was
// lost, so a caller can see why their numbers differ from a v1 payload.

import type {
    CourseAnalysisInput,
    EducationSimulationV1Input,
} from "../../types/educationalStress";
import {
    semesterWeekCount,
    type CourseDefinition,
    type WeekScheduleV1,
} from "../stressModel";
import type { ObservedStressEntry, ScenarioWarning, SimulationOptions } from "./simulate";
import { DEFAULT_SIMULATION_OPTIONS } from "./simulate";

const MS_PER_DAY = 86_400_000;

/**
 * Legacy payloads have no dates at all, only week numbers. We anchor the
 * semester on the payload's own `metadata.created_at` when it is usable, and
 * on a fixed Monday otherwise, so the same input always yields the same dates.
 */
const FALLBACK_SEMESTER_START = "2026-01-05T00:00:00.000Z";

function anchorDate(input: CourseAnalysisInput): Date {
    const created = input?.metadata?.created_at
        ? new Date(input.metadata.created_at)
        : null;
    if (created && !Number.isNaN(created.getTime())) {
        return new Date(
            Date.UTC(
                created.getUTCFullYear(),
                created.getUTCMonth(),
                created.getUTCDate()
            )
        );
    }
    return new Date(FALLBACK_SEMESTER_START);
}

/** The normalised shape both payload versions collapse into. */
export interface NormalizedSimulationInput {
    name: string;
    description: string;
    course: CourseDefinition;
    supplied_schedule: WeekScheduleV1[] | null;
    observed_stress: ObservedStressEntry[];
    current_week_index: number;
    options: SimulationOptions;
    warnings: ScenarioWarning[];
    /** Echoed back and persisted so the UI can label the case. */
    students: { count: number } | null;
    metadata: Record<string, unknown> | null;
    is_legacy_payload: boolean;
    /** See ScenarioContext.verify_supplied_schedule. */
    verify_supplied_schedule: boolean;
}

function optionsFrom(
    request:
        | CourseAnalysisInput["optimization_request"]
        | EducationSimulationV1Input["optimization_request"]
        | undefined
): SimulationOptions {
    const r = (request ?? {}) as Record<string, unknown>;
    return {
        ...DEFAULT_SIMULATION_OPTIONS,
        stress_threshold_warning:
            typeof r.stress_threshold_warning === "number"
                ? r.stress_threshold_warning
                : DEFAULT_SIMULATION_OPTIONS.stress_threshold_warning,
        stress_threshold_critical:
            typeof r.stress_threshold_critical === "number"
                ? r.stress_threshold_critical
                : DEFAULT_SIMULATION_OPTIONS.stress_threshold_critical,
        max_extensions_per_assignment:
            typeof r.max_extensions_per_assignment === "number"
                ? r.max_extensions_per_assignment
                : DEFAULT_SIMULATION_OPTIONS.max_extensions_per_assignment,
        redistribution_objective:
            r.redistribution_objective === "trajectory_peak"
                ? "trajectory_peak"
                : DEFAULT_SIMULATION_OPTIONS.redistribution_objective,
        allow_past_week_changes: r.allow_past_week_changes === true,
    };
}

/** True when a body is the pre-v1.0 shape. */
export function isLegacyPayload(body: unknown): boolean {
    if (!body || typeof body !== "object") return false;
    const b = body as Record<string, unknown>;
    return b.course === undefined && b.course_info !== undefined;
}

/**
 * Up-convert a pre-v1.0 payload.
 *
 * What is faithfully preserved: lecture, lab and homework hours per week
 * (taken from the supplied `week_schedules`), the semester length, the
 * difficulty, and the assignment spans.
 *
 * What cannot be recovered, and is warned about:
 *  - `assignment_hours` — the legacy export folded assignment work into
 *    `homework_hours` (§12.1) and the split is unrecoverable, so assignment
 *    hours are 0 and P^assign contributes nothing.
 *  - `exam_hours` — the legacy payload has no exam concept at all (§12.2).
 */
export function upconvertLegacyInput(
    input: CourseAnalysisInput
): NormalizedSimulationInput {
    const warnings: ScenarioWarning[] = [];
    const info = input.course_info;
    const start = anchorDate(input);
    const totalWeeks = Math.max(
        1,
        Math.round(info?.total_weeks ?? input.week_schedules?.length ?? 1)
    );
    const end = new Date(start.getTime() + totalWeeks * 7 * MS_PER_DAY);

    const weekStart = (weekNumber: number) =>
        new Date(start.getTime() + (weekNumber - 1) * 7 * MS_PER_DAY);

    const course: CourseDefinition = {
        course_name: info?.course_name ?? input.name,
        course_id: info?.course_id ?? "",
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        topic_difficulty: info?.topic_difficulty ?? 3,
        // The supplied week_schedules are authoritative for homework, so the
        // builder must not lay down a second, skewed distribution on top.
        total_homework_hours: 0,
        course_sessions: info?.course_sessions ?? [],
        lab_sessions: info?.lab_sessions ?? [],
        assignments: (input.assignment_weeks ?? []).map((a) => {
            const s = weekStart(a.start_week);
            const e = new Date(
                weekStart(a.end_week).getTime() + 6 * MS_PER_DAY
            );
            return {
                assignment_id: `assignment-${a.id}`,
                name: `Assignment ${a.id}`,
                start_date: s.toISOString(),
                end_date: e.toISOString(),
                // Unrecoverable from a legacy payload — see the warning below.
                estimated_hours: 0,
                extensions: [],
            };
        }),
        exams: [],
    };

    const supplied: WeekScheduleV1[] = (input.week_schedules ?? []).map((w, i) => {
        const index = (w.week_number ?? i + 1) - 1;
        const ws = weekStart(index + 1);
        return {
            week_index: index,
            week_number: index + 1,
            week_start: ws.toISOString(),
            week_end: new Date(ws.getTime() + 6 * MS_PER_DAY).toISOString(),
            adjusted: false,
            lecture_hours: w.teaching_hours ?? 0,
            lab_hours: w.lab_hours ?? 0,
            homework_hours: w.homework_hours ?? 0,
            assignment_hours: 0,
            exam_hours: 0,
            actual_stress: null,
            adjustment_details: [],
        };
    });

    warnings.push({
        code: "legacy_payload_upconverted",
        message:
            "This request used the pre-v1.0 payload. teaching_hours was mapped to lecture_hours and the schedule was carried over as supplied.",
    });
    warnings.push({
        code: "assignment_hours_unavailable",
        message:
            "The legacy export folds assignment work into homework_hours (spec §12.1), so assignment_hours could not be separated and is 0 for every week. P^assign therefore contributes nothing to these results. Send the v1 payload with `course.assignments[].estimated_hours` to get assignment pressure modelled.",
    });
    warnings.push({
        code: "exam_hours_unavailable",
        message:
            "The legacy payload carries no exams (spec §12.2), so exam_hours is 0 for every week and no exam adjustments are possible on this case.",
    });

    return {
        name: input.name,
        description: input.description ?? "",
        course,
        supplied_schedule: supplied.length > 0 ? supplied : null,
        observed_stress: [],
        current_week_index: Math.max(0, (input.current_status?.current_week ?? 1) - 1),
        options: optionsFrom(input.optimization_request),
        warnings,
        students: input.students ?? null,
        metadata: (input.metadata as unknown as Record<string, unknown>) ?? null,
        is_legacy_payload: true,
        // A legacy payload has no assignment hours, no exams and a synthetic
        // homework total, so our rebuild cannot match it and the diff would be
        // pure noise.
        verify_supplied_schedule: false,
    };
}

/** Normalise a v1 payload into the same shape, filling in optional fields. */
export function normalizeV1Input(
    input: EducationSimulationV1Input
): NormalizedSimulationInput {
    const warnings: ScenarioWarning[] = [];
    const course: CourseDefinition = {
        ...input.course,
        course_sessions: input.course.course_sessions ?? [],
        lab_sessions: input.course.lab_sessions ?? [],
        assignments: (input.course.assignments ?? []).map((a) => ({
            ...a,
            extensions: a.extensions ?? [],
        })),
        exams: input.course.exams ?? [],
    };

    const weekCount = semesterWeekCount(course.start_date, course.end_date);

    let currentWeekIndex = 0;
    if (typeof input.current_status?.current_week_index === "number") {
        currentWeekIndex = input.current_status.current_week_index;
    } else if (typeof input.current_status?.current_week_number === "number") {
        currentWeekIndex = input.current_status.current_week_number - 1;
    }
    if (currentWeekIndex < 0 || currentWeekIndex > weekCount - 1) {
        warnings.push({
            code: "current_week_out_of_range",
            message: `current week ${currentWeekIndex} is outside the ${weekCount}-week semester; it was clamped.`,
        });
        currentWeekIndex = Math.min(Math.max(0, currentWeekIndex), weekCount - 1);
    }

    return {
        name: input.name,
        description: input.description ?? "",
        course,
        supplied_schedule:
            input.week_schedules && input.week_schedules.length > 0
                ? input.week_schedules
                : null,
        observed_stress: input.observed_stress ?? [],
        current_week_index: currentWeekIndex,
        options: optionsFrom(input.optimization_request),
        warnings,
        students: input.students ?? null,
        metadata: (input.metadata as unknown as Record<string, unknown>) ?? null,
        is_legacy_payload: false,
        verify_supplied_schedule: true,
    };
}

/** Dispatch on payload shape. */
export function normalizeSimulationInput(
    body: CourseAnalysisInput | EducationSimulationV1Input
): NormalizedSimulationInput {
    return isLegacyPayload(body)
        ? upconvertLegacyInput(body as CourseAnalysisInput)
        : normalizeV1Input(body as EducationSimulationV1Input);
}
