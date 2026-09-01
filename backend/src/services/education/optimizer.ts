// backend/src/services/education/optimizer.ts
//
// Generates candidate what-if scenarios automatically.
//
// The important structural change from the previous engine: strategies no
// longer mutate week schedules themselves. Each one *emits an
// AdjustmentRequest[]*, which is then run through simulateScenario() — the same
// path a user-authored scenario takes. Generated and hand-built scenarios
// therefore share one implementation, one output contract and one audit trail.
//
// Search is driven by §8's primary objective, `min max_w S_w`. That is
// deliberate and worth understanding: under course_stress_prediction v1.0 the
// schedule-only model saturates around 60.4 (see
// specifications/education_stress/design.md §3.1), so a search keyed on the
// warning (75) or critical (85) thresholds would never fire on any course.
// Thresholds are still honoured — as constraints and in the reporting — but the
// peak is what the search minimises.

import { REDISTRIBUTION_CHUNK_HOURS } from "../stressModel";
import type { AdjustmentRequest } from "./adjustments";
import {
    simulateScenario,
    type ScenarioContext,
    type ScenarioMeta,
    type ScenarioResult,
} from "./simulate";

const MS_PER_DAY = 86_400_000;
const EPSILON = 1e-9;

export const STRATEGY_NAMES: Record<string, string> = {
    adjustment_1: "Minimal Adjustment - Peak Week Only",
    adjustment_2: "Balanced Redistribution - Smooth Stress Curve",
    adjustment_3: "Aggressive Optimization - Maximum Peak Reduction",
    adjustment_4: "Extension-Based - Deadline Flexibility",
};

export const STRATEGY_KEY_CHANGES: Record<string, string> = {
    adjustment_1: "A single homework move off the peak week",
    adjustment_2: "Repeated homework moves that flatten the stress curve",
    adjustment_3: "Homework moves plus teaching-hour redistribution on the worst weeks",
    adjustment_4: "Assignment deadline extensions",
};

interface SearchState {
    adjustments: AdjustmentRequest[];
    result: ScenarioResult;
}

function metaFor(id: string, meta: ScenarioMeta): ScenarioMeta {
    return {
        ...meta,
        scenario_id: id,
        name: STRATEGY_NAMES[id] ?? id,
        origin: "generated",
    };
}

function run(
    context: ScenarioContext,
    adjustments: AdjustmentRequest[],
    id: string,
    meta: ScenarioMeta
): ScenarioResult {
    return simulateScenario(context, adjustments, metaFor(id, meta));
}

/** Peak stress of a candidate, the quantity §8 asks us to minimise. */
function peakOf(result: ScenarioResult): number {
    return result.simulation.summary.peak_stress;
}

/**
 * One greedy step: try moving homework off the current peak week into every
 * legal target week and keep whichever lowers the peak most.
 *
 * Returns null when no single move improves on `state`.
 */
function bestHomeworkMove(
    context: ScenarioContext,
    state: SearchState,
    id: string,
    meta: ScenarioMeta,
    step: number
): SearchState | null {
    const weeks = state.result.simulation.week_schedules;
    const peakIndex = state.result.simulation.summary.peak_week_index;
    const earliest = context.options?.allow_past_week_changes
        ? 0
        : context.current_week_index ?? 0;

    if (peakIndex < earliest) return null;

    const available = weeks[peakIndex]?.homework_hours ?? 0;
    if (available <= EPSILON) return null;
    const hours = Math.min(available, REDISTRIBUTION_CHUNK_HOURS);

    let best: SearchState | null = null;

    for (let target = earliest; target < weeks.length; target++) {
        if (target === peakIndex) continue;
        const candidate: AdjustmentRequest[] = [
            ...state.adjustments,
            {
                id: `${id}-move-${step}`,
                type: "move_homework",
                source_week_index: peakIndex,
                target_week_index: target,
                hours,
                reason: `Lower the week ${peakIndex + 1} peak by shifting homework to week ${target + 1}`,
            },
        ];
        const result = run(context, candidate, id, meta);
        if (peakOf(result) < peakOf(state.result) - EPSILON) {
            if (best === null || peakOf(result) < peakOf(best.result) - EPSILON) {
                best = { adjustments: candidate, result };
            }
        }
    }

    return best;
}

/** Try cancelling lecture or lab hours on the peak week (§6.1, §7). */
function bestTeachingCancellation(
    context: ScenarioContext,
    state: SearchState,
    id: string,
    meta: ScenarioMeta,
    step: number
): SearchState | null {
    const weeks = state.result.simulation.week_schedules;
    const peakIndex = state.result.simulation.summary.peak_week_index;
    const earliest = context.options?.allow_past_week_changes
        ? 0
        : context.current_week_index ?? 0;
    if (peakIndex < earliest) return null;

    let best: SearchState | null = null;

    for (const type of ["cancel_lecture", "cancel_lab"] as const) {
        const field = type === "cancel_lecture" ? "lecture_hours" : "lab_hours";
        if ((weeks[peakIndex]?.[field] ?? 0) <= EPSILON) continue;

        const candidate: AdjustmentRequest[] = [
            ...state.adjustments,
            {
                id: `${id}-${type}-${step}`,
                type,
                source_week_index: peakIndex,
                reason: `Relieve the week ${peakIndex + 1} peak by moving its ${
                    type === "cancel_lecture" ? "lecture" : "lab"
                } hours to a lower-impact week`,
            },
        ];
        const result = run(context, candidate, id, meta);
        if (
            peakOf(result) < peakOf(state.result) - EPSILON &&
            (best === null || peakOf(result) < peakOf(best.result) - EPSILON)
        ) {
            best = { adjustments: candidate, result };
        }
    }

    return best;
}

/** Greedy descent on the peak, up to `maxSteps` accepted moves. */
function greedy(
    context: ScenarioContext,
    id: string,
    meta: ScenarioMeta,
    maxSteps: number,
    includeTeaching: boolean
): ScenarioResult {
    let state: SearchState = {
        adjustments: [],
        result: run(context, [], id, meta),
    };

    for (let step = 0; step < maxSteps; step++) {
        const candidates = [
            bestHomeworkMove(context, state, id, meta, step),
            includeTeaching
                ? bestTeachingCancellation(context, state, id, meta, step)
                : null,
        ].filter((c): c is SearchState => c !== null);

        if (candidates.length === 0) break;
        candidates.sort((a, b) => peakOf(a.result) - peakOf(b.result));
        state = candidates[0];
    }

    return state.result;
}

/**
 * §6.2 — extension-based strategy. For every assignment, try pushing its
 * deadline out by 1..max weeks and keep the combination that lowers the peak.
 */
function extensionStrategy(
    context: ScenarioContext,
    id: string,
    meta: ScenarioMeta
): ScenarioResult {
    const maxExtensions = context.options?.max_extensions_per_assignment ?? 2;
    const semesterEnd = new Date(context.course.end_date);

    let state: SearchState = {
        adjustments: [],
        result: run(context, [], id, meta),
    };

    for (const assignment of context.course.assignments ?? []) {
        const currentEnd = new Date(assignment.end_date);
        if (Number.isNaN(currentEnd.getTime())) continue;

        let best: SearchState | null = null;

        for (let weeks = 1; weeks <= maxExtensions; weeks++) {
            const newEnd = new Date(currentEnd.getTime() + weeks * 7 * MS_PER_DAY);
            if (newEnd.getTime() > semesterEnd.getTime()) break;

            const candidate: AdjustmentRequest[] = [
                ...state.adjustments,
                {
                    id: `${id}-extend-${assignment.assignment_id}`,
                    type: "extend_assignment",
                    assignment_id: assignment.assignment_id,
                    new_end_date: newEnd.toISOString(),
                    reason: `Extend "${assignment.name}" by ${weeks} week(s) to spread its workload`,
                },
            ];
            const result = run(context, candidate, id, meta);
            if (
                peakOf(result) < peakOf(state.result) - EPSILON &&
                (best === null || peakOf(result) < peakOf(best.result) - EPSILON)
            ) {
                best = { adjustments: candidate, result };
            }
        }

        if (best) state = best;
    }

    // If no extension helped, fall back to a couple of homework moves so the
    // scenario still offers something rather than returning the baseline.
    if (state.adjustments.length === 0) {
        return greedy(context, id, meta, 2, false);
    }

    return state.result;
}

/**
 * Generate the four comparison scenarios. Every one is a real
 * ScenarioResult produced by simulateScenario, so they carry the same
 * baseline/simulation comparison, audit trail and model metadata as a
 * user-authored what-if.
 */
export function generateScenarios(
    context: ScenarioContext,
    meta: ScenarioMeta
): ScenarioResult[] {
    const allowExtensions =
        (context.options?.max_extensions_per_assignment ?? 2) > 0 &&
        (context.course.assignments?.length ?? 0) > 0;

    const scenarios: ScenarioResult[] = [
        greedy(context, "adjustment_1", meta, 1, false),
        greedy(context, "adjustment_2", meta, 4, false),
        greedy(context, "adjustment_3", meta, 6, true),
    ];

    if (allowExtensions) {
        scenarios.push(extensionStrategy(context, "adjustment_4", meta));
    }

    return scenarios;
}

/**
 * §8 — rank scenarios by the primary objective, breaking ties with the listed
 * secondary criteria in order. Lowest peak first.
 */
export function rankScenarios(scenarios: ScenarioResult[]): ScenarioResult[] {
    return [...scenarios].sort((a, b) => {
        const byPeak =
            a.simulation.summary.peak_stress - b.simulation.summary.peak_stress;
        if (Math.abs(byPeak) > EPSILON) return byPeak;

        // 1. fewest changed academic events
        const byEvents = a.objective.changed_event_count - b.objective.changed_event_count;
        if (byEvents !== 0) return byEvents;

        // 2. least workload moved
        const byMoved = a.objective.moved_workload_hours - b.objective.moved_workload_hours;
        if (Math.abs(byMoved) > EPSILON) return byMoved;

        // 3. smallest sum of weekly stress
        const byTotal =
            a.simulation.summary.total_stress - b.simulation.summary.total_stress;
        if (Math.abs(byTotal) > EPSILON) return byTotal;

        // 4. fewest warning or critical weeks
        const byWarning =
            a.simulation.summary.warning_week_numbers.length +
            a.simulation.summary.critical_week_numbers.length -
            (b.simulation.summary.warning_week_numbers.length +
                b.simulation.summary.critical_week_numbers.length);
        if (byWarning !== 0) return byWarning;

        // 5. earliest recovery below the warning threshold
        const aRecovery = a.simulation.summary.recovery_week_number ?? Infinity;
        const bRecovery = b.simulation.summary.recovery_week_number ?? Infinity;
        return aRecovery - bRecovery;
    });
}

/**
 * Feasibility score (0-100) retained for the existing UI. Rebuilt around the
 * v1 model: how much of the achievable peak reduction a scenario captured,
 * discounted by how disruptive it was.
 */
export function feasibilityScore(
    result: ScenarioResult,
    thresholds: { warning: number; critical: number }
): number {
    const baselinePeak = result.baseline.summary.peak_stress;
    const peak = result.simulation.summary.peak_stress;

    let score = 70;

    if (baselinePeak > EPSILON) {
        // Up to +25 for cutting the peak, proportional to the reduction.
        score += Math.max(-25, Math.min(25, ((baselinePeak - peak) / baselinePeak) * 100));
    }

    score -= result.simulation.summary.critical_week_numbers.length * 8;
    score -= result.simulation.summary.warning_week_numbers.length * 2;

    // Disruption: every changed event and every changed week costs a little.
    score -= result.objective.changed_event_count * 2;
    score -= Math.min(10, result.objective.changed_week_count * 0.5);

    // Anything the engine could not fully apply is a real feasibility signal.
    score -= result.rejected_adjustment_ids.length * 5;
    score -= result.partially_applied_adjustment_ids.length * 2;

    if (peak < thresholds.warning * 0.8) score += 5;

    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}
