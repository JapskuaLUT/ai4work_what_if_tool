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
            name,
            kind,
            description,
            scenarios: scenariosData
        } = simulationSetData;

        // Generate a new UUID for caseId
        const caseId = crypto.randomUUID();

        try {
            await db.transaction(async (tx) => {
                // 1. Insert the main simulation_set using the generated caseId
                await tx.insert(simulation_sets).values({
                    case_id: caseId,
                    name,
                    kind,
                    description
                });

                if (scenariosData && scenariosData.length > 0) {
                    // 2. Loop through each scenario to insert it and its children
                    for (const scenarioData of scenariosData) {
                        // Insert the scenario using provided scenarioId and generated caseId
                        await tx.insert(scenarios).values({
                            scenario_id: scenarioData.scenarioId,
                            case_id: caseId,
                            description: scenarioData.input.description,
                            course_name: scenarioData.input.courseName,
                            course_id: scenarioData.input.courseId,
                            teaching_total_hours:
                                scenarioData.input.teachingTotalHours,
                            teaching_days: scenarioData.input.teachingDays,
                            teaching_time: scenarioData.input.teachingTime,
                            lab_total_hours: scenarioData.input.labTotalHours,
                            lab_days: scenarioData.input.labDays,
                            lab_time: scenarioData.input.labTime,
                            ects: scenarioData.input.ects,
                            topic_difficulty:
                                scenarioData.input.topicDifficulty,
                            prerequisites: scenarioData.input.prerequisites,
                            weekly_homework_hours:
                                scenarioData.input.weeklyHomeworkHours,
                            total_weeks: scenarioData.input.totalWeeks,
                            attendance_method:
                                scenarioData.input.attendanceMethod,
                            success_rate_percent:
                                scenarioData.input.successRatePercent,
                            average_grade: scenarioData.input.averageGrade,
                            student_count: scenarioData.input.studentCount,
                            current_week: scenarioData.input.currentWeek
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
                                    scenario_id: scenarioData.scenarioId,
                                    case_id: caseId
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
                                scenario_id: scenarioData.scenarioId,
                                case_id: caseId
                            };
                            await tx
                                .insert(stress_metrics)
                                .values(stressMetricsToInsert);
                        }
                    }
                }
            });

            return new Response(
                JSON.stringify({
                    caseId: caseId,
                    resultsUrl: `https://app.localhost/results/${caseId}`
                }),
                {
                    status: 201,
                    headers: { "Content-Type": "application/json" }
                }
            );
        } catch (error: any) {
            console.error("Failed to save simulation set:", error);
            // No longer checking for unique violation on caseId from client
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
                        description,
                        course_name,
                        course_id,
                        teaching_total_hours,
                        teaching_days,
                        teaching_time,
                        lab_total_hours,
                        lab_days,
                        lab_time,
                        ects,
                        topic_difficulty,
                        prerequisites,
                        weekly_homework_hours,
                        total_weeks,
                        attendance_method,
                        success_rate_percent,
                        average_grade,
                        student_count,
                        current_week,
                        created_at,
                        updated_at
                    } = s;
                    return {
                        scenarioId: scenario_id,
                        input: {
                            description,
                            courseName: course_name,
                            courseId: course_id,
                            teachingTotalHours: teaching_total_hours,
                            teachingDays: teaching_days,
                            teachingTime: teaching_time,
                            labTotalHours: lab_total_hours,
                            labDays: lab_days,
                            labTime: lab_time,
                            ects,
                            topicDifficulty: topic_difficulty,
                            prerequisites,
                            weeklyHomeworkHours: weekly_homework_hours,
                            totalWeeks: total_weeks,
                            attendanceMethod: attendance_method,
                            successRatePercent: parseFloat(
                                success_rate_percent as string
                            ),
                            averageGrade: parseFloat(average_grade as string),
                            studentCount: student_count,
                            currentWeek: current_week,
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
