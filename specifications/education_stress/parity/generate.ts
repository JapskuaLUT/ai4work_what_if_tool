// specifications/education_stress/parity/generate.ts
//
// Authors the §13 parity fixtures. The *inputs* below are handwritten; the
// expected blocks are produced by running this repository's implementation and
// frozen into JSON so both systems can diff against the same numbers.
//
// Regenerate with:
//   bun run specifications/education_stress/parity/generate.ts
//
// A regenerated file that differs from what is committed means the model
// changed. That is a model-version bump, not a fixture refresh — see design.md.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
    predictTrajectory,
    type CourseDefinition,
} from "../../../backend/src/services/stressModel";
import {
    simulateScenario,
    type AdjustmentRequest,
    type ScenarioContext,
} from "../../../backend/src/services/education";

const OUT_DIR = import.meta.dir;

type Load = { L: number; B: number; H: number; A: number; E: number; O?: number | null };

const load = (L: number, B: number, H: number, A: number, E: number, O: number | null = null) => ({
    lecture_hours: L,
    lab_hours: B,
    homework_hours: H,
    assignment_hours: A,
    exam_hours: E,
    actual_stress: O,
});

/** Shared 12-week reference course for the scenario fixtures. */
const BASE_COURSE: CourseDefinition = {
    course_name: "Full-Stack Web Development",
    course_id: "CS-220",
    start_date: "2026-09-01T00:00:00Z",
    end_date: "2026-11-24T00:00:00Z",
    topic_difficulty: 3,
    total_homework_hours: 100,
    course_sessions: [
        { day: "Monday", start_time: "10:00", end_time: "12:00" },
        { day: "Wednesday", start_time: "14:00", end_time: "16:00" },
    ],
    lab_sessions: [{ day: "Friday", start_time: "13:00", end_time: "15:00" }],
    assignments: [
        {
            assignment_id: "assignment-1",
            name: "Static site",
            start_date: "2026-09-01T00:00:00Z",
            end_date: "2026-09-28T23:59:59Z",
            estimated_hours: 20,
            extensions: [],
        },
        {
            assignment_id: "assignment-2",
            name: "Project report",
            start_date: "2026-09-29T00:00:00Z",
            end_date: "2026-10-26T23:59:59Z",
            estimated_hours: 25,
            extensions: [],
        },
    ],
    exams: [
        {
            exam_id: "exam-1",
            name: "Final examination",
            date_time: "2026-11-10T09:00:00Z",
        },
    ],
};

interface ModelFixture {
    id: string;
    description: string;
    kind: "model";
    input: { weeks: ReturnType<typeof load>[] };
}

interface ScenarioFixture {
    id: string;
    description: string;
    kind: "scenario";
    input: {
        course: CourseDefinition;
        current_week_index: number;
        observed_stress?: ScenarioContext["observed_stress"];
        options?: ScenarioContext["options"];
        adjustments: AdjustmentRequest[];
    };
}

/**
 * Fixtures pin the specification's §8 threshold values explicitly, so the
 * warning/critical week lists in the expected blocks stay stable no matter
 * what display defaults this tool calibrates to (the tool's own defaults are
 * the course-model 45/55 — see decisions.md §1). A fixture should never
 * depend on a default.
 */
const PINNED_SPEC_OPTIONS: ScenarioContext["options"] = {
    stress_threshold_warning: 75,
    stress_threshold_critical: 85,
};

const modelFixtures: ModelFixture[] = [
    {
        id: "01_light_week",
        description: "§13.1 — an empty and a light week, both below every activation point.",
        kind: "model",
        input: { weeks: [load(0, 0, 0, 0, 0), load(1, 0, 1, 0, 0)] },
    },
    {
        id: "02_ordinary_week",
        description: "§13.2 — an ordinary lecture and laboratory week.",
        kind: "model",
        input: { weeks: [load(4, 2, 6, 2, 0)] },
    },
    {
        id: "03_homework_heavy",
        description: "§13.3 — homework at and beyond the P^home saturation point of 16h.",
        kind: "model",
        input: { weeks: [load(3, 2, 16, 0, 0), load(3, 2, 24, 0, 0)] },
    },
    {
        id: "04_assignment_heavy",
        description: "§13.4 — assignment hours at and beyond the P^assign saturation point of 14h.",
        kind: "model",
        input: { weeks: [load(3, 2, 2, 14, 0), load(3, 2, 2, 20, 0)] },
    },
    {
        id: "05_exam_week",
        description: "§13.5 — exam weeks, including the 12-point floor at the smallest non-zero exam load.",
        kind: "model",
        input: { weeks: [load(3, 2, 8, 4, 0.1), load(3, 2, 8, 4, 6), load(3, 2, 8, 4, 20)] },
    },
    {
        id: "06_combined_overload",
        description: "§13.6 — a combined week past the 32h overload threshold.",
        kind: "model",
        input: { weeks: [load(6, 4, 14, 10, 6)] },
    },
    {
        id: "07_fatigue_carryover",
        description: "§13.7 — a high-stress week followed by two normal weeks; only the fatigue term differs.",
        kind: "model",
        input: { weeks: [load(8, 6, 18, 16, 10), load(4, 2, 6, 2, 0), load(4, 2, 6, 2, 0)] },
    },
    {
        id: "08_observed_blending",
        description: "§13.8 — same-week blending at alpha = 0.45, including the non-positive and out-of-range guards.",
        kind: "model",
        input: {
            weeks: [
                load(4, 2, 6, 2, 0, 70),
                load(4, 2, 6, 2, 0, 0),
                load(4, 2, 6, 2, 0, 120),
                load(4, 2, 6, 2, 0, null),
            ],
        },
    },
    {
        id: "09_learned_bias",
        description: "§13.9 — bias learned from three observed weeks, then carried into unobserved future weeks.",
        kind: "model",
        input: {
            weeks: [
                load(4, 2, 6, 2, 0, 55),
                load(4, 2, 7, 3, 0, 60),
                load(4, 2, 8, 4, 0, 65),
                load(4, 2, 8, 4, 0, null),
                load(4, 2, 9, 5, 0, null),
            ],
        },
    },
    {
        id: "18_soft_saturation",
        description: "§13.18 — raw stress far above the range, verifying soft saturation and clipping.",
        kind: "model",
        input: { weeks: [load(40, 40, 60, 60, 40), load(40, 40, 60, 60, 40)] },
    },
];

const scenarioFixtures: ScenarioFixture[] = [
    {
        id: "10_assignment_moved",
        description: "§13.10 — assignment-2 moved to a later span; its hours redistribute over the new weeks.",
        kind: "scenario",
        input: {
            course: BASE_COURSE,
            current_week_index: 0,
            adjustments: [
                {
                    id: "adj-010",
                    type: "move_assignment",
                    assignment_id: "assignment-2",
                    new_start_date: "2026-10-06T00:00:00Z",
                    new_end_date: "2026-11-02T23:59:59Z",
                    reason: "Avoid overlap with the midterm examination",
                },
            ],
        },
    },
    {
        id: "11_assignment_hours_updated",
        description: "§13.11 — assignment-1 estimated hours changed from 20 to 32.",
        kind: "scenario",
        input: {
            course: BASE_COURSE,
            current_week_index: 0,
            adjustments: [
                {
                    id: "adj-011",
                    type: "update_assignment",
                    assignment_id: "assignment-1",
                    new_estimated_hours: 32,
                    reason: "Scope increased after the first review",
                },
            ],
        },
    },
    {
        id: "12_assignment_extended",
        description: "§13.12 — assignment-2 deadline extended by two weeks; extension metadata is recorded.",
        kind: "scenario",
        input: {
            course: BASE_COURSE,
            current_week_index: 0,
            adjustments: [
                {
                    id: "adj-012",
                    type: "extend_assignment",
                    assignment_id: "assignment-2",
                    new_end_date: "2026-11-09T23:59:59Z",
                    reason: "Reduce the predicted stress peak",
                },
            ],
        },
    },
    {
        id: "13_exam_moved",
        description: "§13.13 — exam-1 moved one week later; exam-week, pre-exam and post-exam effects all move with it.",
        kind: "scenario",
        input: {
            course: BASE_COURSE,
            current_week_index: 0,
            adjustments: [
                {
                    id: "adj-013",
                    type: "move_exam",
                    exam_id: "exam-1",
                    new_date: "2026-11-17T09:00:00Z",
                    reason: "Separate two high-pressure assessment weeks",
                },
            ],
        },
    },
    {
        id: "14_exam_cancelled",
        description: "§13.14 — exam-1 cancelled; the exam load, the +2h pre-week bonus and the x0.7 post-week damping all disappear.",
        kind: "scenario",
        input: {
            course: BASE_COURSE,
            current_week_index: 0,
            adjustments: [
                {
                    id: "adj-014",
                    type: "cancel_exam",
                    exam_id: "exam-1",
                    reason: "Replaced by continuous assessment",
                },
            ],
        },
    },
    {
        id: "15_homework_moved",
        description: "§13.15 — homework moved between weeks, plus a reduction and an over-request that partially applies.",
        kind: "scenario",
        input: {
            course: BASE_COURSE,
            current_week_index: 0,
            adjustments: [
                {
                    id: "adj-015a",
                    type: "move_homework",
                    source_week_index: 11,
                    target_week_index: 5,
                    hours: 6,
                    reason: "Reduce the final-week peak",
                },
                {
                    id: "adj-015b",
                    type: "reduce_homework",
                    source_week_index: 10,
                    hours: 2,
                    reason: "Trim the exam week",
                },
                {
                    id: "adj-015c",
                    type: "move_homework",
                    source_week_index: 1,
                    target_week_index: 4,
                    hours: 50,
                    reason: "Over-request: week 2 has far less than 50h available",
                },
            ],
        },
    },
    {
        id: "16_teaching_redistribution",
        description: "§13.16 — lecture and lab cancellation with redistribution into later weeks, recording every flow.",
        kind: "scenario",
        input: {
            course: BASE_COURSE,
            current_week_index: 2,
            adjustments: [
                {
                    id: "adj-016a",
                    type: "cancel_lecture",
                    source_week_index: 4,
                    reason: "Public holiday",
                },
                {
                    id: "adj-016b",
                    type: "cancel_lab",
                    source_week_index: 5,
                    reason: "Laboratory refurbishment",
                },
            ],
        },
    },
    {
        id: "17_invalid_inputs",
        description: "§13.17 — invalid dates, out-of-range and past week indices, negative hours, unknown references and duplicate ids; every one must be reported.",
        kind: "scenario",
        input: {
            course: BASE_COURSE,
            current_week_index: 4,
            adjustments: [
                { id: "bad-01", type: "move_exam", exam_id: "exam-1", new_date: "not-a-date", reason: "invalid date" },
                { id: "bad-02", type: "move_exam", exam_id: "exam-1", new_date: "2027-03-01T09:00:00Z", reason: "outside the semester" },
                { id: "bad-03", type: "reduce_homework", source_week_index: 99, hours: 2, reason: "week out of range" },
                { id: "bad-04", type: "reduce_homework", source_week_index: 1, hours: 2, reason: "week already past" },
                { id: "bad-05", type: "move_homework", source_week_index: 6, target_week_index: 6, hours: 2, reason: "source equals target" },
                { id: "bad-06", type: "reduce_homework", source_week_index: 6, hours: -4, reason: "negative hours" },
                { id: "bad-07", type: "update_assignment", assignment_id: "assignment-9", new_estimated_hours: 5, reason: "unknown assignment" },
                { id: "bad-08", type: "cancel_exam", exam_id: "exam-9", reason: "unknown exam" },
                { id: "bad-09", type: "move_assignment", assignment_id: "assignment-1", new_start_date: "2026-10-20T00:00:00Z", new_end_date: "2026-10-05T00:00:00Z", reason: "start after end" },
                { id: "bad-10", type: "extend_assignment", assignment_id: "assignment-1", new_end_date: "2026-09-07T00:00:00Z", reason: "not later than the current deadline" },
                { id: "bad-11", type: "cancel_lecture", source_week_index: 7, reason: "valid control: this one must apply" },
                { id: "bad-11", type: "cancel_lab", source_week_index: 8, reason: "duplicate id" },
            ] as AdjustmentRequest[],
        },
    },
];

function round(value: unknown): unknown {
    if (typeof value === "number") {
        // Keep well beyond the 1e-6 comparison tolerance.
        return Number(value.toFixed(12));
    }
    if (Array.isArray(value)) return value.map(round);
    if (value && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) out[k] = round(v);
        return out;
    }
    return value;
}

let written = 0;

for (const fixture of modelFixtures) {
    const trajectory = predictTrajectory(fixture.input.weeks);
    const expected = {
        weeks: trajectory.map((w) => ({
            week_index: w.week_index,
            components: w.components,
            observed_stress: w.observed_stress,
            observed_applied: w.observed_applied,
            calibration_bias_in: w.calibration_bias_in,
            calibration_bias_out: w.calibration_bias_out,
            predicted_stress: w.predicted_stress,
        })),
    };
    writeFileSync(
        join(OUT_DIR, `${fixture.id}.json`),
        JSON.stringify(round({ ...fixture, expected }), null, 2) + "\n"
    );
    written++;
}

for (const fixture of scenarioFixtures) {
    const result = simulateScenario(
        {
            course: fixture.input.course,
            current_week_index: fixture.input.current_week_index,
            observed_stress: fixture.input.observed_stress,
            options: { ...PINNED_SPEC_OPTIONS, ...(fixture.input.options ?? {}) },
        },
        fixture.input.adjustments,
        {
            scenario_id: `parity-${fixture.id}`,
            created_at: "2026-08-24T00:00:00.000Z",
            origin: "user",
        }
    );
    const expected = {
        baseline: {
            peak_stress: result.baseline.summary.peak_stress,
            peak_week_number: result.baseline.summary.peak_week_number,
            total_stress: result.baseline.summary.total_stress,
            warning_week_numbers: result.baseline.summary.warning_week_numbers,
            critical_week_numbers: result.baseline.summary.critical_week_numbers,
            predicted_stress: result.baseline.trajectory.map((w) => w.predicted_stress),
        },
        simulation: {
            peak_stress: result.simulation.summary.peak_stress,
            peak_week_number: result.simulation.summary.peak_week_number,
            total_stress: result.simulation.summary.total_stress,
            warning_week_numbers: result.simulation.summary.warning_week_numbers,
            critical_week_numbers: result.simulation.summary.critical_week_numbers,
            predicted_stress: result.simulation.trajectory.map((w) => w.predicted_stress),
            week_schedules: result.simulation.week_schedules.map((w) => ({
                week_number: w.week_number,
                lecture_hours: w.lecture_hours,
                lab_hours: w.lab_hours,
                homework_hours: w.homework_hours,
                assignment_hours: w.assignment_hours,
                exam_hours: w.exam_hours,
            })),
        },
        adjustment_outcomes: result.adjustment_outcomes.map((o) => ({
            adjustment_id: o.adjustment_id,
            type: o.type,
            status: o.status,
            code: o.code,
        })),
        redistribution_flows: result.redistribution_flows.map((f) => ({
            source_week_number: f.source_week_number,
            target_week_number: f.target_week_number,
            hours: f.hours,
            workload_type: f.workload_type,
            target_stress_before: f.target_stress_before,
            target_stress_after: f.target_stress_after,
            impact: f.impact,
        })),
        extensions_applied: result.extensions_applied,
        objective: result.objective,
    };
    const pinnedFixture = {
        ...fixture,
        input: {
            ...fixture.input,
            options: { ...PINNED_SPEC_OPTIONS, ...(fixture.input.options ?? {}) },
        },
    };
    writeFileSync(
        join(OUT_DIR, `${fixture.id}.json`),
        JSON.stringify(round({ ...pinnedFixture, expected }), null, 2) + "\n"
    );
    written++;
}

console.log(`Wrote ${written} parity fixtures to ${OUT_DIR}`);
