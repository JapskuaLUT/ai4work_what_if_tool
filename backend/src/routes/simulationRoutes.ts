import Elysia from "elysia";
import { HTTPException } from "hono/http-exception"; // Keep Hono HTTPException for now, will adjust if Elysia has its own
import { db } from "../db";
import {
    simulation_sets,
    scenarios,
    assignments,
    stress_metrics
} from "../db/schema";
import { eq } from "drizzle-orm";

export const simulationRoutes = new Elysia({ prefix: "/simulations" })
    .post("/", async (c) => {
        const simulationSetData = c.body as any;
        const {
            caseId,
            name,
            kind,
            description,
            scenarios: scenariosData
        } = simulationSetData; // Expect caseId from client

        try {
            await db.transaction(async (tx) => {
                // 1. Insert the main simulation_set using the provided caseId
                await tx.insert(simulation_sets).values({
                    case_id: caseId, // Use case_id from client
                    name,
                    kind,
                    description
                });

                if (scenariosData && scenariosData.length > 0) {
                    // 2. Loop through each scenario to insert it and its children
                    for (const scenarioData of scenariosData) {
                        // Insert the scenario using provided scenarioId and caseId
                        await tx.insert(scenarios).values({
                            ...scenarioData.input,
                            scenario_id: scenarioData.scenarioId, // Use scenarioId from client
                            case_id: caseId // Use caseId from client
                        });

                        // Insert assignments with the correct IDs
                        if (
                            scenarioData.assignments &&
                            scenarioData.assignments.length > 0
                        ) {
                            const assignmentsToInsert =
                                scenarioData.assignments.map((a: any) => ({
                                    assignment_number: a.assignmentNumber,
                                    start_week: a.startWeek,
                                    end_week: a.endWeek,
                                    hours_per_week: a.hoursPerWeek,
                                    scenario_id: scenarioData.scenarioId, // Use scenarioId from client
                                    case_id: caseId // Use caseId from client
                                }));
                            await tx
                                .insert(assignments)
                                .values(assignmentsToInsert);
                        }

                        // Insert stress metrics with the correct IDs
                        if (scenarioData.stressMetrics) {
                            const stressMetricsToInsert = {
                                current_week_average:
                                    scenarioData.stressMetrics
                                        .currentWeekAverage,
                                current_week_maximum:
                                    scenarioData.stressMetrics
                                        .currentWeekMaximum,
                                predicted_next_week_average:
                                    scenarioData.stressMetrics
                                        .predictedNextWeekAverage,
                                predicted_next_week_maximum:
                                    scenarioData.stressMetrics
                                        .predictedNextWeekMaximum,
                                scenario_id: scenarioData.scenarioId, // Use scenarioId from client
                                case_id: caseId // Use caseId from client
                            };
                            await tx
                                .insert(stress_metrics)
                                .values(stressMetricsToInsert);
                        }
                    }
                }
            });

            return new Response(JSON.stringify({ caseId: caseId }), {
                // Return caseId
                status: 201,
                headers: { "Content-Type": "application/json" }
            });
        } catch (error: any) {
            console.error("Failed to save simulation set:", error);
            if (error.code === "23505") {
                // Unique violation
                return new Response(
                    `Simulation set with caseId '${caseId}' already exists.`,
                    { status: 409 }
                );
            }
            return new Response(
                "An error occurred while saving the simulation set.",
                { status: 500 }
            );
        }
    })
    .get("/:caseId", async (c) => {
        // Changed path parameter to caseId
        const { caseId } = c.params;

        try {
            const simulationSet = await db.query.simulation_sets.findFirst({
                where: eq(simulation_sets.case_id, caseId), // Query by case_id
                with: {
                    scenarios: {
                        with: {
                            assignments: true,
                            stress_metrics: true
                        }
                    }
                }
            });

            if (!simulationSet) {
                return new Response("Simulation set not found.", {
                    status: 404
                });
            }

            // The structure from the DB doesn't perfectly match the desired input/output JSON.
            // We need to re-map it to the expected format.
            const response = {
                caseId: simulationSet.case_id, // Map case_id to caseId
                name: simulationSet.name,
                kind: simulationSet.kind,
                description: simulationSet.description,
                createdAt: simulationSet.created_at,
                updatedAt: simulationSet.updated_at,
                scenarios: simulationSet.scenarios.map((s) => {
                    const {
                        assignments,
                        stress_metrics,
                        scenario_id,
                        case_id,
                        created_at,
                        updated_at,
                        ...input
                    } = s; // Destructure new fields
                    return {
                        scenarioId: scenario_id, // Map scenario_id to scenarioId
                        input: {
                            ...input,
                            createdAt: created_at,
                            updatedAt: updated_at
                        },
                        assignments: assignments.map((a) => ({
                            assignmentId: a.assignment_id,
                            scenarioId: a.scenario_id,
                            caseId: a.case_id,
                            assignmentNumber: a.assignment_number,
                            startWeek: a.start_week,
                            endWeek: a.end_week,
                            hoursPerWeek: a.hours_per_week,
                            createdAt: a.created_at
                        })),
                        stressMetrics: stress_metrics[0]
                            ? {
                                  stressMetricId:
                                      stress_metrics[0].stress_metric_id,
                                  scenarioId: stress_metrics[0].scenario_id,
                                  caseId: stress_metrics[0].case_id,
                                  currentWeekAverage: parseFloat(
                                      stress_metrics[0]
                                          .current_week_average as string
                                  ),
                                  currentWeekMaximum: parseFloat(
                                      stress_metrics[0]
                                          .current_week_maximum as string
                                  ),
                                  predictedNextWeekAverage: parseFloat(
                                      stress_metrics[0]
                                          .predicted_next_week_average as string
                                  ),
                                  predictedNextWeekMaximum: parseFloat(
                                      stress_metrics[0]
                                          .predicted_next_week_maximum as string
                                  ),
                                  calculatedAt: stress_metrics[0].calculated_at
                              }
                            : null
                    };
                })
            };

            return new Response(JSON.stringify(response), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } catch (error: any) {
            console.error("Failed to retrieve simulation set:", error);
            return new Response(
                "An error occurred while retrieving the simulation set.",
                { status: 500 }
            );
        }
    });
