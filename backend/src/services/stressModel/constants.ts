// backend/src/services/stressModel/constants.ts
//
// Versioned constants for `course_stress_prediction`. Every number in this
// file comes from the shared specification
// (specifications/education_stress/request.md) and must stay identical to the
// main AI4Work education application. Change a value here and you have made a
// new model version — bump `version` and say so in the design doc.
//
// This module, and everything else under stressModel/, deliberately imports
// nothing from the rest of the backend. It is a pure library so it can be
// extracted to a shared package later without moving logic.

/** §9 — the model configuration block echoed on every payload. */
export interface StressModelConfig {
    name: string;
    version: string;
    minimum_stress: number;
    maximum_stress: number;
    actual_stress_blend: number;
    calibration_learning_rate: number;
    maximum_calibration_bias: number;
    fatigue_carry_over: number;
    soft_cap_softness: number;
}

export const COURSE_STRESS_MODEL_V1: StressModelConfig = {
    name: "course_stress_prediction",
    version: "1.0",
    minimum_stress: 0.0,
    maximum_stress: 90.0,
    actual_stress_blend: 0.45,
    calibration_learning_rate: 0.25,
    maximum_calibration_bias: 12.0,
    fatigue_carry_over: 0.07,
    soft_cap_softness: 0.82,
};

/** Bounded-linear parameters (§4.2, §4.3): activation, saturation, maximum. */
export interface BoundedLinearParams {
    start: number;
    end: number;
    max: number;
}

export const COMPONENT_BOUNDS = {
    /** P^base — BL(W_w; 5, 30, 34) */
    base: { start: 5, end: 30, max: 34 } as BoundedLinearParams,
    /** P^teach — BL(T_w; 3, 14, 10) */
    teaching: { start: 3, end: 14, max: 10 } as BoundedLinearParams,
    /** P^home — BL(H_w; 2, 16, 12) */
    homework: { start: 2, end: 16, max: 12 } as BoundedLinearParams,
    /** P^assign — BL(A_w; 1, 14, 18) */
    assignment: { start: 1, end: 14, max: 18 } as BoundedLinearParams,
};

/** P^exam — 0 when E_w = 0, otherwise 12 + min(2.5 E_w, 18). Max 30. */
export const EXAM_PRESSURE = {
    floor: 12,
    slope: 2.5,
    cap: 18,
};

/** P^over — 0 at or below 32h, else min(1.3 (W-32)^1.15, 14). */
export const OVERLOAD_PRESSURE = {
    threshold: 32,
    coefficient: 1.3,
    exponent: 1.15,
    cap: 14,
};

/** §3 schedule-construction constants. */
export const SCHEDULE_BUILD = {
    /** Right-skew exponent for homework (§3.3) and assignments (§3.4). */
    skew_exponent: 2.5,
    /** E_{x_e} += 2 * difficulty (§3.5). */
    exam_load_per_difficulty: 2,
    /** H_{x_e - 1} += 2 (§3.5). */
    pre_exam_homework_bonus: 2,
    /** H_{x_e + 1} *= 0.7 (§3.5). */
    post_exam_homework_factor: 0.7,
    days_per_week: 7,
};

/** §2 classification bands and §8 optimisation thresholds. */
export const STRESS_BANDS = {
    low_max: 33,
    moderate_max: 66,
    warning: 75,
    critical: 85,
};

/** §7 — at most three hours are placed per redistribution iteration. */
export const REDISTRIBUTION_CHUNK_HOURS = 3;

export type StressClassification = "Low" | "Moderate" | "High";

/** §2 — band for a final predicted stress value. */
export function classifyStress(stress: number): StressClassification {
    if (stress <= STRESS_BANDS.low_max) return "Low";
    if (stress <= STRESS_BANDS.moderate_max) return "Moderate";
    return "High";
}
