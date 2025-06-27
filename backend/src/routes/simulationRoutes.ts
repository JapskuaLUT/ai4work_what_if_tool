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
        const simulationSetData = c.body as any; // Elysia uses c.body for POST data

        // Basic validation
        if (!simulationSetData || !simulationSetData.case_id) {
            return new Response("Invalid simulation set data provided.", {
                status: 400
            });
        }

        const {
            case_id,
            name,
            kind,
            description,
            scenarios: scenariosData
        } = simulationSetData;

        try {
            await db.transaction(async (tx) => {
                // 1. Insert into simulation_sets
                await tx.insert(simulation_sets).values({
                    case_id,
                    name,
                    kind,
                    description
                });

                if (scenariosData && scenariosData.length > 0) {
                    // 2. Insert into scenarios
                    const scenariosToInsert = scenariosData.map((s: any) => ({
                        ...s.input,
                        scenario_id: s.scenario_id,
                        case_id
                    }));
                    await tx.insert(scenarios).values(scenariosToInsert);

                    // 3. Insert into assignments and stress_metrics for each scenario
                    for (const scenario of scenariosData) {
                        if (
                            scenario.assignments &&
                            scenario.assignments.length > 0
                        ) {
                            const assignmentsToInsert =
                                scenario.assignments.map((a: any) => ({
                                    ...a,
                                    scenario_id: scenario.scenario_id,
                                    case_id
                                }));
                            await tx
                                .insert(assignments)
                                .values(assignmentsToInsert);
                        }
                        if (scenario.stress_metrics) {
                            const stressMetricsToInsert = {
                                ...scenario.stress_metrics,
                                scenario_id: scenario.scenario_id,
                                case_id
                            };
                            await tx
                                .insert(stress_metrics)
                                .values(stressMetricsToInsert);
                        }
                    }
                }
            });

            return new Response(JSON.stringify({ case_id: case_id }), {
                status: 201,
                headers: { "Content-Type": "application/json" }
            });
        } catch (error: any) {
            console.error("Failed to save simulation set:", error);
            if (error.code === "23505") {
                // Unique violation
                return new Response(
                    `Simulation set with case_id '${case_id}' already exists.`,
                    { status: 409 }
                );
            }
            return new Response(
                "An error occurred while saving the simulation set.",
                { status: 500 }
            );
        }
    })
    .get("/:case_id", async (c) => {
        const { case_id } = c.params; // Elysia uses c.params for path parameters

        try {
            const simulationSet = await db.query.simulation_sets.findFirst({
                where: eq(simulation_sets.case_id, case_id),
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
                ...simulationSet,
                scenarios: simulationSet.scenarios.map((s) => {
                    const { assignments, stress_metrics, ...input } = s;
                    return {
                        scenario_id: s.scenario_id,
                        input: input,
                        assignments: assignments,
                        stress_metrics: stress_metrics[0] || null // Assuming one-to-one for stress metrics per scenario
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
