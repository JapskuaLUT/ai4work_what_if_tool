// backend/src/services/education/simulate.test.ts
//
// Coverage for the §6.4 pipeline: adjustment application, rebuild ordering,
// redistribution and the audit output.

import { beforeEach, describe, expect, test } from "bun:test";
import { buildWeekSchedules, type CourseDefinition } from "../stressModel";
import {
    attachObservedStress,
    simulateScenario,
    validateAdjustmentShape,
    type AdjustmentRequest,
} from "./index";

const META = {
    scenario_id: "scenario-test",
    created_at: "2026-08-24T00:00:00.000Z",
    origin: "user" as const,
};

function baseCourse(): CourseDefinition {
    return {
        course_name: "Full-Stack Web Development",
        course_id: "CS-220",
        start_date: "2026-09-01T00:00:00Z",
        end_date: "2026-11-24T00:00:00Z", // 12 weeks
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
            { exam_id: "exam-1", name: "Final", date_time: "2026-11-10T09:00:00Z" },
        ],
    };
}

const run = (adjustments: AdjustmentRequest[], overrides: Record<string, unknown> = {}) =>
    simulateScenario(
        { course: baseCourse(), current_week_index: 0, ...overrides },
        adjustments,
        META
    );

describe("shape validation (§10, §12.9)", () => {
    test("accepts a well-formed request", () => {
        expect(
            validateAdjustmentShape({
                id: "adj-1",
                type: "move_homework",
                source_week_index: 7,
                target_week_index: 9,
                hours: 2,
                reason: "Reduce the week-eight peak",
            }).valid
        ).toBe(true);
    });

    test("reports every structural problem at once rather than the first", () => {
        const result = validateAdjustmentShape({ type: "move_homework" });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(2);
    });

    test("rejects unknown types, non-objects and bad field types", () => {
        expect(validateAdjustmentShape(null).valid).toBe(false);
        expect(validateAdjustmentShape("nope").valid).toBe(false);
        expect(validateAdjustmentShape({ id: "a", type: "teleport" }).valid).toBe(false);
        expect(
            validateAdjustmentShape({ id: "a", type: "reduce_homework", source_week_index: 1.5, hours: 2 }).valid
        ).toBe(false);
        expect(
            validateAdjustmentShape({ id: "a", type: "move_exam", exam_id: "e", new_date: "banana" }).valid
        ).toBe(false);
    });

    test("update_assignment requires at least one changed field", () => {
        expect(
            validateAdjustmentShape({ id: "a", type: "update_assignment", assignment_id: "x" }).valid
        ).toBe(false);
    });
});

describe("baseline", () => {
    test("an empty adjustment list leaves the simulation identical to the baseline", () => {
        const result = run([]);
        expect(result.simulation.week_schedules).toEqual(result.baseline.week_schedules);
        expect(result.objective.peak_stress_delta).toBe(0);
        expect(result.objective.changed_week_count).toBe(0);
        expect(result.adjustment_outcomes).toEqual([]);
    });

    test("the model version and parameters are always reported (§11)", () => {
        const result = run([]);
        expect(result.stress_model_version).toBe("1.0");
        expect(result.stress_model.name).toBe("course_stress_prediction");
        expect(result.stress_model.fatigue_carry_over).toBe(0.07);
    });

    test("a supplied schedule that disagrees with our rebuild raises a diff warning", () => {
        const supplied = buildWeekSchedules(baseCourse()).weeks;
        supplied[3].homework_hours += 5;
        const result = run([], { supplied_schedule: supplied });
        const mismatch = result.warnings.filter(
            (w) => w.code === "schedule_rebuild_mismatch"
        );
        expect(mismatch).toHaveLength(1);
        expect(mismatch[0].subject).toBe("week_index:3");
        expect(mismatch[0].message).toContain("homework_hours");
    });

    test("a supplied schedule matching our rebuild raises no diff warning", () => {
        const supplied = buildWeekSchedules(baseCourse()).weeks;
        const result = run([], { supplied_schedule: supplied });
        expect(
            result.warnings.filter((w) => w.code === "schedule_rebuild_mismatch")
        ).toHaveLength(0);
    });
});

describe("observed stress mapping (§12.8)", () => {
    let weeks = buildWeekSchedules(baseCourse()).weeks;
    beforeEach(() => {
        weeks = buildWeekSchedules(baseCourse()).weeks;
    });

    test("matches by date containment anywhere inside the week", () => {
        const warnings = attachObservedStress(weeks, [
            { week_start: "2026-09-10T13:45:00Z", value: 40 },
        ]);
        expect(warnings).toHaveLength(0);
        expect(weeks[1].actual_stress).toBe(40);
        expect(weeks[0].actual_stress).toBeNull();
    });

    test("matches by week_index and week_number", () => {
        attachObservedStress(weeks, [
            { week_index: 2, value: 30 },
            { week_number: 5, value: 50 },
        ]);
        expect(weeks[2].actual_stress).toBe(30);
        expect(weeks[4].actual_stress).toBe(50);
    });

    test("an unkeyed observation is a warning, never a positional guess", () => {
        const warnings = attachObservedStress(weeks, [{ value: 42 }]);
        expect(warnings[0].code).toBe("observed_stress_unkeyed");
        expect(weeks[0].actual_stress).toBeNull();
    });

    test("unmatched, invalid and duplicate observations all warn", () => {
        const warnings = attachObservedStress(weeks, [
            { week_index: 99, value: 10 },
            { week_start: "banana", value: 10 },
            { week_index: 0, value: 10 },
            { week_index: 0, value: 20 },
        ]);
        const codes = warnings.map((w) => w.code);
        expect(codes).toContain("observed_stress_unmatched");
        expect(codes).toContain("observed_stress_invalid_date");
        expect(codes).toContain("observed_stress_duplicate");
        expect(weeks[0].actual_stress).toBe(10);
    });

    test("calibration learned from past weeks reaches future weeks (§5.2)", () => {
        const observed = [
            { week_index: 0, value: 60 },
            { week_index: 1, value: 62 },
        ];
        const result = run([], { current_week_index: 2, observed_stress: observed });
        expect(result.baseline.trajectory[0].observed_applied).toBe(true);
        expect(result.baseline.trajectory[2].observed_applied).toBe(false);
        // The bias learned from weeks 1-2 lifts the unobserved week 3.
        expect(result.baseline.trajectory[2].calibration_bias_in).toBeGreaterThan(0);
        expect(result.baseline.trajectory[2].predicted_stress).toBeGreaterThan(
            result.baseline.trajectory[2].components.schedule_only
        );
    });

    test("no observation is invented for a week that has not happened", () => {
        const result = run([], {
            current_week_index: 2,
            observed_stress: [{ week_index: 0, value: 60 }],
        });
        for (let i = 1; i < result.baseline.trajectory.length; i++) {
            expect(result.baseline.trajectory[i].observed_stress).toBeNull();
        }
    });
});

describe("week-level adjustments (§6.1)", () => {
    test("reduce_homework subtracts without going negative", () => {
        const result = run([
            { id: "a", type: "reduce_homework", source_week_index: 11, hours: 5 },
        ]);
        expect(result.adjustment_outcomes[0].status).toBe("applied");
        const before = result.baseline.week_schedules[11].homework_hours;
        expect(result.simulation.week_schedules[11].homework_hours).toBeCloseTo(before - 5, 9);
    });

    test("reduce_homework beyond what the week has applies partially and says so", () => {
        const result = run([
            { id: "a", type: "reduce_homework", source_week_index: 0, hours: 999 },
        ]);
        const outcome = result.adjustment_outcomes[0];
        expect(outcome.status).toBe("partially_applied");
        expect(outcome.code).toBe("insufficient_homework");
        expect(result.simulation.week_schedules[0].homework_hours).toBe(0);
    });

    test("move_homework conserves total homework", () => {
        const result = run([
            { id: "a", type: "move_homework", source_week_index: 11, target_week_index: 2, hours: 6 },
        ]);
        const total = (ws: { homework_hours: number }[]) =>
            ws.reduce((s, w) => s + w.homework_hours, 0);
        expect(total(result.simulation.week_schedules)).toBeCloseTo(
            total(result.baseline.week_schedules),
            9
        );
        expect(result.simulation.week_schedules[2].homework_hours).toBeCloseTo(
            result.baseline.week_schedules[2].homework_hours + 6,
            9
        );
    });

    test("move_homework moves at most what the source week holds", () => {
        const result = run([
            { id: "a", type: "move_homework", source_week_index: 0, target_week_index: 5, hours: 100 },
        ]);
        expect(result.adjustment_outcomes[0].status).toBe("partially_applied");
        expect(result.simulation.week_schedules[0].homework_hours).toBe(0);
    });

    test("cancel_lecture zeroes the week and redistributes into later weeks (§7)", () => {
        const result = run([{ id: "a", type: "cancel_lecture", source_week_index: 3 }]);
        expect(result.adjustment_outcomes[0].status).toBe("applied");
        expect(result.simulation.week_schedules[3].lecture_hours).toBe(0);

        const placed = result.redistribution_flows.reduce((s, f) => s + f.hours, 0);
        expect(placed).toBeCloseTo(4, 9);
        for (const flow of result.redistribution_flows) {
            expect(flow.target_week_index).toBeGreaterThan(3);
            expect(flow.hours).toBeLessThanOrEqual(3);
            expect(flow.workload_type).toBe("lecture_hours");
            expect(flow.impact).toBeCloseTo(
                flow.target_stress_after - flow.target_stress_before,
                9
            );
        }
        // Total teaching hours are conserved by the move.
        const totalLecture = (ws: { lecture_hours: number }[]) =>
            ws.reduce((s, w) => s + w.lecture_hours, 0);
        expect(totalLecture(result.simulation.week_schedules)).toBeCloseTo(
            totalLecture(result.baseline.week_schedules),
            9
        );
    });

    test("cancelling in the last week has nowhere to redistribute and applies partially", () => {
        const result = run([{ id: "a", type: "cancel_lab", source_week_index: 11 }]);
        const outcome = result.adjustment_outcomes[0];
        expect(outcome.status).toBe("partially_applied");
        expect(outcome.code).toBe("partial_redistribution");
        expect(result.redistribution_flows).toHaveLength(0);
    });

    test("cancelling a week with no hours of that kind is rejected", () => {
        const noLabs = { ...baseCourse(), lab_sessions: [] };
        const result = simulateScenario(
            { course: noLabs, current_week_index: 0 },
            [{ id: "a", type: "cancel_lab", source_week_index: 3 }],
            META
        );
        expect(result.adjustment_outcomes[0].status).toBe("rejected");
        expect(result.adjustment_outcomes[0].code).toBe("no_lab_hours");
    });

    test("past weeks are protected by default and reachable when allowed (§8)", () => {
        const adjustment: AdjustmentRequest = {
            id: "a",
            type: "reduce_homework",
            source_week_index: 1,
            hours: 1,
        };
        const blocked = run([adjustment], { current_week_index: 5 });
        expect(blocked.adjustment_outcomes[0].code).toBe("week_in_past");

        const allowed = run([adjustment], {
            current_week_index: 5,
            options: { allow_past_week_changes: true },
        });
        expect(allowed.adjustment_outcomes[0].status).not.toBe("rejected");
    });

    test("redistribution never targets a week before the current one", () => {
        const result = run([{ id: "a", type: "cancel_lecture", source_week_index: 8 }], {
            current_week_index: 6,
        });
        for (const flow of result.redistribution_flows) {
            expect(flow.target_week_index).toBeGreaterThanOrEqual(6);
            expect(flow.target_week_index).toBeGreaterThan(8);
        }
    });

    test("the trajectory_peak objective beats local_week on peak stress here", () => {
        const adjustments: AdjustmentRequest[] = [
            { id: "a", type: "cancel_lecture", source_week_index: 4 },
        ];
        const local = run(adjustments, {
            options: { redistribution_objective: "local_week" },
        });
        const trajectory = run(adjustments, {
            options: { redistribution_objective: "trajectory_peak" },
        });
        expect(trajectory.simulation.summary.peak_stress).toBeLessThanOrEqual(
            local.simulation.summary.peak_stress
        );
        expect(local.known_limitations).toHaveLength(1);
        expect(trajectory.known_limitations).toHaveLength(0);
    });
});

describe("assignment adjustments (§6.2)", () => {
    test("move_assignment redistributes hours over the new span", () => {
        const result = run([
            {
                id: "a",
                type: "move_assignment",
                assignment_id: "assignment-1",
                new_start_date: "2026-10-06T00:00:00Z",
                new_end_date: "2026-11-02T23:59:59Z",
            },
        ]);
        expect(result.adjustment_outcomes[0].status).toBe("applied");
        // Weeks 0-3 held it before; weeks 5-8 hold it now.
        for (let i = 0; i < 4; i++) {
            expect(result.baseline.week_schedules[i].assignment_hours).toBeGreaterThan(0);
        }
        const movedTotal = result.simulation.week_schedules
            .slice(5, 9)
            .reduce((s, w) => s + w.assignment_hours, 0);
        expect(movedTotal).toBeGreaterThan(20);
        const total = result.simulation.week_schedules.reduce(
            (s, w) => s + w.assignment_hours,
            0
        );
        expect(total).toBeCloseTo(45, 9); // 20 + 25, conserved
    });

    test("update_assignment changes estimated hours and rebuilds", () => {
        const result = run([
            {
                id: "a",
                type: "update_assignment",
                assignment_id: "assignment-1",
                new_estimated_hours: 40,
            },
        ]);
        expect(result.adjustment_outcomes[0].status).toBe("applied");
        const total = result.simulation.week_schedules.reduce(
            (s, w) => s + w.assignment_hours,
            0
        );
        expect(total).toBeCloseTo(65, 9); // 40 + 25
    });

    test("extend_assignment records full extension metadata (§6.2)", () => {
        const result = run([
            {
                id: "adj-002",
                type: "extend_assignment",
                assignment_id: "assignment-2",
                new_end_date: "2026-11-09T23:59:59Z",
                reason: "Reduce the predicted critical stress peak",
            },
        ]);
        expect(result.adjustment_outcomes[0].status).toBe("applied");
        expect(result.extensions_applied).toHaveLength(1);

        const ext = result.extensions_applied[0];
        expect(ext.assignment_id).toBe("assignment-2");
        expect(ext.extension_id).toBeTruthy();
        // 2026-10-26 is week 8, 2026-11-09 is week 10 (one-based, like
        // original_end_week).
        expect(ext.original_end_week).toBe(8);
        expect(ext.new_end_week).toBe(10);
        expect(ext.weeks_extended).toBe(2);
        expect(ext.reason).toBe("Reduce the predicted critical stress peak");
        expect(ext.scenario_id).toBe("scenario-test");
        expect(ext.created_at).toBe("2026-08-24T00:00:00.000Z");
        // The extension is also recorded on the assignment itself.
        expect(result.simulation.assignments[1].extensions).toHaveLength(1);
    });

    test("the extension policy caps how many times one assignment can move", () => {
        const course = baseCourse();
        course.assignments[1].extensions = [
            {
                extension_id: "x1",
                new_end_week: 9,
                reason: "earlier",
                weeks_extended: 1,
                scenario_id: "old",
                created_at: "2026-08-01T00:00:00.000Z",
            },
            {
                extension_id: "x2",
                new_end_week: 10,
                reason: "earlier",
                weeks_extended: 1,
                scenario_id: "old",
                created_at: "2026-08-02T00:00:00.000Z",
            },
        ];
        const result = simulateScenario(
            { course, current_week_index: 0, options: { max_extensions_per_assignment: 2 } },
            [
                {
                    id: "a",
                    type: "extend_assignment",
                    assignment_id: "assignment-2",
                    new_end_date: "2026-11-16T23:59:59Z",
                },
            ],
            META
        );
        expect(result.adjustment_outcomes[0].code).toBe("extension_limit_reached");
    });

    test("an extension that is not later than the current deadline is rejected", () => {
        const result = run([
            {
                id: "a",
                type: "extend_assignment",
                assignment_id: "assignment-2",
                new_end_date: "2026-10-05T00:00:00Z",
            },
        ]);
        expect(result.adjustment_outcomes[0].code).toBe("extension_not_later");
    });

    test("out-of-semester and inverted spans are rejected (§8)", () => {
        const outside = run([
            {
                id: "a",
                type: "move_assignment",
                assignment_id: "assignment-1",
                new_start_date: "2027-01-05T00:00:00Z",
                new_end_date: "2027-02-01T00:00:00Z",
            },
        ]);
        expect(outside.adjustment_outcomes[0].code).toBe("date_outside_semester");

        const inverted = run([
            {
                id: "a",
                type: "move_assignment",
                assignment_id: "assignment-1",
                new_start_date: "2026-10-20T00:00:00Z",
                new_end_date: "2026-10-05T00:00:00Z",
            },
        ]);
        expect(inverted.adjustment_outcomes[0].code).toBe("start_after_end");
    });

    test("an unknown assignment is reported, not ignored", () => {
        const result = run([
            { id: "a", type: "update_assignment", assignment_id: "nope", new_estimated_hours: 5 },
        ]);
        expect(result.adjustment_outcomes[0].status).toBe("rejected");
        expect(result.adjustment_outcomes[0].code).toBe("assignment_not_found");
    });
});

describe("exam adjustments (§6.3)", () => {
    test("move_exam relocates the exam load and both neighbour effects (§3.5)", () => {
        const result = run([
            { id: "a", type: "move_exam", exam_id: "exam-1", new_date: "2026-11-17T09:00:00Z" },
        ]);
        expect(result.adjustment_outcomes[0].status).toBe("applied");

        const before = result.baseline.week_schedules;
        const after = result.simulation.week_schedules;

        expect(before[10].exam_hours).toBe(6);
        expect(after[10].exam_hours).toBe(0);
        expect(after[11].exam_hours).toBe(6);
        // The +2h pre-exam bonus moved from week 10 to week 11.
        expect(after[10].homework_hours).toBeGreaterThan(before[10].homework_hours);
        expect(after[9].homework_hours).toBeCloseTo(before[9].homework_hours - 2, 9);
    });

    test("cancel_exam removes the load, the pre-week bonus and the post-week damping", () => {
        const result = run([{ id: "a", type: "cancel_exam", exam_id: "exam-1" }]);
        const before = result.baseline.week_schedules;
        const after = result.simulation.week_schedules;

        expect(after[10].exam_hours).toBe(0);
        expect(after[9].homework_hours).toBeCloseTo(before[9].homework_hours - 2, 9);
        expect(after[11].homework_hours).toBeCloseTo(before[11].homework_hours / 0.7, 9);
        expect(result.simulation.exams).toHaveLength(0);
    });

    test("moving an exam outside the semester is rejected", () => {
        const result = run([
            { id: "a", type: "move_exam", exam_id: "exam-1", new_date: "2027-06-01T09:00:00Z" },
        ]);
        expect(result.adjustment_outcomes[0].code).toBe("date_outside_semester");
    });

    test("an unknown exam is reported", () => {
        const result = run([{ id: "a", type: "cancel_exam", exam_id: "nope" }]);
        expect(result.adjustment_outcomes[0].code).toBe("exam_not_found");
    });
});

describe("pipeline ordering (§6.4)", () => {
    test("a week-level edit survives the rebuild triggered by a domain change", () => {
        const result = run([
            { id: "domain", type: "cancel_exam", exam_id: "exam-1" },
            { id: "week", type: "reduce_homework", source_week_index: 11, hours: 10 },
        ]);
        expect(result.adjustment_outcomes.every((o) => o.status === "applied")).toBe(true);

        // Week 12 is rebuilt without the exam's x0.7 damping, then reduced by 10h.
        const rebuiltWithoutExam = buildWeekSchedules({
            ...baseCourse(),
            exams: [],
        }).weeks[11].homework_hours;
        expect(result.simulation.week_schedules[11].homework_hours).toBeCloseTo(
            rebuiltWithoutExam - 10,
            9
        );
    });

    test("the original course is never mutated — scenarios operate on a clone (§8)", () => {
        const course = baseCourse();
        const snapshot = JSON.stringify(course);
        simulateScenario({ course, current_week_index: 0 }, [
            { id: "a", type: "cancel_exam", exam_id: "exam-1" },
            {
                id: "b",
                type: "extend_assignment",
                assignment_id: "assignment-1",
                new_end_date: "2026-10-12T00:00:00Z",
            },
        ], META);
        expect(JSON.stringify(course)).toBe(snapshot);
    });

    test("weeks changed only by a rebuild are still flagged as adjusted", () => {
        const result = run([{ id: "a", type: "cancel_exam", exam_id: "exam-1" }]);
        expect(result.simulation.week_schedules[9].adjusted).toBe(true);
        expect(result.simulation.week_schedules[10].adjusted).toBe(true);
        expect(result.simulation.week_schedules[11].adjusted).toBe(true);
        expect(result.simulation.week_schedules[0].adjusted).toBe(false);
    });

    test("a duplicate adjustment id is rejected and the first still applies", () => {
        const result = run([
            { id: "dup", type: "reduce_homework", source_week_index: 11, hours: 2 },
            { id: "dup", type: "reduce_homework", source_week_index: 10, hours: 2 },
        ]);
        const statuses = result.adjustment_outcomes.map((o) => o.status);
        expect(statuses).toContain("applied");
        expect(
            result.adjustment_outcomes.find((o) => o.code === "duplicate_adjustment_id")
        ).toBeTruthy();
    });

    test("malformed adjustments are reported rather than dropped (§12.9)", () => {
        const result = run([
            { id: "bad", type: "reduce_homework", source_week_index: 3, hours: -5 } as AdjustmentRequest,
        ]);
        expect(result.adjustment_outcomes).toHaveLength(1);
        expect(result.adjustment_outcomes[0].code).toBe("malformed_adjustment");
        expect(result.adjustment_outcomes[0].message).toContain("greater than zero");
    });

    test("simulation is deterministic for identical inputs (§13)", () => {
        const adjustments: AdjustmentRequest[] = [
            { id: "a", type: "cancel_exam", exam_id: "exam-1" },
            { id: "b", type: "cancel_lecture", source_week_index: 4 },
            { id: "c", type: "move_homework", source_week_index: 11, target_week_index: 3, hours: 5 },
        ];
        const first = JSON.stringify(run(adjustments));
        for (let i = 0; i < 5; i++) {
            expect(JSON.stringify(run(adjustments))).toBe(first);
        }
    });
});

describe("audit output (§11)", () => {
    test("every adjustment appears in exactly one outcome bucket", () => {
        const result = run([
            { id: "ok", type: "cancel_exam", exam_id: "exam-1" },
            { id: "partial", type: "cancel_lab", source_week_index: 11 },
            { id: "no", type: "cancel_exam", exam_id: "missing" },
        ]);
        expect(result.applied_adjustment_ids).toEqual(["ok"]);
        expect(result.partially_applied_adjustment_ids).toEqual(["partial"]);
        expect(result.rejected_adjustment_ids).toEqual(["no"]);
        expect(result.adjustment_outcomes).toHaveLength(3);
    });

    test("weekly results pair baseline and simulation with full components", () => {
        const result = run([{ id: "a", type: "cancel_exam", exam_id: "exam-1" }]);
        expect(result.weekly_results).toHaveLength(12);
        const week = result.weekly_results[10];
        expect(week.week_index).toBe(10);
        expect(week.week_number).toBe(11);
        expect(week.baseline.components.exam).toBeGreaterThan(0);
        expect(week.simulation.components.exam).toBe(0);
        expect(week.stress_delta).toBeCloseTo(
            week.simulation.predicted_stress - week.baseline.predicted_stress,
            9
        );
        expect(week.baseline.classification).toBeTruthy();
    });

    test("objective metrics capture the peak change and the tie-break criteria (§8)", () => {
        const result = run([{ id: "a", type: "cancel_exam", exam_id: "exam-1" }]);
        expect(result.objective.peak_stress_delta).toBeLessThan(0);
        expect(result.objective.improved).toBe(true);
        expect(result.objective.changed_event_count).toBe(1);
        expect(result.objective.changed_week_count).toBeGreaterThan(0);
        expect(result.objective.moved_workload_hours).toBeGreaterThan(0);
    });

    test("summaries report peak, warning and critical weeks against the thresholds", () => {
        const result = run([], {
            options: { stress_threshold_warning: 30, stress_threshold_critical: 40 },
        });
        const s = result.baseline.summary;
        expect(s.peak_stress).toBeGreaterThan(0);
        expect(s.peak_week_number).toBeGreaterThanOrEqual(1);
        expect(s.warning_week_numbers.length).toBeGreaterThan(0);
        expect(s.warning_week_numbers).toEqual(
            expect.arrayContaining(s.critical_week_numbers)
        );
        expect(
            s.band_counts.Low + s.band_counts.Moderate + s.band_counts.High
        ).toBe(12);
    });
});
