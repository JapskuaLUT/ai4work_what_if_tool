// backend/src/services/education/redistribute.ts
//
// §7 — placing cancelled lecture / lab hours into later weeks.
//
// Two objectives are supported. `local_week` reproduces the main application's
// current rule: evaluate each candidate week in isolation and take the smallest
// increase. `trajectory_peak` recomputes the whole semester per candidate and
// minimises peak stress, which is the correct thing to do under fatigue
// carry-over. `local_week` is the default so the two systems agree out of the
// box; the chosen objective is echoed in the response either way.
//
// Every placement is recorded as a RedistributionFlow (§12.6 — the previous
// implementation built flows and then dropped them).

import {
    COURSE_STRESS_MODEL_V1,
    predictTrajectory,
    predictWeek,
    REDISTRIBUTION_CHUNK_HOURS,
    type StressModelConfig,
    type WeekScheduleV1,
} from "../stressModel";

export type RedistributionObjective = "local_week" | "trajectory_peak";

export type RedistributableField = "lecture_hours" | "lab_hours";

/** §11 — every field the request asks a flow to record. */
export interface RedistributionFlow {
    source_week_index: number;
    source_week_number: number;
    target_week_index: number;
    target_week_number: number;
    hours: number;
    workload_type: RedistributableField;
    target_stress_before: number;
    target_stress_after: number;
    impact: number;
    objective: RedistributionObjective;
}

export interface RedistributionResult {
    flows: RedistributionFlow[];
    /** Hours that could not be placed because no valid future week remained. */
    remaining_hours: number;
}

const EPSILON = 1e-9;

/** Isolated-week stress, matching §7's literal "temporary week" rule. */
function isolatedWeekStress(
    week: WeekScheduleV1,
    config: StressModelConfig
): number {
    return predictWeek(week, 0, config).schedule_only;
}

/** Peak final stress across the whole semester (§7's trajectory objective). */
function trajectoryPeak(
    weeks: WeekScheduleV1[],
    config: StressModelConfig
): number {
    const results = predictTrajectory(weeks, { config });
    return results.reduce((max, r) => Math.max(max, r.predicted_stress), 0);
}

/**
 * Move `hours` of `field` out of `sourceIndex` into later weeks, at most
 * REDISTRIBUTION_CHUNK_HOURS per iteration, always choosing the week with the
 * smallest stress increase. Mutates `weeks` in place.
 *
 * Only weeks strictly after `sourceIndex` are candidates, and never a week
 * before `earliestTargetIndex` (§8 — redistributed hours land in the future).
 */
export function redistributeCancelledHours(
    weeks: WeekScheduleV1[],
    sourceIndex: number,
    hours: number,
    field: RedistributableField,
    options: {
        objective?: RedistributionObjective;
        config?: StressModelConfig;
        earliestTargetIndex?: number;
    } = {}
): RedistributionResult {
    const objective = options.objective ?? "local_week";
    const config = options.config ?? COURSE_STRESS_MODEL_V1;
    const earliest = Math.max(sourceIndex + 1, options.earliestTargetIndex ?? 0);

    const flows: RedistributionFlow[] = [];
    let remaining = hours;

    while (remaining > EPSILON) {
        const delta = Math.min(remaining, REDISTRIBUTION_CHUNK_HOURS);
        if (delta <= EPSILON) break;

        let best: {
            index: number;
            impact: number;
            before: number;
            after: number;
        } | null = null;

        for (let j = earliest; j < weeks.length; j++) {
            let before: number;
            let after: number;

            if (objective === "local_week") {
                before = isolatedWeekStress(weeks[j], config);
                after = isolatedWeekStress(
                    { ...weeks[j], [field]: weeks[j][field] + delta },
                    config
                );
            } else {
                before = trajectoryPeak(weeks, config);
                const candidate = weeks.map((w, i) =>
                    i === j ? { ...w, [field]: w[field] + delta } : w
                );
                after = trajectoryPeak(candidate, config);
            }

            const impact = after - before;
            if (best === null || impact < best.impact) {
                best = { index: j, impact, before, after };
            }
        }

        // No valid future week remains — stop and report the shortfall.
        if (best === null) break;

        weeks[best.index][field] += delta;
        weeks[best.index].adjusted = true;
        weeks[best.index].adjustment_details.push(
            `received ${delta.toFixed(2)}h ${field.replace("_hours", "")} redistributed from week ${sourceIndex + 1}`
        );

        flows.push({
            source_week_index: sourceIndex,
            source_week_number: sourceIndex + 1,
            target_week_index: best.index,
            target_week_number: best.index + 1,
            hours: delta,
            workload_type: field,
            target_stress_before: best.before,
            target_stress_after: best.after,
            impact: best.impact,
            objective,
        });

        remaining -= delta;
    }

    return { flows, remaining_hours: remaining < EPSILON ? 0 : remaining };
}
