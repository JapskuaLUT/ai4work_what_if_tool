// backend/src/services/stressModel/trajectory.ts
//
// §4.3 (fatigue) + §5 (observed-stress calibration) — the sequential pass over
// a semester. Weeks cannot be evaluated independently: each week's fatigue term
// reads the previous week's *final* stress, and the calibration bias is carried
// forward across the whole series.

import { COURSE_STRESS_MODEL_V1, type StressModelConfig } from "./constants";
import { clip } from "./primitives";
import { predictWeek, type WeeklyLoad, type WeekStressComponents } from "./week";

/** A week as fed to the trajectory: workload plus an optional observation. */
export interface TrajectoryWeekInput extends Partial<WeeklyLoad> {
    /** O_w. null / undefined / non-finite / non-positive means "unavailable" (§5). */
    actual_stress?: number | null;
}

export interface TrajectoryWeekResult {
    week_index: number;
    components: WeekStressComponents;
    /** O_w after validation, or null when unavailable. */
    observed_stress: number | null;
    /** Whether §5.1 blending was used for this week. */
    observed_applied: boolean;
    /** b_w — the bias available *before* predicting this week. */
    calibration_bias_in: number;
    /** b_{w+1} — the bias handed to the next week. */
    calibration_bias_out: number;
    /** S_w — the final predicted stress. */
    predicted_stress: number;
}

export interface TrajectoryOptions {
    config?: StressModelConfig;
    /** S_{-1}. Defaults to 0 per §4.3. */
    initialPreviousStress?: number;
    /** b_0. Defaults to 0 per §5.2. */
    initialCalibrationBias?: number;
    /**
     * Set false to run the schedule-only model with no observed-stress
     * blending or bias. Used by the §13 fixtures that isolate §4.
     */
    useObservedStress?: boolean;
}

/**
 * §5 — is this a usable observation? Missing, non-finite and non-positive
 * values are all treated as unavailable; valid ones are clipped to the model
 * range.
 */
export function normalizeObservedStress(
    value: number | null | undefined,
    config: StressModelConfig = COURSE_STRESS_MODEL_V1
): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== "number") return null;
    if (!Number.isFinite(value)) return null;
    if (value <= 0) return null;
    return clip(value, config.minimum_stress, config.maximum_stress);
}

/**
 * Run the model across a whole semester, in order, week 0 first.
 *
 * For a what-if scenario the caller supplies observations only for weeks that
 * have actually happened. The bias learned from those weeks then carries
 * forward untouched into the future weeks (§5.2), which is exactly what
 * "preserve calibration learned from historical weeks" asks for — no special
 * casing is needed, and no observation is ever invented.
 */
export function predictTrajectory(
    weeks: TrajectoryWeekInput[],
    options: TrajectoryOptions = {}
): TrajectoryWeekResult[] {
    const config = options.config ?? COURSE_STRESS_MODEL_V1;
    const useObserved = options.useObservedStress !== false;

    let previousStress = options.initialPreviousStress ?? 0;
    let bias = options.initialCalibrationBias ?? 0;

    const results: TrajectoryWeekResult[] = [];

    for (let w = 0; w < weeks.length; w++) {
        const input = weeks[w];
        const components = predictWeek(input, previousStress, config);

        const observed = useObserved
            ? normalizeObservedStress(input?.actual_stress, config)
            : null;

        const biasIn = bias;
        let predicted: number;
        let biasOut: number;

        if (observed !== null) {
            // §5.1 — blend. Note the bias is *not* added on an observed week.
            const alpha = config.actual_stress_blend;
            predicted = clip(
                alpha * observed + (1 - alpha) * components.schedule_only,
                config.minimum_stress,
                config.maximum_stress
            );
            // §5.2 — learn from the schedule-model error.
            const error = observed - components.schedule_only;
            const eta = config.calibration_learning_rate;
            biasOut = clip(
                (1 - eta) * biasIn + eta * error,
                -config.maximum_calibration_bias,
                config.maximum_calibration_bias
            );
        } else {
            // §5.2 — no observation: apply the standing bias, leave it unchanged.
            predicted = clip(
                components.schedule_only + biasIn,
                config.minimum_stress,
                config.maximum_stress
            );
            biasOut = biasIn;
        }

        results.push({
            week_index: w,
            components,
            observed_stress: observed,
            observed_applied: observed !== null,
            calibration_bias_in: biasIn,
            calibration_bias_out: biasOut,
            predicted_stress: predicted,
        });

        previousStress = predicted;
        bias = biasOut;
    }

    return results;
}
