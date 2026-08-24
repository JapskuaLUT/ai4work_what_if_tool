// backend/src/services/stressModel/week.ts
//
// §4 — the single-week component equations. `predictWeek` returns every
// intermediate value, not just the final number, because §13 requires the two
// systems to compare component-by-component.

import {
    COMPONENT_BOUNDS,
    EXAM_PRESSURE,
    OVERLOAD_PRESSURE,
    COURSE_STRESS_MODEL_V1,
    type StressModelConfig,
} from "./constants";
import { boundedLinear, clip, safe, softCap } from "./primitives";

/** The five workload variables of §2. */
export interface WeeklyLoad {
    lecture_hours: number;
    lab_hours: number;
    homework_hours: number;
    assignment_hours: number;
    exam_hours: number;
}

/** Everything §13 asks the two systems to compare. */
export interface WeekStressComponents {
    /** T_w = L_w + B_w */
    teaching_load: number;
    /** I_w = H_w + A_w */
    independent_load: number;
    /** W_w = L_w + B_w + H_w + A_w + E_w */
    total_load: number;

    base: number;
    teaching: number;
    homework: number;
    assignment: number;
    exam: number;
    overload: number;
    fatigue: number;

    /** R_w — sum of the seven components above. */
    raw: number;
    /** Ŝ_w — R_w through the soft cap. */
    soft_capped: number;
    /** S^schedule_w — Ŝ_w clipped to the model range. */
    schedule_only: number;
}

export const ZERO_LOAD: WeeklyLoad = {
    lecture_hours: 0,
    lab_hours: 0,
    homework_hours: 0,
    assignment_hours: 0,
    exam_hours: 0,
};

/** Sanitise all five workload fields (§4.1). */
export function sanitizeLoad(load: Partial<WeeklyLoad> | null | undefined): WeeklyLoad {
    return {
        lecture_hours: safe(load?.lecture_hours),
        lab_hours: safe(load?.lab_hours),
        homework_hours: safe(load?.homework_hours),
        assignment_hours: safe(load?.assignment_hours),
        exam_hours: safe(load?.exam_hours),
    };
}

/**
 * §4.3 — exam pressure. Any non-zero exam load carries a 12-point floor, so
 * the contribution jumps discontinuously the moment an exam exists.
 */
export function examPressure(examHours: number): number {
    if (examHours === 0) return 0;
    return (
        EXAM_PRESSURE.floor +
        Math.min(EXAM_PRESSURE.slope * examHours, EXAM_PRESSURE.cap)
    );
}

/** §4.3 — true overload pressure above 32 total hours. */
export function overloadPressure(totalLoad: number): number {
    if (totalLoad <= OVERLOAD_PRESSURE.threshold) return 0;
    const excess = totalLoad - OVERLOAD_PRESSURE.threshold;
    return Math.min(
        OVERLOAD_PRESSURE.coefficient * Math.pow(excess, OVERLOAD_PRESSURE.exponent),
        OVERLOAD_PRESSURE.cap
    );
}

/**
 * §4.3–4.5 — one week of the schedule-only model.
 *
 * `previousStress` is the *final* predicted stress of the preceding week
 * (S_{w-1}, with S_{-1} = 0), not its schedule-only value. That is what makes
 * the trajectory order-dependent; see trajectory.ts.
 */
export function predictWeek(
    load: Partial<WeeklyLoad> | null | undefined,
    previousStress: number = 0,
    config: StressModelConfig = COURSE_STRESS_MODEL_V1
): WeekStressComponents {
    const l = sanitizeLoad(load);

    const teaching_load = l.lecture_hours + l.lab_hours;
    const independent_load = l.homework_hours + l.assignment_hours;
    const total_load = teaching_load + independent_load + l.exam_hours;

    const base = boundedLinear(
        total_load,
        COMPONENT_BOUNDS.base.start,
        COMPONENT_BOUNDS.base.end,
        COMPONENT_BOUNDS.base.max
    );
    const teaching = boundedLinear(
        teaching_load,
        COMPONENT_BOUNDS.teaching.start,
        COMPONENT_BOUNDS.teaching.end,
        COMPONENT_BOUNDS.teaching.max
    );
    const homework = boundedLinear(
        l.homework_hours,
        COMPONENT_BOUNDS.homework.start,
        COMPONENT_BOUNDS.homework.end,
        COMPONENT_BOUNDS.homework.max
    );
    const assignment = boundedLinear(
        l.assignment_hours,
        COMPONENT_BOUNDS.assignment.start,
        COMPONENT_BOUNDS.assignment.end,
        COMPONENT_BOUNDS.assignment.max
    );
    const exam = examPressure(l.exam_hours);
    const overload = overloadPressure(total_load);
    const fatigue =
        config.fatigue_carry_over *
        clip(previousStress, config.minimum_stress, config.maximum_stress);

    const raw = base + teaching + homework + assignment + exam + overload + fatigue;
    const soft_capped = softCap(raw, config.maximum_stress, config.soft_cap_softness);
    const schedule_only = clip(
        soft_capped,
        config.minimum_stress,
        config.maximum_stress
    );

    return {
        teaching_load,
        independent_load,
        total_load,
        base,
        teaching,
        homework,
        assignment,
        exam,
        overload,
        fatigue,
        raw,
        soft_capped,
        schedule_only,
    };
}
