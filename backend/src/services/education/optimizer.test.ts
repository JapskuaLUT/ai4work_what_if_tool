// backend/src/services/education/optimizer.test.ts

import { describe, expect, test } from "bun:test";
import type { CourseDefinition } from "../stressModel";
import {
    feasibilityScore,
    generateScenarios,
    rankScenarios,
    STRATEGY_NAMES,
    type ScenarioContext,
} from "./index";

const META = {
    scenario_id: "unused",
    created_at: "2026-08-24T00:00:00.000Z",
};

function course(): CourseDefinition {
    return {
        course_name: "Full-Stack Web Development",
        course_id: "CS-220",
        start_date: "2026-09-01T00:00:00Z",
        end_date: "2026-11-24T00:00:00Z",
        topic_difficulty: 4,
        total_homework_hours: 120,
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
                estimated_hours: 30,
                extensions: [],
            },
        ],
        exams: [{ exam_id: "exam-1", name: "Final", date_time: "2026-11-10T09:00:00Z" }],
    };
}

const context = (overrides: Partial<ScenarioContext> = {}): ScenarioContext => ({
    course: course(),
    current_week_index: 0,
    ...overrides,
});

describe("scenario generation", () => {
    test("produces four scenarios with the expected ids", () => {
        const scenarios = generateScenarios(context(), META);
        expect(scenarios).toHaveLength(4);
        expect(scenarios.map((s) => s.scenario_id)).toEqual([
            "adjustment_1",
            "adjustment_2",
            "adjustment_3",
            "adjustment_4",
        ]);
        for (const s of scenarios) {
            expect(s.name).toBe(STRATEGY_NAMES[s.scenario_id]);
            expect(s.origin).toBe("generated");
        }
    });

    test("every scenario lowers peak stress against the same baseline (§8)", () => {
        const scenarios = generateScenarios(context(), META);
        const baselinePeak = scenarios[0].baseline.summary.peak_stress;
        for (const s of scenarios) {
            expect(s.baseline.summary.peak_stress).toBeCloseTo(baselinePeak, 9);
            expect(s.simulation.summary.peak_stress).toBeLessThan(baselinePeak);
            expect(s.objective.improved).toBe(true);
        }
    });

    test("the more aggressive strategies do at least as well as the minimal one", () => {
        const [minimal, balanced, aggressive] = generateScenarios(context(), META);
        expect(balanced.simulation.summary.peak_stress).toBeLessThanOrEqual(
            minimal.simulation.summary.peak_stress + 1e-9
        );
        expect(aggressive.simulation.summary.peak_stress).toBeLessThanOrEqual(
            balanced.simulation.summary.peak_stress + 1e-9
        );
    });

    test("scenarios carry a full audit trail, not just numbers (§11)", () => {
        const scenarios = generateScenarios(context(), META);
        for (const s of scenarios) {
            expect(s.stress_model_version).toBe("1.0");
            expect(s.adjustments.length).toBeGreaterThan(0);
            expect(s.adjustment_outcomes.length).toBe(s.adjustments.length);
            expect(s.rejected_adjustment_ids).toHaveLength(0);
            expect(s.weekly_results).toHaveLength(12);
        }
    });

    test("generated adjustments are real, replayable requests", () => {
        const scenarios = generateScenarios(context(), META);
        for (const s of scenarios) {
            for (const a of s.adjustments) {
                expect(a.id).toBeTruthy();
                expect(a.type).toBeTruthy();
                expect(a.reason).toBeTruthy();
            }
        }
    });

    test("the extension strategy is dropped when there are no assignments", () => {
        const bare = { ...course(), assignments: [] };
        const scenarios = generateScenarios(context({ course: bare }), META);
        expect(scenarios).toHaveLength(3);
    });

    test("past weeks are never touched", () => {
        const scenarios = generateScenarios(context({ current_week_index: 8 }), META);
        for (const s of scenarios) {
            for (const a of s.adjustments) {
                if ("source_week_index" in a) expect(a.source_week_index).toBeGreaterThanOrEqual(8);
                if ("target_week_index" in a) expect(a.target_week_index).toBeGreaterThanOrEqual(8);
            }
            for (let i = 0; i < 8; i++) {
                expect(s.simulation.week_schedules[i]).toEqual(
                    s.baseline.week_schedules[i]
                );
            }
        }
    });

    test("generation is deterministic", () => {
        const first = JSON.stringify(generateScenarios(context(), META));
        for (let i = 0; i < 3; i++) {
            expect(JSON.stringify(generateScenarios(context(), META))).toBe(first);
        }
    });
});

describe("ranking (§8)", () => {
    test("orders by peak stress first", () => {
        const ranked = rankScenarios(generateScenarios(context(), META));
        for (let i = 1; i < ranked.length; i++) {
            expect(ranked[i].simulation.summary.peak_stress).toBeGreaterThanOrEqual(
                ranked[i - 1].simulation.summary.peak_stress - 1e-9
            );
        }
    });

    test("breaks ties on the fewest changed academic events", () => {
        const scenarios = generateScenarios(context(), META);
        const a = { ...scenarios[0] };
        const b = JSON.parse(JSON.stringify(scenarios[0]));
        b.scenario_id = "b";
        b.objective.changed_event_count = a.objective.changed_event_count + 3;
        const ranked = rankScenarios([b, a]);
        expect(ranked[0].scenario_id).toBe(a.scenario_id);
    });
});

describe("feasibility score", () => {
    const thresholds = { warning: 75, critical: 85 };

    test("stays within 0-100 for every generated scenario", () => {
        for (const s of generateScenarios(context(), META)) {
            const score = feasibilityScore(s, thresholds);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        }
    });

    test("rewards a larger peak reduction", () => {
        const scenarios = generateScenarios(context(), META);
        const weak = JSON.parse(JSON.stringify(scenarios[0]));
        const strong = JSON.parse(JSON.stringify(scenarios[0]));
        strong.simulation.summary.peak_stress =
            weak.simulation.summary.peak_stress - 10;
        expect(feasibilityScore(strong, thresholds)).toBeGreaterThan(
            feasibilityScore(weak, thresholds)
        );
    });

    test("penalises rejected adjustments", () => {
        const base = generateScenarios(context(), META)[0];
        const broken = JSON.parse(JSON.stringify(base));
        broken.rejected_adjustment_ids = ["x", "y"];
        expect(feasibilityScore(broken, thresholds)).toBeLessThan(
            feasibilityScore(base, thresholds)
        );
    });
});
