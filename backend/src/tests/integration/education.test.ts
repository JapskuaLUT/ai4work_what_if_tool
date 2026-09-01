// backend/src/tests/integration/education.test.ts
//
// End-to-end happy-path coverage for /api/simulations/education/*. Uses
// specifications/examples/education/01_create_simulation.json as the
// request body so the same fixture serves as both API documentation and
// regression data.
//
// The whole block is skipped if the backend isn't reachable; this keeps
// `bun test` green when the dev stack isn't running.

import { describe, test, expect, beforeAll } from "bun:test";
import {
    APP_URL,
    apiFetch,
    backendReachable,
    loadExample
} from "./_helpers";

const reachable = await backendReachable();

describe.skipIf(!reachable)("education API — happy path", () => {
    let caseId = "";

    beforeAll(async () => {
        const body = loadExample("education", "01_create_simulation.json");
        const res = await apiFetch("/api/simulations/education/", {
            method: "POST",
            body: JSON.stringify(body)
        });
        expect(res.status).toBe(201);
        const data = (await res.json()) as {
            caseId: string;
            resultsUrl: string;
        };
        expect(data.caseId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
        expect(data.resultsUrl).toBe(`${APP_URL}/education/${data.caseId}`);
        caseId = data.caseId;
    });

    test("GET /:caseId returns four generated adjustments", async () => {
        const res = await apiFetch(`/api/simulations/education/${caseId}`);
        expect(res.status).toBe(200);
        const data = (await res.json()) as { week_schedules: any[] };
        const ids = data.week_schedules.map((s) => s.adjustment_id).sort();
        // adjustment_4 only appears when extensions are allowed (they are in
        // the example body), so we always expect four.
        expect(ids).toEqual([
            "adjustment_1",
            "adjustment_2",
            "adjustment_3",
            "adjustment_4"
        ]);
    });

    test("GET /:caseId/:adjustmentId returns scenario detail with score", async () => {
        const res = await apiFetch(
            `/api/simulations/education/${caseId}/adjustment_2`
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            adjustment_id: string;
            feasibility_score: number;
            key_changes: string;
            week_schedules: any[];
        };
        expect(data.adjustment_id).toBe("adjustment_2");
        expect(typeof data.feasibility_score).toBe("number");
        expect(typeof data.key_changes).toBe("string");
        expect(data.week_schedules.length).toBeGreaterThan(0);
    });

    test("PUT /:caseId/select stores a selection", async () => {
        const sel = loadExample("education", "02_select_adjustment.json");
        const res = await apiFetch(
            `/api/simulations/education/${caseId}/select`,
            { method: "PUT", body: JSON.stringify(sel) }
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            success: boolean;
            selectedAdjustmentId: string;
        };
        expect(data.success).toBe(true);
        expect(data.selectedAdjustmentId).toBe("adjustment_2");
    });

    test("GET /:caseId/selection mirrors the stored selection", async () => {
        const res = await apiFetch(
            `/api/simulations/education/${caseId}/selection`
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            hasSelection: boolean;
            selectedAdjustmentId: string | null;
        };
        expect(data.hasSelection).toBe(true);
        expect(data.selectedAdjustmentId).toBe("adjustment_2");
    });

    test("GET unknown caseId returns 404", async () => {
        const res = await apiFetch(
            "/api/simulations/education/no-such-case-uuid"
        );
        expect(res.status).toBe(404);
    });
});

// ---------------------------------------------------------------------------
// course_stress_prediction v1.0
// ---------------------------------------------------------------------------

describe.skipIf(!reachable)("education stress model API — happy path", () => {
    test("GET /stress-model returns the versioned constants", async () => {
        const res = await apiFetch("/api/simulations/education/stress-model");
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.stress_model).toEqual({
            name: "course_stress_prediction",
            version: "1.0",
            minimum_stress: 0,
            maximum_stress: 90,
            actual_stress_blend: 0.45,
            calibration_learning_rate: 0.25,
            maximum_calibration_bias: 12,
            fatigue_carry_over: 0.07,
            soft_cap_softness: 0.82
        });
        // Two threshold scales, per the model owners' decision
        // (specifications/education_stress/decisions.md §1): the spec's 75/85
        // are total-stress values; the tool displays and defaults to the
        // course-model calibration.
        expect(data.thresholds.total_stress.warning).toBe(75);
        expect(data.thresholds.total_stress.critical).toBe(85);
        expect(data.thresholds.course_model.warning).toBe(45);
        expect(data.thresholds.course_model.critical).toBe(55);
        expect(data.interpretation.schedule_only_ceiling).toBeCloseTo(60.448, 2);
        expect(data.classification_bands.high.min).toBe(66);
        expect(data.components.exam.max).toBe(30);
        expect(data.schedule_build.build_order).toHaveLength(4);
    });

    test("POST /stress-model/evaluate returns every intermediate component", async () => {
        const res = await apiFetch(
            "/api/simulations/education/stress-model/evaluate",
            {
                method: "POST",
                body: JSON.stringify({
                    weeks: [
                        {
                            lecture_hours: 3,
                            lab_hours: 2,
                            homework_hours: 8,
                            assignment_hours: 3,
                            exam_hours: 0
                        },
                        {
                            lecture_hours: 3,
                            lab_hours: 2,
                            homework_hours: 10,
                            assignment_hours: 8,
                            exam_hours: 6
                        }
                    ]
                })
            }
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.weeks).toHaveLength(2);

        const first = data.weeks[0];
        // Hand-computed from §4.3: BL(16; 5, 30, 34) = 34 * 11/25.
        expect(first.components.base).toBeCloseTo(14.96, 9);
        expect(first.components.teaching).toBeCloseTo(10 * (2 / 11), 9);
        expect(first.components.fatigue).toBe(0);
        expect(first.classification).toBe("Low");

        // Week two picks up 7% of week one's final stress.
        expect(data.weeks[1].components.fatigue).toBeCloseTo(
            0.07 * first.predicted_stress,
            9
        );
        // Any non-zero exam load clears the 12-point floor.
        expect(data.weeks[1].components.exam).toBeCloseTo(27, 9);

        for (const key of [
            "base",
            "teaching",
            "homework",
            "assignment",
            "exam",
            "overload",
            "fatigue",
            "raw",
            "soft_capped",
            "schedule_only"
        ]) {
            expect(typeof first.components[key]).toBe("number");
        }
    });

    test("evaluate blends observed stress and carries the learned bias", async () => {
        const week = {
            lecture_hours: 4,
            lab_hours: 2,
            homework_hours: 6,
            assignment_hours: 2,
            exam_hours: 0
        };
        const res = await apiFetch(
            "/api/simulations/education/stress-model/evaluate",
            {
                method: "POST",
                body: JSON.stringify({
                    weeks: [{ ...week, actual_stress: 70 }, { ...week }]
                })
            }
        );
        const data = (await res.json()) as any;
        expect(data.weeks[0].observed_applied).toBe(true);
        expect(data.weeks[0].predicted_stress).toBeCloseTo(
            0.45 * 70 + 0.55 * data.weeks[0].components.schedule_only,
            9
        );
        expect(data.weeks[1].observed_applied).toBe(false);
        expect(data.weeks[1].calibration_bias_in).toBeCloseTo(
            data.weeks[0].calibration_bias_out,
            9
        );
    });
});

describe.skipIf(!reachable)("education v1 scenarios — happy path", () => {
    let v1CaseId = "";

    beforeAll(async () => {
        const body = loadExample("education", "03_create_simulation_v1.json");
        const res = await apiFetch("/api/simulations/education/", {
            method: "POST",
            body: JSON.stringify(body)
        });
        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(data.stress_model_version).toBe("1.0");
        // A clean v1 payload needs no up-conversion, matches our rebuild, and
        // (leaving thresholds unset) gets the course-model defaults rather
        // than the unreachable total-stress values.
        expect(data.warnings).toEqual([]);
        expect(data.baseline.warning_week_numbers.length).toBeGreaterThan(0);
        expect(data.scenario_ids.length).toBeGreaterThanOrEqual(3);
        expect(data.baseline.peak_stress).toBeGreaterThan(0);
        v1CaseId = data.caseId;
    });

    test("the legacy payload is still accepted, with warnings naming what was lost", async () => {
        const body = loadExample("education", "01_create_simulation.json");
        const res = await apiFetch("/api/simulations/education/", {
            method: "POST",
            body: JSON.stringify(body)
        });
        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        const codes = data.warnings.map((w: any) => w.code);
        expect(codes).toContain("legacy_payload_upconverted");
        expect(codes).toContain("assignment_hours_unavailable");
        expect(codes).toContain("exam_hours_unavailable");
        // The legacy example passes the spec's 75/85, which are total-stress
        // values the model cannot reach — the response says so.
        expect(codes).toContain("thresholds_exceed_model_range");
    });

    test("GET /:caseId exposes the model version and domain objects", async () => {
        const res = await apiFetch(`/api/simulations/education/${v1CaseId}`);
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.stress_model.version).toBe("1.0");
        expect(data.course_assignments).toHaveLength(2);
        expect(data.course_exams).toHaveLength(1);
        expect(data.baseline_schedule).toHaveLength(12);
        expect(data.baseline_schedule[0]).toHaveProperty("assignment_hours");
        expect(data.baseline_schedule[0]).toHaveProperty("exam_hours");
        expect(data.baseline_schedule[0]).toHaveProperty("week_index");
        expect(data.baseline_schedule[0]).toHaveProperty("week_number");
    });

    test("generated scenarios carry a full audit trail", async () => {
        const res = await apiFetch(
            `/api/simulations/education/${v1CaseId}/scenarios?origin=generated`
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.scenarios.length).toBeGreaterThanOrEqual(3);
        for (const s of data.scenarios) {
            expect(s.stress_model_version).toBe("1.0");
            expect(s.comparison.baseline.peak_stress).toBeGreaterThan(0);
            expect(s.comparison.objective).toHaveProperty("peak_stress_delta");
        }
    });

    test("POST /:caseId/scenarios applies adjustments and returns the §11 comparison", async () => {
        const body = loadExample("education", "04_create_scenario.json");
        const res = await apiFetch(
            `/api/simulations/education/${v1CaseId}/scenarios`,
            { method: "POST", body: JSON.stringify(body) }
        );
        expect(res.status).toBe(201);
        const data = (await res.json()) as any;

        expect(data.stress_model_version).toBe("1.0");
        expect(data.origin).toBe("user");
        expect(data.applied_adjustment_ids).toHaveLength(4);
        expect(data.rejected_adjustment_ids).toHaveLength(0);
        expect(data.adjustment_outcomes).toHaveLength(4);
        expect(data.extensions_applied).toHaveLength(1);
        expect(data.extensions_applied[0].scenario_id).toBe(data.scenario_id);
        expect(data.redistribution_flows.length).toBeGreaterThan(0);
        expect(data.weekly_results).toHaveLength(12);

        // The exam moved from week 11 to week 12.
        expect(data.baseline.week_schedules[10].exam_hours).toBeGreaterThan(0);
        expect(data.simulation.week_schedules[11].exam_hours).toBeGreaterThan(0);

        // trajectory_peak was requested, so no local-rule caveat is reported.
        expect(data.redistribution_objective).toBe("trajectory_peak");
        expect(data.known_limitations).toHaveLength(0);

        const readBack = await apiFetch(
            `/api/simulations/education/${v1CaseId}/scenarios/${data.scenario_id}`
        );
        expect(readBack.status).toBe(200);
        const stored = (await readBack.json()) as any;
        expect(stored.adjustment_outcomes).toHaveLength(4);
        expect(stored.origin).toBe("user");
    });

    test("invalid adjustments are reported individually, never silently (§12.9)", async () => {
        const res = await apiFetch(
            `/api/simulations/education/${v1CaseId}/scenarios`,
            {
                method: "POST",
                body: JSON.stringify({
                    name: "Deliberately broken",
                    adjustments: [
                        {
                            id: "bad-1",
                            type: "move_exam",
                            exam_id: "exam-1",
                            new_date: "not-a-date"
                        },
                        {
                            id: "bad-2",
                            type: "cancel_exam",
                            exam_id: "does-not-exist"
                        },
                        {
                            id: "bad-3",
                            type: "reduce_homework",
                            source_week_index: 999,
                            hours: 2
                        },
                        {
                            id: "good-1",
                            type: "reduce_homework",
                            source_week_index: 11,
                            hours: 2
                        }
                    ]
                })
            }
        );
        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(data.rejected_adjustment_ids.sort()).toEqual([
            "bad-1",
            "bad-2",
            "bad-3"
        ]);
        expect(data.applied_adjustment_ids).toEqual(["good-1"]);

        const codes = Object.fromEntries(
            data.adjustment_outcomes.map((o: any) => [o.adjustment_id, o.code])
        );
        expect(codes["bad-1"]).toBe("malformed_adjustment");
        expect(codes["bad-2"]).toBe("exam_not_found");
        expect(codes["bad-3"]).toBe("week_out_of_range");
        for (const o of data.adjustment_outcomes) {
            expect(o.message.length).toBeGreaterThan(0);
        }
    });

    test("an empty adjustment list reproduces the baseline exactly", async () => {
        const res = await apiFetch(
            `/api/simulations/education/${v1CaseId}/scenarios`,
            { method: "POST", body: JSON.stringify({ name: "No-op", adjustments: [] }) }
        );
        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(data.simulation.summary.peak_stress).toBeCloseTo(
            data.baseline.summary.peak_stress,
            9
        );
        expect(data.objective.changed_week_count).toBe(0);
    });

    test("an up-converted legacy case accepts adjustments but says they do nothing", async () => {
        const legacy = loadExample("education", "01_create_simulation.json");
        const created = await apiFetch("/api/simulations/education/", {
            method: "POST",
            body: JSON.stringify(legacy)
        });
        const { caseId } = (await created.json()) as any;

        // A legacy payload has no dates, so the up-converter anchors the
        // semester on metadata.created_at. Read the assignments back rather
        // than hard-coding dates that depend on that anchor.
        const caseRes = await apiFetch(`/api/simulations/education/${caseId}`);
        const caseData = (await caseRes.json()) as any;
        const [first, second] = caseData.course_assignments;
        expect(first.estimated_hours).toBe(0);

        // The legacy body is up-converted, so it *is* a v1 case and accepts
        // scenarios — but assignment hours are unavailable, and the engine
        // says so rather than reporting a silent no-op. Move assignment-1 into
        // assignment-2's span, which is guaranteed to be inside the semester.
        const res = await apiFetch(
            `/api/simulations/education/${caseId}/scenarios`,
            {
                method: "POST",
                body: JSON.stringify({
                    adjustments: [
                        {
                            id: "a",
                            type: "move_assignment",
                            assignment_id: first.assignment_id,
                            new_start_date: second.start_date,
                            new_end_date: second.end_date
                        }
                    ]
                })
            }
        );
        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(data.applied_adjustment_ids).toEqual(["a"]);
        // ...but the legacy payload folded assignment work into homework, so
        // this assignment carries 0 estimated hours. The move therefore shifts
        // no stress, and the engine says so rather than presenting a
        // successful no-op.
        expect(data.warnings.map((w: any) => w.code)).toContain(
            "assignment_has_no_hours"
        );
        expect(data.objective.changed_week_count).toBe(0);
        // And the rebuild diff stays quiet: an up-converted schedule cannot
        // match a rebuild, so warning about it every week would be noise.
        expect(data.warnings.map((w: any) => w.code)).not.toContain(
            "schedule_rebuild_mismatch"
        );
    });

    test("404 for an unknown case and an unknown scenario", async () => {
        const missingCase = await apiFetch(
            "/api/simulations/education/00000000-0000-0000-0000-000000000000/scenarios",
            { method: "POST", body: JSON.stringify({ adjustments: [] }) }
        );
        expect(missingCase.status).toBe(404);

        const missingScenario = await apiFetch(
            `/api/simulations/education/${v1CaseId}/scenarios/does-not-exist`
        );
        expect(missingScenario.status).toBe(404);
    });
});
