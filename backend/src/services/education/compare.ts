// backend/src/services/education/compare.ts
//
// §11 — summarising a trajectory and diffing baseline against simulation,
// including the §8 secondary ranking criteria so a caller comparing several
// scenarios can break ties without recomputing anything.

import {
    classifyStress,
    type TrajectoryWeekResult,
    type WeekScheduleV1,
} from "../stressModel";

export interface StressThresholds {
    warning: number;
    critical: number;
}

export interface TrajectorySummary {
    peak_stress: number;
    peak_week_index: number;
    peak_week_number: number;
    average_stress: number;
    total_stress: number;
    warning_week_indices: number[];
    warning_week_numbers: number[];
    critical_week_indices: number[];
    critical_week_numbers: number[];
    /**
     * §8 secondary criterion 5 — the first week at or after the peak whose
     * stress is back below the warning threshold, or null if it never is.
     */
    recovery_week_number: number | null;
    band_counts: { Low: number; Moderate: number; High: number };
}

export function summarizeTrajectory(
    trajectory: TrajectoryWeekResult[],
    thresholds: StressThresholds
): TrajectorySummary {
    const summary: TrajectorySummary = {
        peak_stress: 0,
        peak_week_index: -1,
        peak_week_number: -1,
        average_stress: 0,
        total_stress: 0,
        warning_week_indices: [],
        warning_week_numbers: [],
        critical_week_indices: [],
        critical_week_numbers: [],
        recovery_week_number: null,
        band_counts: { Low: 0, Moderate: 0, High: 0 },
    };

    if (trajectory.length === 0) return summary;

    for (const week of trajectory) {
        const s = week.predicted_stress;
        summary.total_stress += s;
        if (summary.peak_week_index === -1 || s > summary.peak_stress) {
            summary.peak_stress = s;
            summary.peak_week_index = week.week_index;
            summary.peak_week_number = week.week_index + 1;
        }
        if (s >= thresholds.warning) {
            summary.warning_week_indices.push(week.week_index);
            summary.warning_week_numbers.push(week.week_index + 1);
        }
        if (s >= thresholds.critical) {
            summary.critical_week_indices.push(week.week_index);
            summary.critical_week_numbers.push(week.week_index + 1);
        }
        summary.band_counts[classifyStress(s)] += 1;
    }

    summary.average_stress = summary.total_stress / trajectory.length;

    for (const week of trajectory) {
        if (
            week.week_index >= summary.peak_week_index &&
            week.predicted_stress < thresholds.warning
        ) {
            summary.recovery_week_number = week.week_index + 1;
            break;
        }
    }

    return summary;
}

/** §8 — the tie-break metrics, computed from the baseline/simulated schedules. */
export interface ObjectiveMetrics {
    /** Primary objective: min max_w S_w. Negative means the peak came down. */
    peak_stress_delta: number;
    total_stress_delta: number;
    average_stress_delta: number;
    warning_week_delta: number;
    critical_week_delta: number;
    /** Criterion 1 — how many academic events (assignments, exams) changed. */
    changed_event_count: number;
    /** Criterion 2 — total workload hours moved by the scenario. */
    moved_workload_hours: number;
    changed_week_count: number;
    /** True when the primary objective improved. */
    improved: boolean;
}

const EPSILON = 1e-9;

/** Total hours across the five workload fields for one week. */
function weekTotal(week: WeekScheduleV1): number {
    return (
        week.lecture_hours +
        week.lab_hours +
        week.homework_hours +
        week.assignment_hours +
        week.exam_hours
    );
}

export function buildObjectiveMetrics(
    baselineSummary: TrajectorySummary,
    simulationSummary: TrajectorySummary,
    baselineWeeks: WeekScheduleV1[],
    simulatedWeeks: WeekScheduleV1[],
    changedEventCount: number
): ObjectiveMetrics {
    let movedHours = 0;
    let changedWeeks = 0;

    const n = Math.max(baselineWeeks.length, simulatedWeeks.length);
    for (let i = 0; i < n; i++) {
        const before = baselineWeeks[i];
        const after = simulatedWeeks[i];
        const beforeTotal = before ? weekTotal(before) : 0;
        const afterTotal = after ? weekTotal(after) : 0;
        const delta = Math.abs(afterTotal - beforeTotal);
        if (delta > EPSILON) {
            changedWeeks += 1;
            movedHours += delta;
        }
    }

    // Each moved hour shows up twice (once leaving, once arriving), so halve
    // the sum to report the amount of workload actually relocated.
    movedHours = movedHours / 2;

    const peakDelta = simulationSummary.peak_stress - baselineSummary.peak_stress;

    return {
        peak_stress_delta: peakDelta,
        total_stress_delta:
            simulationSummary.total_stress - baselineSummary.total_stress,
        average_stress_delta:
            simulationSummary.average_stress - baselineSummary.average_stress,
        warning_week_delta:
            simulationSummary.warning_week_numbers.length -
            baselineSummary.warning_week_numbers.length,
        critical_week_delta:
            simulationSummary.critical_week_numbers.length -
            baselineSummary.critical_week_numbers.length,
        changed_event_count: changedEventCount,
        moved_workload_hours: movedHours,
        changed_week_count: changedWeeks,
        improved: peakDelta < -EPSILON,
    };
}

/** §11 — the per-week baseline/simulation pairing returned to the caller. */
export interface WeeklyResult {
    week_index: number;
    week_number: number;
    week_start: string;
    week_end: string;
    adjusted: boolean;
    adjustment_details: string[];
    actual_stress: number | null;
    baseline: {
        lecture_hours: number;
        lab_hours: number;
        homework_hours: number;
        assignment_hours: number;
        exam_hours: number;
        predicted_stress: number;
        classification: string;
        components: TrajectoryWeekResult["components"];
        calibration_bias: number;
    };
    simulation: {
        lecture_hours: number;
        lab_hours: number;
        homework_hours: number;
        assignment_hours: number;
        exam_hours: number;
        predicted_stress: number;
        classification: string;
        components: TrajectoryWeekResult["components"];
        calibration_bias: number;
    };
    stress_delta: number;
}

export function buildWeeklyResults(
    baselineWeeks: WeekScheduleV1[],
    baselineTrajectory: TrajectoryWeekResult[],
    simulatedWeeks: WeekScheduleV1[],
    simulatedTrajectory: TrajectoryWeekResult[]
): WeeklyResult[] {
    const results: WeeklyResult[] = [];
    const n = Math.max(simulatedWeeks.length, baselineWeeks.length);

    for (let i = 0; i < n; i++) {
        const bw = baselineWeeks[i];
        const sw = simulatedWeeks[i];
        const bt = baselineTrajectory[i];
        const st = simulatedTrajectory[i];
        const reference = sw ?? bw;
        if (!reference || !bt || !st) continue;

        results.push({
            week_index: reference.week_index,
            week_number: reference.week_number,
            week_start: reference.week_start,
            week_end: reference.week_end,
            adjusted: sw?.adjusted ?? false,
            adjustment_details: sw?.adjustment_details ?? [],
            actual_stress: st.observed_stress,
            baseline: {
                lecture_hours: bw?.lecture_hours ?? 0,
                lab_hours: bw?.lab_hours ?? 0,
                homework_hours: bw?.homework_hours ?? 0,
                assignment_hours: bw?.assignment_hours ?? 0,
                exam_hours: bw?.exam_hours ?? 0,
                predicted_stress: bt.predicted_stress,
                classification: classifyStress(bt.predicted_stress),
                components: bt.components,
                calibration_bias: bt.calibration_bias_in,
            },
            simulation: {
                lecture_hours: sw?.lecture_hours ?? 0,
                lab_hours: sw?.lab_hours ?? 0,
                homework_hours: sw?.homework_hours ?? 0,
                assignment_hours: sw?.assignment_hours ?? 0,
                exam_hours: sw?.exam_hours ?? 0,
                predicted_stress: st.predicted_stress,
                classification: classifyStress(st.predicted_stress),
                components: st.components,
                calibration_bias: st.calibration_bias_in,
            },
            stress_delta: st.predicted_stress - bt.predicted_stress,
        });
    }

    return results;
}
