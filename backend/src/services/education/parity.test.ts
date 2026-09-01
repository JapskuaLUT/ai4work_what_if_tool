// backend/src/services/education/parity.test.ts
//
// §13 — runs every fixture in specifications/education_stress/parity and
// compares every intermediate component, not just final stress, at 1e-6.
//
// The same fixture files are what the main AI4Work education application
// should run against. A failure here means this repository's implementation
// drifted from the frozen expectations; a *disagreement between the two
// systems* shows up as the main application failing these same files.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { predictTrajectory } from "../stressModel";
import { simulateScenario } from "./index";

const PARITY_DIR = join(
    import.meta.dir,
    "../../../../specifications/education_stress/parity"
);

/** §13 — "compare every weekly output within a small tolerance". */
const TOLERANCE = 1e-6;

const fixtureFiles = readdirSync(PARITY_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

function load(file: string) {
    return JSON.parse(readFileSync(join(PARITY_DIR, file), "utf-8"));
}

/** Deep numeric comparison at the §13 tolerance, with a path in the message. */
function expectDeepClose(actual: unknown, expected: unknown, path = "") {
    if (typeof expected === "number") {
        if (typeof actual !== "number") {
            throw new Error(`${path}: expected a number, got ${typeof actual}`);
        }
        const delta = Math.abs(actual - expected);
        if (!(delta < TOLERANCE)) {
            throw new Error(
                `${path}: |${actual} - ${expected}| = ${delta} exceeds ${TOLERANCE}`
            );
        }
        return;
    }
    if (Array.isArray(expected)) {
        expect(Array.isArray(actual)).toBe(true);
        const a = actual as unknown[];
        if (a.length !== expected.length) {
            throw new Error(
                `${path}: expected ${expected.length} entries, got ${a.length}`
            );
        }
        expected.forEach((v, i) => expectDeepClose(a[i], v, `${path}[${i}]`));
        return;
    }
    if (expected && typeof expected === "object") {
        const a = (actual ?? {}) as Record<string, unknown>;
        for (const [k, v] of Object.entries(expected)) {
            expectDeepClose(a[k], v, path ? `${path}.${k}` : k);
        }
        return;
    }
    if (actual !== expected) {
        throw new Error(`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

describe("§13 parity fixtures", () => {
    test("all eighteen fixtures are present", () => {
        expect(fixtureFiles).toHaveLength(18);
    });

    for (const file of fixtureFiles) {
        const fixture = load(file);

        test(`${fixture.id} — ${fixture.description}`, () => {
            if (fixture.kind === "model") {
                const trajectory = predictTrajectory(fixture.input.weeks);
                const actual = {
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
                expectDeepClose(actual, fixture.expected);
                return;
            }

            const result = simulateScenario(
                {
                    course: fixture.input.course,
                    current_week_index: fixture.input.current_week_index,
                    observed_stress: fixture.input.observed_stress,
                    options: fixture.input.options,
                },
                fixture.input.adjustments,
                {
                    scenario_id: `parity-${fixture.id}`,
                    created_at: "2026-08-24T00:00:00.000Z",
                    origin: "user",
                }
            );

            const actual = {
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

            expectDeepClose(actual, fixture.expected);
        });
    }

    test("every §13 minimum test has a fixture", () => {
        const covered = new Set(fixtureFiles.map((f) => Number(f.slice(0, 2))));
        for (let i = 1; i <= 18; i++) {
            expect(covered.has(i)).toBe(true);
        }
    });

    test("model fixtures cover each component reaching its maximum", () => {
        const maxima = { base: 34, teaching: 10, homework: 12, assignment: 18, exam: 30, overload: 14 };
        const seen = new Set<string>();
        for (const file of fixtureFiles) {
            const fixture = load(file);
            if (fixture.kind !== "model") continue;
            for (const week of fixture.expected.weeks) {
                for (const [name, max] of Object.entries(maxima)) {
                    if (Math.abs(week.components[name] - max) < TOLERANCE) seen.add(name);
                }
            }
        }
        expect([...seen].sort()).toEqual(Object.keys(maxima).sort());
    });
});
