import Elysia, { t } from "elysia";
import { HTTPException } from "hono/http-exception"; // Keep Hono HTTPException for now, will adjust if Elysia has its own
import { db } from "../db";
import {
    simulation_sets,
    scenarios,
    assignments,
    stress_metrics
} from "../db/schema";
import { eq } from "drizzle-orm";

// Define reusable schemas for Swagger documentation
const AssignmentSchema = t.Object({
    assignmentNumber: t.Number(),
    startWeek: t.Optional(t.Number()),
    endWeek: t.Number(),
    hoursPerWeek: t.Optional(t.Number())
});

const StressMetricsSchema = t.Object({
    currentWeekAverage: t.Number(),
    currentWeekMaximum: t.Number(),
    predictedNextWeekAverage: t.Number(),
    predictedNextWeekMaximum: t.Number()
});

const ScenarioInputSchema = t.Object({
    description: t.Optional(t.String()),
    courseName: t.String(),
    courseId: t.Optional(t.String()),
    teachingTotalHours: t.Number(),
    teachingDays: t.Array(t.String()),
    teachingTime: t.String(),
    labTotalHours: t.Number(),
    labDays: t.Array(t.String()),
    labTime: t.String(),
    ects: t.Number(),
    topicDifficulty: t.Number(),
    prerequisites: t.Boolean(),
    weeklyHomeworkHours: t.Number(),
    totalWeeks: t.Number(),
    attendanceMethod: t.String(),
    successRatePercent: t.Number(),
    averageGrade: t.Number(),
    studentCount: t.Number(),
    currentWeek: t.Number()
});

const ScenarioSchema = t.Object({
    scenarioId: t.Number(),
    input: ScenarioInputSchema,
    assignments: t.Array(AssignmentSchema),
    stressMetrics: t.Optional(StressMetricsSchema)
});

const SimulationSetSchema = t.Object(
    {
        name: t.String(),
        kind: t.Optional(t.String()),
        description: t.Optional(t.String()),
        scenarios: t.Array(ScenarioSchema)
    },
    {
        examples: {
            example1: {
                summary: "Example Simulation Set",
                value: {
                    name: "My First Simulation",
                    kind: "Standard",
                    description:
                        "A comprehensive simulation set for course planning.",
                    scenarios: [
                        {
                            scenarioId: 1,
                            input: {
                                description:
                                    "Detailed scenario for a new course offering.",
                                courseName: "Advanced Quantum Mechanics",
                                courseId: "AQM501",
                                teachingTotalHours: 60,
                                teachingDays: ["Monday", "Wednesday", "Friday"],
                                teachingTime: "09:00-11:00",
                                labTotalHours: 30,
                                labDays: ["Tuesday", "Thursday"],
                                labTime: "13:00-16:00",
                                ects: 10,
                                topicDifficulty: 5,
                                prerequisites: true,
                                weeklyHomeworkHours: 8,
                                totalWeeks: 12,
                                attendanceMethod: "Hybrid",
                                successRatePercent: 75.0,
                                averageGrade: 3.5,
                                studentCount: 45,
                                currentWeek: 1
                            },
                            assignments: [
                                {
                                    assignmentNumber: 1,
                                    startWeek: 3,
                                    endWeek: 5,
                                    hoursPerWeek: 4
                                },
                                {
                                    assignmentNumber: 2,
                                    startWeek: 7,
                                    endWeek: 9,
                                    hoursPerWeek: 5
                                }
                            ],
                            stressMetrics: {
                                currentWeekAverage: 0.6,
                                currentWeekMaximum: 0.8,
                                predictedNextWeekAverage: 0.65,
                                predictedNextWeekMaximum: 0.85
                            }
                        },
                        {
                            scenarioId: 2,
                            input: {
                                description:
                                    "Alternative scenario for a smaller class size.",
                                courseName: "Introduction to Astrophysics",
                                courseId: "AST101",
                                teachingTotalHours: 45,
                                teachingDays: ["Tuesday", "Thursday"],
                                teachingTime: "10:00-12:30",
                                labTotalHours: 15,
                                labDays: ["Friday"],
                                labTime: "09:00-11:00",
                                ects: 7,
                                topicDifficulty: 2,
                                prerequisites: false,
                                weeklyHomeworkHours: 4,
                                totalWeeks: 10,
                                attendanceMethod: "In-person",
                                successRatePercent: 90.0,
                                averageGrade: 4.2,
                                studentCount: 20,
                                currentWeek: 1
                            },
                            assignments: [
                                {
                                    assignmentNumber: 1,
                                    startWeek: 4,
                                    endWeek: 6,
                                    hoursPerWeek: 3
                                }
                            ],
                            stressMetrics: {
                                currentWeekAverage: 0.5,
                                currentWeekMaximum: 0.7,
                                predictedNextWeekAverage: 0.55,
                                predictedNextWeekMaximum: 0.75
                            }
                        }
                    ]
                }
            }
        }
    }
);

const SimulationSetResponseSchema = t.Object({
    caseId: t.String(),
    resultsUrl: t.String()
});

const AssignmentResponseSchema = t.Object({
    assignmentId: t.Number(),
    scenarioId: t.Number(),
    caseId: t.String(),
    assignmentNumber: t.Number(),
    startWeek: t.Optional(t.Number()),
    endWeek: t.Number(),
    hoursPerWeek: t.Optional(t.Number()),
    createdAt: t.String({ format: "date-time" })
});

const StressMetricsResponseSchema = t.Object({
    stressMetricId: t.Number(),
    scenarioId: t.Number(),
    caseId: t.String(),
    currentWeekAverage: t.Number(),
    currentWeekMaximum: t.Number(),
    predictedNextWeekAverage: t.Number(),
    predictedNextWeekMaximum: t.Number(),
    calculatedAt: t.String({ format: "date-time" })
});

const ScenarioFullResponseSchema = t.Object({
    scenarioId: t.Number(),
    input: t.Object({
        description: t.Optional(t.String()),
        courseName: t.String(),
        courseId: t.Optional(t.String()),
        teachingTotalHours: t.Number(),
        teachingDays: t.Array(t.String()),
        teachingTime: t.String(),
        labTotalHours: t.Number(),
        labDays: t.Array(t.String()),
        labTime: t.String(),
        ects: t.Number(),
        topicDifficulty: t.Number(),
        prerequisites: t.Boolean(),
        weeklyHomeworkHours: t.Number(),
        totalWeeks: t.Number(),
        attendanceMethod: t.String(),
        successRatePercent: t.Number(),
        averageGrade: t.Number(),
        studentCount: t.Number(),
        currentWeek: t.Number(),
        createdAt: t.String({ format: "date-time" }),
        updatedAt: t.String({ format: "date-time" })
    }),
    assignments: t.Array(AssignmentResponseSchema),
    stressMetrics: t.Optional(StressMetricsResponseSchema)
});

const SimulationSetFullResponseSchema = t.Object({
    caseId: t.String(),
    name: t.String(),
    kind: t.Optional(t.String()),
    description: t.Optional(t.String()),
    createdAt: t.String({ format: "date-time" }),
    updatedAt: t.String({ format: "date-time" }),
    scenarios: t.Array(ScenarioFullResponseSchema)
});

export const simulationRoutes = new Elysia({ prefix: "/simulations" })
    .post(
        "/",
        async (c) => {
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
                                lab_total_hours:
                                    scenarioData.input.labTotalHours,
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
        },
        {
            body: SimulationSetSchema, // Moved body to top-level
            detail: {
                summary: "Create a new simulation set",
                description:
                    "Creates a new simulation set with multiple scenarios, assignments, and stress metrics.",
                tags: ["Simulations"],
                responses: {
                    201: {
                        description: "Simulation set created successfully",
                        content: {
                            "application/json": {
                                schema: SimulationSetResponseSchema.schema,
                                examples: {
                                    success: {
                                        value: {
                                            caseId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                                            resultsUrl:
                                                "https://app.localhost/results/a1b2c3d4-e5f6-7890-1234-567890abcdef"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    500: {
                        description: "Internal Server Error"
                    }
                }
            }
        }
    )
    .get(
        "/:caseId",
        async (c) => {
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
                                averageGrade: parseFloat(
                                    average_grade as string
                                ),
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
                                      calculatedAt:
                                          stress_metrics[0].calculated_at
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
        },
        {
            detail: {
                summary: "Retrieve a simulation set by case ID",
                description:
                    "Fetches a complete simulation set, including all associated scenarios, assignments, and stress metrics, using its unique case ID.",
                tags: ["Simulations"],
                params: t.Object({
                    caseId: t.String({
                        description:
                            "The unique identifier of the simulation set."
                    })
                }),
                responses: {
                    200: {
                        description: "Simulation set retrieved successfully",
                        content: {
                            "application/json": {
                                schema: SimulationSetFullResponseSchema.schema,
                                examples: {
                                    success: {
                                        value: {
                                            caseId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                                            name: "Example Simulation",
                                            kind: "Stress Test",
                                            description:
                                                "A sample simulation for documentation.",
                                            createdAt: "2023-10-27T10:00:00Z",
                                            updatedAt: "2023-10-27T10:00:00Z",
                                            scenarios: [
                                                {
                                                    scenarioId: 1,
                                                    input: {
                                                        description:
                                                            "Scenario 1 for course A",
                                                        courseName: "Course A",
                                                        courseId: "CA101",
                                                        teachingTotalHours: 40,
                                                        teachingDays: [
                                                            "Monday",
                                                            "Wednesday"
                                                        ],
                                                        teachingTime:
                                                            "10:00-12:00",
                                                        labTotalHours: 20,
                                                        labDays: ["Tuesday"],
                                                        labTime: "14:00-16:00",
                                                        ects: 5,
                                                        topicDifficulty: 3,
                                                        prerequisites: true,
                                                        weeklyHomeworkHours: 5,
                                                        totalWeeks: 10,
                                                        attendanceMethod:
                                                            "Online",
                                                        successRatePercent: 85.5,
                                                        averageGrade: 4.0,
                                                        studentCount: 50,
                                                        currentWeek: 5,
                                                        createdAt:
                                                            "2023-10-27T10:00:00Z",
                                                        updatedAt:
                                                            "2023-10-27T10:00:00Z"
                                                    },
                                                    assignments: [
                                                        {
                                                            assignmentId: 101,
                                                            scenarioId: 1,
                                                            caseId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                                                            assignmentNumber: 1,
                                                            startWeek: 2,
                                                            endWeek: 4,
                                                            hoursPerWeek: 3,
                                                            createdAt:
                                                                "2023-10-27T10:00:00Z"
                                                        }
                                                    ],
                                                    stressMetrics: {
                                                        stressMetricId: 201,
                                                        scenarioId: 1,
                                                        caseId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                                                        currentWeekAverage: 0.75,
                                                        currentWeekMaximum: 0.9,
                                                        predictedNextWeekAverage: 0.8,
                                                        predictedNextWeekMaximum: 0.95,
                                                        calculatedAt:
                                                            "2023-10-27T10:00:00Z"
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    },
                    404: {
                        description: "Simulation set not found."
                    },
                    500: {
                        description: "Internal Server Error"
                    }
                }
            }
        }
    );
