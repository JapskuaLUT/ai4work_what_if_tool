// backend/src/services/stressModel/scheduleBuilder.ts
//
// §3 — turn a course definition (dates, recurring sessions, assignments,
// exams) into the weekly workload series the model consumes.
//
// This is the piece that makes assignment/exam adjustments possible at all:
// exam side effects and assignment distributions are *derived*, never stored,
// so moving or cancelling one and rebuilding removes its old effects
// completely (§3.5).

import { SCHEDULE_BUILD } from "./constants";
import { safe, skewWeights } from "./primitives";
import type { WeeklyLoad } from "./week";

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = MS_PER_DAY * SCHEDULE_BUILD.days_per_week;

/** A recurring lecture or lab slot. */
export interface CourseSession {
    day: string;
    start_time: string; // "HH:MM"
    end_time: string; // "HH:MM"
}

export interface AssignmentExtension {
    extension_id: string;
    new_end_week: number;
    reason: string;
    weeks_extended: number;
    scenario_id: string | null;
    created_at: string;
}

export interface CourseAssignment {
    assignment_id: string;
    name: string;
    start_date: string;
    end_date: string;
    estimated_hours: number;
    extensions: AssignmentExtension[];
}

export interface CourseExam {
    exam_id: string;
    name: string;
    date_time: string;
}

/** Everything §3 needs to build a schedule. */
export interface CourseDefinition {
    course_name: string;
    course_id: string;
    start_date: string;
    end_date: string;
    topic_difficulty: number;
    total_homework_hours: number;
    course_sessions: CourseSession[];
    lab_sessions: CourseSession[];
    assignments: CourseAssignment[];
    exams: CourseExam[];
}

/** §9 — the weekly structure exchanged with the main application. */
export interface WeekScheduleV1 extends WeeklyLoad {
    week_index: number;
    week_number: number;
    week_start: string;
    week_end: string;
    adjusted: boolean;
    actual_stress: number | null;
    adjustment_details: string[];
}

export interface ScheduleBuildWarning {
    code: string;
    message: string;
    subject?: string;
}

export interface ScheduleBuildResult {
    weeks: WeekScheduleV1[];
    warnings: ScheduleBuildWarning[];
}

// ---------------------------------------------------------------------------
// Date and time helpers
// ---------------------------------------------------------------------------

/** "09:30" -> 570. Returns null for anything unparseable. */
export function parseTimeToMinutes(time: string): number | null {
    if (typeof time !== "string") return null;
    const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
    if (!m) return null;
    const hours = Number(m[1]);
    const minutes = Number(m[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
}

/** §3.2 — D = (end minutes - start minutes) / 60. Negative spans yield 0. */
export function sessionHours(session: CourseSession): number {
    const start = parseTimeToMinutes(session?.start_time);
    const end = parseTimeToMinutes(session?.end_time);
    if (start === null || end === null) return 0;
    return Math.max(0, (end - start) / 60);
}

export function parseDate(value: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** §3.1 — N = ceil(days(d_e - d_s) / 7), never below 1. */
export function semesterWeekCount(startDate: string, endDate: string): number {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) return 1;
    const days = (end.getTime() - start.getTime()) / MS_PER_DAY;
    if (!Number.isFinite(days) || days <= 0) return 1;
    return Math.max(1, Math.ceil(days / SCHEDULE_BUILD.days_per_week));
}

/** Zero-based week containing `date`, unclamped (may be negative or >= N). */
export function rawWeekIndexForDate(date: Date, semesterStart: Date): number {
    return Math.floor((date.getTime() - semesterStart.getTime()) / MS_PER_WEEK);
}

/** Zero-based week containing `date`, clamped into [0, weekCount - 1]. */
export function weekIndexForDate(
    date: Date,
    semesterStart: Date,
    weekCount: number
): number {
    const raw = rawWeekIndexForDate(date, semesterStart);
    if (raw < 0) return 0;
    if (raw > weekCount - 1) return weekCount - 1;
    return raw;
}

/** Inclusive week bounds; `week_end` is six days after `week_start` (§9). */
export function weekBounds(
    semesterStart: Date,
    weekIndex: number
): { week_start: string; week_end: string } {
    const start = new Date(semesterStart.getTime() + weekIndex * MS_PER_WEEK);
    const end = new Date(start.getTime() + 6 * MS_PER_DAY);
    return { week_start: start.toISOString(), week_end: end.toISOString() };
}

// ---------------------------------------------------------------------------
// The builder
// ---------------------------------------------------------------------------

/** An empty semester skeleton with dates filled in. */
export function emptyWeeks(
    semesterStart: Date,
    weekCount: number
): WeekScheduleV1[] {
    const weeks: WeekScheduleV1[] = [];
    for (let w = 0; w < weekCount; w++) {
        const { week_start, week_end } = weekBounds(semesterStart, w);
        weeks.push({
            week_index: w,
            week_number: w + 1,
            week_start,
            week_end,
            adjusted: false,
            lecture_hours: 0,
            lab_hours: 0,
            homework_hours: 0,
            assignment_hours: 0,
            exam_hours: 0,
            actual_stress: null,
            adjustment_details: [],
        });
    }
    return weeks;
}

/**
 * §3 — build the full weekly schedule.
 *
 * Canonical construction order (see design.md; this is the order the two
 * systems must share, because §3.5's exam rules are not commutative):
 *
 *   1. lectures and labs, added to every week (§3.2)
 *   2. homework spread over the whole semester (§3.3)
 *   3. assignment hours spread over each active span (§3.4)
 *   4. exams in chronological order, each applying its exam-week load, its
 *      pre-week homework bonus and its post-week homework damping before the
 *      next exam is processed (§3.5)
 */
export function buildWeekSchedules(course: CourseDefinition): ScheduleBuildResult {
    const warnings: ScheduleBuildWarning[] = [];

    const semesterStart = parseDate(course.start_date);
    if (!semesterStart) {
        warnings.push({
            code: "invalid_start_date",
            message: `Course start_date "${course.start_date}" could not be parsed; schedule is empty.`,
        });
        return { weeks: [], warnings };
    }
    if (!parseDate(course.end_date)) {
        warnings.push({
            code: "invalid_end_date",
            message: `Course end_date "${course.end_date}" could not be parsed; falling back to a one-week semester.`,
        });
    }

    const weekCount = semesterWeekCount(course.start_date, course.end_date);
    const weeks = emptyWeeks(semesterStart, weekCount);

    // --- 1. Lectures and labs (§3.2) ------------------------------------
    const lectureHoursPerWeek = (course.course_sessions ?? []).reduce(
        (sum, s) => sum + sessionHours(s),
        0
    );
    const labHoursPerWeek = (course.lab_sessions ?? []).reduce(
        (sum, s) => sum + sessionHours(s),
        0
    );
    for (const week of weeks) {
        week.lecture_hours = lectureHoursPerWeek;
        week.lab_hours = labHoursPerWeek;
    }

    // --- 2. Homework (§3.3) ---------------------------------------------
    const totalHomework = safe(course.total_homework_hours);
    if (totalHomework > 0) {
        const g = skewWeights(weekCount, SCHEDULE_BUILD.skew_exponent);
        for (let w = 0; w < weekCount; w++) {
            weeks[w].homework_hours = totalHomework * g[w];
        }
    }

    // --- 3. Assignments (§3.4) ------------------------------------------
    for (const assignment of course.assignments ?? []) {
        const startDate = parseDate(assignment.start_date);
        const endDate = parseDate(assignment.end_date);

        if (!startDate || !endDate) {
            warnings.push({
                code: "invalid_assignment_dates",
                subject: assignment.assignment_id,
                message: `Assignment "${assignment.assignment_id}" has unparseable dates and was skipped.`,
            });
            continue;
        }

        let startWeek = weekIndexForDate(startDate, semesterStart, weekCount);
        const endWeek = weekIndexForDate(endDate, semesterStart, weekCount);

        if (startWeek > endWeek) {
            warnings.push({
                code: "assignment_start_after_end",
                subject: assignment.assignment_id,
                message: `Assignment "${assignment.assignment_id}" starts (week ${startWeek + 1}) after it ends (week ${endWeek + 1}); the span was collapsed to its deadline week.`,
            });
            startWeek = endWeek;
        }

        const rawStart = rawWeekIndexForDate(startDate, semesterStart);
        const rawEnd = rawWeekIndexForDate(endDate, semesterStart);
        if (rawStart < 0 || rawEnd > weekCount - 1) {
            warnings.push({
                code: "assignment_clamped_to_semester",
                subject: assignment.assignment_id,
                message: `Assignment "${assignment.assignment_id}" extends outside the semester and was clamped to weeks ${startWeek + 1}-${endWeek + 1}.`,
            });
        }

        const span = endWeek - startWeek + 1;
        const hours = safe(assignment.estimated_hours);
        if (hours === 0) continue;

        const g = skewWeights(span, SCHEDULE_BUILD.skew_exponent);
        for (let i = 0; i < span; i++) {
            weeks[startWeek + i].assignment_hours += hours * g[i];
        }
    }

    // --- 4. Exams (§3.5), chronologically -------------------------------
    const difficulty = safe(course.topic_difficulty);
    const exams = [...(course.exams ?? [])]
        .map((exam) => ({ exam, date: parseDate(exam.date_time) }))
        .filter((e) => {
            if (!e.date) {
                warnings.push({
                    code: "invalid_exam_date",
                    subject: e.exam.exam_id,
                    message: `Exam "${e.exam.exam_id}" has an unparseable date_time and was skipped.`,
                });
                return false;
            }
            return true;
        })
        .sort((a, b) => {
            const delta = a.date!.getTime() - b.date!.getTime();
            if (delta !== 0) return delta;
            // Stable tiebreak so two exams on the same day always build the
            // same schedule regardless of input ordering.
            return a.exam.exam_id.localeCompare(b.exam.exam_id);
        });

    for (const { exam, date } of exams) {
        const rawWeek = rawWeekIndexForDate(date!, semesterStart);
        const examWeek = weekIndexForDate(date!, semesterStart, weekCount);

        if (rawWeek < 0 || rawWeek > weekCount - 1) {
            warnings.push({
                code: "exam_clamped_to_semester",
                subject: exam.exam_id,
                message: `Exam "${exam.exam_id}" falls outside the semester and was clamped to week ${examWeek + 1}.`,
            });
        }

        weeks[examWeek].exam_hours +=
            SCHEDULE_BUILD.exam_load_per_difficulty * difficulty;

        if (examWeek - 1 >= 0) {
            weeks[examWeek - 1].homework_hours +=
                SCHEDULE_BUILD.pre_exam_homework_bonus;
        }
        if (examWeek + 1 < weekCount) {
            weeks[examWeek + 1].homework_hours *=
                SCHEDULE_BUILD.post_exam_homework_factor;
        }
    }

    return { weeks, warnings };
}
