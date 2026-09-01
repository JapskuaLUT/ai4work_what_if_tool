// backend/src/routes/educationStressV1Routes.ts
//
// The course_stress_prediction v1.0 endpoints:
//
//   GET  /stress-model                  the versioned constants
//   POST /stress-model/evaluate         parity harness — weeks in, components out
//   POST /:caseId/scenarios             apply adjustments, get the §11 comparison
//   GET  /:caseId/scenarios             list scenarios on a case
//   GET  /:caseId/scenarios/:scenarioId read one back
//
// These are registered ahead of educationalStressRoutes so the static
// `/stress-model` path is never captured by its `/:caseId` route.

import Elysia, { t } from "elysia";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { adjustment_scenarios, educational_simulations } from "../db/schema";
import {
    classifyStress,
    COURSE_MODEL_THRESHOLDS,
    COURSE_STRESS_MODEL_V1,
    predictTrajectory,
    SCHEDULE_ONLY_STRESS_CEILING,
    STRESS_BANDS,
    type CourseDefinition,
} from "../services/stressModel";
import {
    simulateScenario,
    type AdjustmentRequest,
    type ObservedStressEntry,
    type ScenarioResult,
    type SimulationOptions,
} from "../services/education";
import {
    AdjustmentRequestSchema,
    ObservedStressSchema,
    ScenarioCreateSchema,
    SimulationOptionsSchema,
    StressModelConfigSchema,
} from "./educationSchemas";

/**
 * Reconstruct the CourseDefinition a v1 case was stored with. The course is
 * kept in `course_info`, with assignments and exams mirrored into their own
 * columns so they can be queried directly.
 */
export function courseFromRow(row: {
    course_info: unknown;
    course_assignments: unknown;
    course_exams: unknown;
}): CourseDefinition {
    const base = (row.course_info ?? {}) as CourseDefinition;
    return {
        ...base,
        assignments: (row.course_assignments as CourseDefinition["assignments"]) ?? base.assignments ?? [],
        exams: (row.course_exams as CourseDefinition["exams"]) ?? base.exams ?? [],
    };
}

/** True when a stored case was computed with v1.0 rather than the old calculator. */
export function isV1Case(row: { stress_model: unknown }): boolean {
    const model = row.stress_model as { version?: string } | null;
    return Boolean(model?.version) && model!.version !== "legacy-0";
}

/** Anything that can insert — the db handle or a transaction. */
type Inserter = Pick<typeof db, "insert">;

/**
 * Persist a scenario. `week_schedules` carries the simulated schedule so the
 * existing readers keep working; the audit columns carry everything §11 asks
 * to be returned.
 */
export async function persistScenario(
    caseId: string,
    result: ScenarioResult,
    tx: Inserter = db
) {
    await tx
        .insert(adjustment_scenarios)
        .values({
            case_id: caseId,
            adjustment_id: result.scenario_id,
            origin: result.origin,
            name: result.name,
            description: result.description,
            week_schedules: result.simulation.week_schedules,
            assignment_weeks: result.simulation.assignments,
            extensions_applied: result.extensions_applied,
            summary_metrics: {
                peak_stress: result.simulation.summary.peak_stress,
                peak_week_number: result.simulation.summary.peak_week_number,
                average_stress: result.simulation.summary.average_stress,
                total_adjustments_made: result.applied_adjustment_ids.length,
                extensions_used: result.extensions_applied.length,
                hours_redistributed: result.redistribution_flows.length > 0,
                total_hours_maintained: true,
            },
            adjustments: result.adjustments,
            adjustment_outcomes: result.adjustment_outcomes,
            redistribution_flows: result.redistribution_flows,
            comparison: {
                baseline: result.baseline.summary,
                simulation: result.simulation.summary,
                objective: result.objective,
                weekly_results: result.weekly_results,
                known_limitations: result.known_limitations,
                redistribution_objective: result.redistribution_objective,
                current_week_index: result.current_week_index,
            },
            warnings: result.warnings,
            stress_model_version: result.stress_model_version,
        })
        .onConflictDoUpdate({
            target: [adjustment_scenarios.case_id, adjustment_scenarios.adjustment_id],
            set: {
                origin: result.origin,
                name: result.name,
                description: result.description,
                week_schedules: result.simulation.week_schedules,
                assignment_weeks: result.simulation.assignments,
                extensions_applied: result.extensions_applied,
                adjustments: result.adjustments,
                adjustment_outcomes: result.adjustment_outcomes,
                redistribution_flows: result.redistribution_flows,
                warnings: result.warnings,
                stress_model_version: result.stress_model_version,
            },
        });
}

export const educationStressV1Routes = new Elysia({
    prefix: "/simulations/education",
})
    /**
     * GET /api/simulations/education/stress-model
     */
    .get(
        "/stress-model",
        () => ({
            stress_model: COURSE_STRESS_MODEL_V1,
            /**
             * decisions.md §1: the model's output is the course's additive
             * contribution on top of an unobserved personal baseline
             * (~25–40), so there are two threshold scales and they must not
             * be confused.
             */
            interpretation: {
                output_is:
                    "The course's estimated additive contribution to a student's stress, not the student's complete stress level.",
                personal_baseline_range: { min: 25, max: 40 },
                schedule_only_ceiling: SCHEDULE_ONLY_STRESS_CEILING,
            },
            thresholds: {
                course_model: {
                    warning: COURSE_MODEL_THRESHOLDS.warning,
                    critical: COURSE_MODEL_THRESHOLDS.critical,
                    note: "Calibrated to this model's own output range; the tool's display and reporting defaults.",
                },
                total_stress: {
                    warning: STRESS_BANDS.warning,
                    critical: STRESS_BANDS.critical,
                    note: "The specification's 75/85, which apply to baseline + course. Not reachable by schedule-only output.",
                },
            },
            classification_bands: {
                low: { min: 0, max: STRESS_BANDS.low_max },
                moderate: { min: STRESS_BANDS.low_max, max: STRESS_BANDS.moderate_max },
                high: { min: STRESS_BANDS.moderate_max, max: COURSE_STRESS_MODEL_V1.maximum_stress },
            },
            components: {
                base: { start: 5, end: 30, max: 34 },
                teaching: { start: 3, end: 14, max: 10 },
                homework: { start: 2, end: 16, max: 12 },
                assignment: { start: 1, end: 14, max: 18 },
                exam: { floor: 12, slope: 2.5, cap: 18, max: 30 },
                overload: { threshold: 32, coefficient: 1.3, exponent: 1.15, cap: 14 },
            },
            schedule_build: {
                skew_exponent: 2.5,
                exam_load_per_difficulty: 2,
                pre_exam_homework_bonus: 2,
                post_exam_homework_factor: 0.7,
                build_order: [
                    "lectures and labs into every week (§3.2)",
                    "homework across the semester (§3.3)",
                    "assignment hours across each active span (§3.4)",
                    "exams in chronological order, each applying exam-week load, pre-week bonus and post-week damping before the next (§3.5)",
                ],
            },
        }),
        {
            response: {
                200: t.Object({
                    stress_model: StressModelConfigSchema,
                    interpretation: t.Any(),
                    thresholds: t.Any(),
                    classification_bands: t.Any(),
                    components: t.Any(),
                    schedule_build: t.Any(),
                }),
            },
            detail: {
                summary: "Read the versioned stress-model configuration",
                description:
                    "Returns the exact constants, component thresholds and schedule-construction order this service uses. The main AI4Work education application should assert against this at boot so the two systems cannot silently drift apart (§9).",
                tags: ["Educational Stress"],
            },
        }
    )

    /**
     * POST /api/simulations/education/stress-model/evaluate
     */
    .post(
        "/stress-model/evaluate",
        ({ body }) => {
            const { weeks, use_observed_stress } = body as {
                weeks: Array<Record<string, number | null>>;
                use_observed_stress?: boolean;
            };

            const trajectory = predictTrajectory(weeks, {
                useObservedStress: use_observed_stress !== false,
            });

            return {
                stress_model: COURSE_STRESS_MODEL_V1,
                weeks: trajectory.map((w) => ({
                    week_index: w.week_index,
                    week_number: w.week_index + 1,
                    components: w.components,
                    observed_stress: w.observed_stress,
                    observed_applied: w.observed_applied,
                    calibration_bias_in: w.calibration_bias_in,
                    calibration_bias_out: w.calibration_bias_out,
                    predicted_stress: w.predicted_stress,
                    classification: classifyStress(w.predicted_stress),
                })),
            };
        },
        {
            body: t.Object({
                weeks: t.Array(
                    t.Object({
                        lecture_hours: t.Optional(t.Number({ examples: [3] })),
                        lab_hours: t.Optional(t.Number({ examples: [2] })),
                        homework_hours: t.Optional(t.Number({ examples: [8] })),
                        assignment_hours: t.Optional(t.Number({ examples: [3] })),
                        exam_hours: t.Optional(t.Number({ examples: [0] })),
                        actual_stress: t.Optional(t.Nullable(t.Number({ examples: [null] }))),
                    }),
                    { description: "Weeks in semester order. Order matters: fatigue reads the previous week's final stress." }
                ),
                use_observed_stress: t.Optional(
                    t.Boolean({
                        description: "Set false to isolate the schedule-only model (§4) with no blending or calibration.",
                        examples: [true],
                    })
                ),
            }),
            detail: {
                summary: "Evaluate the stress model directly (parity harness)",
                description:
                    "Runs a week series through course_stress_prediction and returns every intermediate component — P^base, P^teach, P^home, P^assign, P^exam, P^over, P^fatigue, R, S-hat and S — plus the calibration bias in and out. Nothing is persisted. This is the endpoint §13 asks for: run the same fixtures against both systems and diff every component, not just final stress.",
                tags: ["Educational Stress"],
            },
        }
    )

    /**
     * POST /api/simulations/education/:caseId/scenarios
     */
    .post(
        "/:caseId/scenarios",
        async ({ params, body, set }) => {
            const { caseId } = params;
            const input = body as {
                name?: string;
                description?: string;
                adjustments: AdjustmentRequest[];
                options?: Partial<SimulationOptions>;
            };

            try {
                const simulation = await db.query.educational_simulations.findFirst({
                    where: eq(educational_simulations.case_id, caseId),
                });
                if (!simulation) {
                    set.status = 404;
                    return { error: "Simulation not found" };
                }
                if (!isV1Case(simulation)) {
                    set.status = 409;
                    return {
                        error: "This case predates the course_stress_prediction v1.0 model",
                        message:
                            "It was computed with the legacy calculator and has no assignment, exam or date information, so adjustments cannot be simulated against it. Create a new case with the v1 payload.",
                    };
                }

                const course = courseFromRow(simulation);
                const stored = (simulation.optimization_request ?? {}) as Record<string, unknown>;
                const currentStatus = (simulation.current_status ?? {}) as Record<string, number>;

                const scenarioId = `scenario-${crypto.randomUUID()}`;
                const createdAt = new Date().toISOString();

                const result = simulateScenario(
                    {
                        course,
                        supplied_schedule: (simulation.baseline_schedule as never) ?? null,
                        verify_supplied_schedule:
                            stored.verify_supplied_schedule !== false,
                        observed_stress: (simulation.observed_stress as ObservedStressEntry[]) ?? [],
                        current_week_index: currentStatus.current_week_index ?? 0,
                        options: {
                            stress_threshold_warning:
                                (stored.stress_threshold_warning as number) ??
                                COURSE_MODEL_THRESHOLDS.warning,
                            stress_threshold_critical:
                                (stored.stress_threshold_critical as number) ??
                                COURSE_MODEL_THRESHOLDS.critical,
                            max_extensions_per_assignment:
                                (stored.max_extensions_per_assignment as number) ?? 2,
                            ...(input.options ?? {}),
                        },
                    },
                    input.adjustments ?? [],
                    {
                        scenario_id: scenarioId,
                        created_at: createdAt,
                        name: input.name,
                        description: input.description,
                        origin: "user",
                    }
                );

                await persistScenario(caseId, result);

                set.status = 201;
                return result;
            } catch (error: any) {
                console.error("Failed to simulate scenario:", error);
                set.status = 500;
                return {
                    error: "An error occurred while simulating the scenario.",
                    message: error.message,
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            body: ScenarioCreateSchema,
            detail: {
                summary: "Simulate a what-if scenario against a case",
                description:
                    "Applies an adjustment list in the §6.4 order — clone, domain changes, rebuild, week-level changes, sequential recalculation, comparison — and returns the full §11 audit: baseline and simulated schedules and trajectories, every applied/partially-applied/rejected adjustment with a reason, redistribution flows, extension records, peak and warning/critical weeks before and after, the objective improvement, and the model version and parameters. The scenario is persisted and can be read back from GET /:caseId/scenarios/:scenarioId.",
                tags: ["Educational Stress"],
            },
        }
    )

    /**
     * GET /api/simulations/education/:caseId/scenarios
     */
    .get(
        "/:caseId/scenarios",
        async ({ params, query, set }) => {
            const { caseId } = params;
            try {
                const rows = await db.query.adjustment_scenarios.findMany({
                    where: eq(adjustment_scenarios.case_id, caseId),
                });
                const filtered = query.origin
                    ? rows.filter((r) => r.origin === query.origin)
                    : rows;

                return {
                    caseId,
                    scenarios: filtered.map((r) => ({
                        scenario_id: r.adjustment_id,
                        origin: r.origin,
                        name: r.name,
                        description: r.description,
                        stress_model_version: r.stress_model_version,
                        summary_metrics: r.summary_metrics,
                        comparison: r.comparison,
                        created_at: r.created_at,
                    })),
                };
            } catch (error: any) {
                console.error("Failed to list scenarios:", error);
                set.status = 500;
                return { error: "An error occurred while listing scenarios.", message: error.message };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            query: t.Object({
                origin: t.Optional(
                    t.Union([t.Literal("generated"), t.Literal("user")], {
                        description: "Filter to engine-generated or user-authored scenarios",
                    })
                ),
            }),
            detail: {
                summary: "List every scenario on a case",
                tags: ["Educational Stress"],
            },
        }
    )

    /**
     * GET /api/simulations/education/:caseId/scenarios/:scenarioId
     */
    .get(
        "/:caseId/scenarios/:scenarioId",
        async ({ params, set }) => {
            const { caseId, scenarioId } = params;
            try {
                const row = await db.query.adjustment_scenarios.findFirst({
                    where: and(
                        eq(adjustment_scenarios.case_id, caseId),
                        eq(adjustment_scenarios.adjustment_id, scenarioId)
                    ),
                });
                if (!row) {
                    set.status = 404;
                    return { error: "Scenario not found" };
                }
                return {
                    scenario_id: row.adjustment_id,
                    origin: row.origin,
                    name: row.name,
                    description: row.description,
                    stress_model_version: row.stress_model_version,
                    week_schedules: row.week_schedules,
                    assignments: row.assignment_weeks,
                    extensions_applied: row.extensions_applied,
                    adjustments: row.adjustments,
                    adjustment_outcomes: row.adjustment_outcomes,
                    redistribution_flows: row.redistribution_flows,
                    comparison: row.comparison,
                    warnings: row.warnings,
                    summary_metrics: row.summary_metrics,
                    created_at: row.created_at,
                };
            } catch (error: any) {
                console.error("Failed to read scenario:", error);
                set.status = 500;
                return { error: "An error occurred while reading the scenario.", message: error.message };
            }
        },
        {
            params: t.Object({ caseId: t.String(), scenarioId: t.String() }),
            detail: {
                summary: "Read one scenario with its full audit trail",
                tags: ["Educational Stress"],
            },
        }
    );

export { AdjustmentRequestSchema, ObservedStressSchema, SimulationOptionsSchema };
