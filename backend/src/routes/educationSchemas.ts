// backend/src/routes/educationSchemas.ts
//
// TypeBox schemas for the course_stress_prediction v1.0 API surface.
//
// A note on the adjustment schema: it is deliberately permissive. §12.9
// requires that "invalid adjustment parameters must produce warnings" — an
// auditable per-adjustment outcome, not a blanket 422 that tells the caller
// nothing about which of their twelve adjustments was wrong. So transport
// validation only checks that each entry has an id and a known type; the
// per-field rules live in validateAdjustmentShape() and surface as
// `rejected` outcomes with a machine-readable code.

import { t } from "elysia";

export const SessionSchema = t.Object({
    day: t.String({ examples: ["Monday"] }),
    start_time: t.String({ description: "HH:MM", examples: ["09:00"] }),
    end_time: t.String({ description: "HH:MM", examples: ["11:00"] }),
});

export const AssignmentExtensionSchema = t.Object({
    extension_id: t.String(),
    new_end_week: t.Number({ description: "One-based week number of the new deadline" }),
    reason: t.String(),
    weeks_extended: t.Number(),
    scenario_id: t.Nullable(t.String()),
    created_at: t.String({ description: "ISO 8601 timestamp" }),
});

export const CourseAssignmentSchema = t.Object({
    assignment_id: t.String({ examples: ["assignment-1"] }),
    name: t.String({ examples: ["Project report"] }),
    start_date: t.String({ examples: ["2026-10-01T00:00:00Z"] }),
    end_date: t.String({ examples: ["2026-10-28T23:59:59Z"] }),
    estimated_hours: t.Number({ examples: [20] }),
    extensions: t.Optional(t.Array(AssignmentExtensionSchema)),
});

export const CourseExamSchema = t.Object({
    exam_id: t.String({ examples: ["exam-1"] }),
    name: t.String({ examples: ["Final examination"] }),
    date_time: t.String({ examples: ["2027-01-20T09:00:00Z"] }),
});

export const CourseDefinitionSchema = t.Object(
    {
        course_name: t.String({ examples: ["Full-Stack Web Development"] }),
        course_id: t.String({ examples: ["CS-220"] }),
        start_date: t.String({ description: "Semester start (ISO 8601)", examples: ["2026-09-01T00:00:00Z"] }),
        end_date: t.String({ description: "Semester end (ISO 8601)", examples: ["2026-11-24T00:00:00Z"] }),
        topic_difficulty: t.Number({ description: "1-5; drives exam load E_w = 2d", minimum: 1, maximum: 5, examples: [3] }),
        total_homework_hours: t.Number({ description: "Total semester homework, spread by the §3.3 right-skewed weights", examples: [100] }),
        course_sessions: t.Array(SessionSchema, { description: "Recurring lectures" }),
        lab_sessions: t.Array(SessionSchema, { description: "Recurring laboratories" }),
        assignments: t.Array(CourseAssignmentSchema),
        exams: t.Array(CourseExamSchema),
    },
    { description: "Everything §3 needs to build the weekly schedule" }
);

export const WeekScheduleV1Schema = t.Object({
    week_index: t.Number({ description: "Zero-based, canonical", examples: [0] }),
    week_number: t.Number({ description: "One-based, for display", examples: [1] }),
    week_start: t.String({ examples: ["2026-09-01T00:00:00Z"] }),
    week_end: t.String({ examples: ["2026-09-07T00:00:00Z"] }),
    adjusted: t.Boolean({ examples: [false] }),
    lecture_hours: t.Number({ examples: [3.0] }),
    lab_hours: t.Number({ examples: [2.0] }),
    homework_hours: t.Number({ examples: [4.2] }),
    assignment_hours: t.Number({ examples: [1.8] }),
    exam_hours: t.Number({ examples: [0.0] }),
    actual_stress: t.Nullable(t.Number({ examples: [null] })),
    adjustment_details: t.Optional(t.Array(t.String())),
});

export const ObservedStressSchema = t.Object(
    {
        week_start: t.Optional(t.String({ description: "Any timestamp inside the week; matched by containment" })),
        week_index: t.Optional(t.Number({ description: "Zero-based week" })),
        week_number: t.Optional(t.Number({ description: "One-based week" })),
        value: t.Number({ description: "O_w. Non-positive values are treated as unavailable (§5).", examples: [62.5] }),
    },
    {
        description:
            "An observed weekly stress reading. Supply at least one of week_start / week_index / week_number — observations are never matched by array position (§12.8).",
    }
);

export const SimulationOptionsSchema = t.Object({
    redistribution_objective: t.Optional(
        t.Union([t.Literal("local_week"), t.Literal("trajectory_peak")], {
            description:
                "§7. `local_week` (default) scores each candidate week in isolation, matching the main application. `trajectory_peak` recomputes the whole semester and minimises peak stress, which is correct under fatigue carry-over.",
        })
    ),
    max_extensions_per_assignment: t.Optional(t.Number({ examples: [2] })),
    stress_threshold_warning: t.Optional(t.Number({ examples: [75] })),
    stress_threshold_critical: t.Optional(t.Number({ examples: [85] })),
    allow_past_week_changes: t.Optional(
        t.Boolean({ description: "Default false: week-level edits and redistribution targets must be in the future (§8).", examples: [false] })
    ),
});

export const AdjustmentRequestSchema = t.Object(
    {
        id: t.String({ description: "Stable identifier, unique within the request", examples: ["adj-001"] }),
        type: t.Union(
            [
                t.Literal("cancel_lecture"),
                t.Literal("cancel_lab"),
                t.Literal("reduce_homework"),
                t.Literal("move_homework"),
                t.Literal("move_assignment"),
                t.Literal("update_assignment"),
                t.Literal("extend_assignment"),
                t.Literal("move_exam"),
                t.Literal("cancel_exam"),
            ],
            { description: "Adjustment kind; determines which other fields are required" }
        ),
        reason: t.Optional(t.String({ examples: ["Avoid overlap with the midterm examination"] })),

        source_week_index: t.Optional(t.Number({ description: "cancel_lecture, cancel_lab, reduce_homework, move_homework" })),
        target_week_index: t.Optional(t.Number({ description: "move_homework" })),
        hours: t.Optional(t.Number({ description: "reduce_homework, move_homework" })),

        assignment_id: t.Optional(t.String({ description: "move_assignment, update_assignment, extend_assignment" })),
        new_start_date: t.Optional(t.String({ description: "move_assignment (required), update_assignment (optional)" })),
        new_end_date: t.Optional(t.String({ description: "move_assignment, update_assignment, extend_assignment" })),
        new_estimated_hours: t.Optional(t.Number({ description: "update_assignment" })),

        exam_id: t.Optional(t.String({ description: "move_exam, cancel_exam" })),
        new_date: t.Optional(t.String({ description: "move_exam" })),
    },
    {
        description:
            "One adjustment request (§10). Required fields depend on `type`; anything missing or malformed comes back as a `rejected` outcome with a code, never as a silent failure (§12.9).",
    }
);

export const StressModelConfigSchema = t.Object({
    name: t.String({ examples: ["course_stress_prediction"] }),
    version: t.String({ examples: ["1.0"] }),
    minimum_stress: t.Number({ examples: [0.0] }),
    maximum_stress: t.Number({ examples: [90.0] }),
    actual_stress_blend: t.Number({ examples: [0.45] }),
    calibration_learning_rate: t.Number({ examples: [0.25] }),
    maximum_calibration_bias: t.Number({ examples: [12.0] }),
    fatigue_carry_over: t.Number({ examples: [0.07] }),
    soft_cap_softness: t.Number({ examples: [0.82] }),
});

/** §9 — the v1 creation payload. */
export const EducationV1CreateSchema = t.Object({
    name: t.String({ examples: ["Web Development - Spring 2026"] }),
    description: t.Optional(t.String()),
    course: CourseDefinitionSchema,
    week_schedules: t.Optional(
        t.Array(WeekScheduleV1Schema, {
            description:
                "Optional. When the main application has already built the schedule we take it as the baseline and diff it against our own rebuild, reporting any week that disagrees beyond 1e-6.",
        })
    ),
    observed_stress: t.Optional(t.Array(ObservedStressSchema)),
    current_status: t.Object({
        current_week_index: t.Optional(t.Number({ description: "Zero-based", examples: [3] })),
        current_week_number: t.Optional(t.Number({ description: "One-based", examples: [4] })),
    }),
    optimization_request: t.Optional(
        t.Object({
            optimization_target: t.Optional(t.String({ examples: ["minimize_peak_stress"] })),
            stress_threshold_warning: t.Optional(t.Number({ examples: [75] })),
            stress_threshold_critical: t.Optional(t.Number({ examples: [85] })),
            allow_extensions: t.Optional(t.Boolean({ examples: [true] })),
            max_extensions_per_assignment: t.Optional(t.Number({ examples: [2] })),
            consider_all_remaining_weeks: t.Optional(t.Boolean({ examples: [true] })),
            redistribution_objective: t.Optional(
                t.Union([t.Literal("local_week"), t.Literal("trajectory_peak")])
            ),
            allow_past_week_changes: t.Optional(t.Boolean()),
        })
    ),
    students: t.Optional(t.Object({ count: t.Number({ examples: [60] }) })),
    metadata: t.Optional(
        t.Object({
            created_at: t.Optional(t.String()),
            creator_id: t.Optional(t.String()),
            semester_id: t.Optional(t.String()),
        })
    ),
});

/** §10 — the body of POST /:caseId/scenarios. */
export const ScenarioCreateSchema = t.Object({
    name: t.Optional(t.String({ examples: ["Move the exam off week 11"] })),
    description: t.Optional(t.String()),
    adjustments: t.Array(AdjustmentRequestSchema, {
        description: "Applied in the §6.4 order: domain changes, rebuild, then week-level changes.",
    }),
    options: t.Optional(SimulationOptionsSchema),
});
