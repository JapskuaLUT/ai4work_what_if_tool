// backend/src/routes/educationalStressRoutes.ts

import Elysia, { t } from "elysia";
import { db } from "../db";
import {
    educational_simulations,
    adjustment_scenarios,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import { StressCalculator } from "../services/stressCalculation";
import { CourseOptimizationEngine } from "../services/optimizationEngine";
import type { CourseAnalysisInput } from "../types/educationalStress";

/**
 * Helper function to get key changes description for an adjustment
 */
function getKeyChanges(adjustmentId: string): string {
    const changes: Record<string, string> = {
        adjustment_1: "Targeted homework reductions on critical weeks",
        adjustment_2: "Balanced hour redistribution + stress smoothing",
        adjustment_3: "Aggressive homework reductions + strategic redistribution",
        adjustment_4: "Assignment extensions + moderate redistribution",
    };
    return changes[adjustmentId] || "Custom optimization strategy";
}

/**
 * Helper function to calculate stress reduction percentage
 */
function calculateStressReduction(weekSchedules: any[]): number {
    const adjustedWeeks = weekSchedules.filter((w: any) => w.adjusted);
    if (adjustedWeeks.length === 0) return 0;

    let totalReduction = 0;
    adjustedWeeks.forEach((week: any) => {
        if (week.optimization_changes) {
            const originalHours = week.optimization_changes.original_homework_hours;
            const newHours = week.homework_hours;
            const reduction = originalHours - newHours;
            totalReduction += (reduction / originalHours) * 100;
        }
    });

    return Math.round((totalReduction / adjustedWeeks.length) * 10) / 10;
}

/**
 * Calculate feasibility score based on optimization results
 * Score reflects how well the optimization achieved its goals (0-100)
 *
 * Factors considered:
 * - Average stress relative to warning threshold
 * - Peak stress relative to critical threshold
 * - Number of weeks still exceeding critical threshold
 * - Overall stress reduction achieved
 */
function calculateFeasibilityScore(
    weekSchedules: any[],
    thresholds: { warning: number; critical: number }
): number {
    if (weekSchedules.length === 0) return 0;

    // Calculate key metrics
    const avgStress =
        weekSchedules.reduce(
            (sum: number, w: any) => sum + (w.stress_metrics?.average_stress || 0),
            0
        ) / weekSchedules.length;

    const peakStress = Math.max(
        ...weekSchedules.map((w: any) => w.stress_metrics?.maximum_stress || 0)
    );

    const weeksAboveCritical = weekSchedules.filter(
        (w: any) => (w.stress_metrics?.average_stress || 0) > thresholds.critical
    ).length;

    const weeksAboveWarning = weekSchedules.filter(
        (w: any) =>
            (w.stress_metrics?.average_stress || 0) > thresholds.warning &&
            (w.stress_metrics?.average_stress || 0) <= thresholds.critical
    ).length;

    // Start with perfect score
    let score = 100;

    // Deduct points for average stress above warning threshold
    // The further above warning, the more points deducted
    if (avgStress > thresholds.warning) {
        const excessStress = avgStress - thresholds.warning;
        score -= excessStress * 0.8; // -0.8 points per stress point over warning
    }

    // Deduct points for peak stress above critical threshold
    // Peak stress is very important - deduct heavily
    if (peakStress > thresholds.critical) {
        const excessPeak = peakStress - thresholds.critical;
        score -= excessPeak * 1.0; // -1.0 points per stress point over critical
    }

    // Deduct points for weeks still above critical
    // Each week above critical is a failure point
    score -= weeksAboveCritical * 8;

    // Small deduction for weeks above warning (but below critical)
    score -= weeksAboveWarning * 2;

    // Bonus points if average stress is well below warning threshold
    if (avgStress < thresholds.warning * 0.8) {
        const margin = thresholds.warning * 0.8 - avgStress;
        score += margin * 0.3; // Bonus for comfortable margin
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

/**
 * Educational Stress API Routes
 * Endpoints for creating and retrieving educational stress simulations
 */
export const educationalStressRoutes = new Elysia({ prefix: "/simulations/education" })

    /**
     * POST /api/simulations/education/
     * Create a new educational stress simulation
     */
    .post(
        "/",
        async ({ body }) => {
            const input = body as CourseAnalysisInput;

            // Generate a new UUID for caseId
            const caseId = crypto.randomUUID();

            try {
                // Generate optimization scenarios
                const optimizer = new CourseOptimizationEngine();
                const scenarios = optimizer.generateOptimizationScenarios(input);

                await db.transaction(async (tx) => {
                    // 1. Insert the main educational simulation
                    await tx.insert(educational_simulations).values({
                        case_id: caseId,
                        name: input.name,
                        description: input.description,
                        course_info: input.course_info,
                        assignment_weeks: input.assignment_weeks,
                        current_status: input.current_status,
                        optimization_request: input.optimization_request,
                        students: input.students,
                        metadata: input.metadata,
                    });

                    // 2. Insert all generated adjustment scenarios
                    for (const scenario of scenarios) {
                        // Calculate summary metrics
                        const summary = optimizer.calculateAdjustmentSummary(scenario);

                        await tx.insert(adjustment_scenarios).values({
                            case_id: caseId,
                            adjustment_id: scenario.adjustment_id,
                            week_schedules: scenario.week_schedules,
                            assignment_weeks: scenario.assignment_weeks || null,
                            extensions_applied: scenario.extensions_applied || null,
                            summary_metrics: summary,
                        });
                    }
                });

                return new Response(
                    JSON.stringify({
                        caseId: caseId,
                        resultsUrl: `${
                            process.env.APP_BASE_URL || "http://localhost"
                        }/education/${caseId}`,
                    }),
                    {
                        status: 201,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            } catch (error: any) {
                console.error("Failed to save educational simulation:", error);
                return new Response(
                    JSON.stringify({
                        error: "An error occurred while saving the simulation.",
                        message: error.message,
                    }),
                    {
                        status: 500,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }
        },
        {
            body: t.Object({
                name: t.String({ description: "Name of the simulation", examples: ["Web Development - Spring 2025"] }),
                description: t.Optional(t.String({ description: "Optional description of the simulation" })),
                course_info: t.Object({
                    course_name: t.String({ description: "Full course name", examples: ["Introduction to Programming"] }),
                    course_id: t.String({ description: "Course code", examples: ["CS-101"] }),
                    teaching_hours: t.Number({ description: "Total lecture hours for semester", examples: [24] }),
                    lab_hours: t.Number({ description: "Total lab hours for semester", examples: [12] }),
                    ects: t.Number({ description: "ECTS credits", examples: [5] }),
                    topic_difficulty: t.Number({ description: "Course difficulty (1=Very Easy, 5=Very Hard)", minimum: 1, maximum: 5, examples: [3] }),
                    has_prerequisites: t.Boolean({ description: "Does the course have prerequisites?", examples: [true] }),
                    total_homework_hours: t.Number({ description: "Total homework hours for semester", examples: [100] }),
                    total_weeks: t.Number({ description: "Duration in weeks", examples: [12] }),
                    total_assignments: t.Number({ description: "Number of major assignments", examples: [3] }),
                    attendance_method: t.Union([t.Literal("Physical"), t.Literal("Online"), t.Literal("Hybrid")], { description: "Course delivery method" }),
                    success_rate_percent: t.Nullable(t.Number({ description: "Historical pass rate percentage", examples: [85.0] })),
                    average_grade: t.Nullable(t.Number({ description: "Historical average grade (0-5)", examples: [3.5] })),
                    course_sessions: t.Array(t.Object({
                        day: t.String({ examples: ["Monday"] }),
                        start_time: t.String({ examples: ["09:00"] }),
                        end_time: t.String({ examples: ["11:00"] })
                    })),
                    lab_sessions: t.Array(t.Object({
                        day: t.String({ examples: ["Wednesday"] }),
                        start_time: t.String({ examples: ["14:00"] }),
                        end_time: t.String({ examples: ["16:00"] })
                    }))
                }),
                assignment_weeks: t.Array(t.Object({
                    id: t.Number({ description: "Assignment ID", examples: [1] }),
                    start_week: t.Number({ description: "Week when assignment starts", examples: [1] }),
                    end_week: t.Number({ description: "Week when assignment is due", examples: [4] }),
                    extensions: t.Array(t.Object({
                        extension_id: t.Number(),
                        new_end_week: t.Number(),
                        reason: t.String(),
                        weeks_extended: t.Number(),
                        applied_in_scenario: t.Optional(t.String())
                    }))
                })),
                current_status: t.Object({
                    current_week: t.Number({ description: "Current week of the semester", examples: [1] }),
                    latest_adjusted_week: t.Number({ description: "Latest week that was adjusted (0 for new simulations)", examples: [0] })
                }),
                week_schedules: t.Array(t.Object({
                    week_number: t.Number({ description: "Week number (1 to total_weeks)", examples: [1] }),
                    adjusted: t.Boolean({ description: "Has this week been adjusted? (false for input)", examples: [false] }),
                    teaching_hours: t.Number({ description: "Teaching hours this week", examples: [2] }),
                    lab_hours: t.Number({ description: "Lab hours this week", examples: [1] }),
                    homework_hours: t.Number({ description: "Homework hours this week", examples: [8] })
                })),
                optimization_request: t.Object({
                    optimization_target: t.String({ description: "Optimization goal", examples: ["minimize_peak_stress"] }),
                    stress_threshold_warning: t.Number({ description: "Warning threshold (recommended: 75)", examples: [75] }),
                    stress_threshold_critical: t.Number({ description: "Critical threshold (recommended: 85)", examples: [85] }),
                    allow_extensions: t.Boolean({ description: "Allow assignment deadline extensions?", examples: [true] }),
                    max_extensions_per_assignment: t.Number({ description: "Maximum weeks to extend each assignment", examples: [2] }),
                    consider_all_remaining_weeks: t.Boolean({ description: "Consider all remaining weeks (always true)", examples: [true] })
                }),
                students: t.Object({
                    count: t.Number({ description: "Number of students enrolled", examples: [50] })
                }),
                metadata: t.Object({
                    created_at: t.String({ description: "ISO 8601 timestamp", examples: ["2025-01-13T10:00:00Z"] }),
                    creator_id: t.String({ description: "ID of the creator", examples: ["instructor_1"] }),
                    semester_id: t.String({ description: "Semester/term identifier", examples: ["spring_2025"] })
                })
            }),
            response: {
                201: t.Object({
                    caseId: t.String({ description: "Unique identifier for this simulation", examples: ["6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c"] }),
                    resultsUrl: t.String({ description: "URL to view results in frontend", examples: ["https://app.localhost/education/6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c"] })
                }, { description: "Simulation successfully created" }),
                500: t.Object({
                    error: t.String({ examples: ["An error occurred while saving the simulation."] }),
                    message: t.String({ examples: ["Database connection failed"] })
                }, { description: "Internal server error" })
            },
            detail: {
                summary: "Create a new educational stress simulation",
                description:
                    "Analyzes course workload and generates 4 optimization scenarios (Minimal, Balanced, Aggressive, Extension-Based) that suggest how to reduce student stress while maintaining learning outcomes. Each scenario provides week-by-week stress calculations and specific recommendations for homework hour adjustments or deadline extensions.",
                tags: ["Educational Stress"],
            },
        }
    )

    /**
     * GET /api/simulations/education/:caseId
     * Retrieve all generated course adjustments for a case
     */
    .get(
        "/:caseId",
        async ({ params, set }) => {
            const { caseId } = params;

            try {
                // Fetch the simulation with all its adjustments
                const simulation = await db.query.educational_simulations.findFirst({
                    where: eq(educational_simulations.case_id, caseId),
                    with: {
                        adjustments: true,
                    },
                });

                if (!simulation) {
                    set.status = 404;
                    return {
                        error: "Simulation not found",
                    };
                }

                // Transform to match API specification
                return {
                    name: simulation.name,
                    description: simulation.description || "",
                    course_info: simulation.course_info,
                    assignment_weeks: simulation.assignment_weeks,
                    current_status: simulation.current_status,
                    week_schedules: simulation.adjustments.map((adj) => ({
                        adjustment_id: adj.adjustment_id,
                        week_schedules: adj.week_schedules,
                    })),
                    optimization_request: simulation.optimization_request,
                    students: simulation.students,
                    metadata: simulation.metadata,
                };
            } catch (error: any) {
                console.error("Failed to retrieve simulation:", error);
                set.status = 500;
                return {
                    error: "An error occurred while retrieving the simulation.",
                    message: error.message,
                };
            }
        },
        {
            params: t.Object({
                caseId: t.String({ description: "Unique simulation case identifier (UUID)", examples: ["6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c"] })
            }),
            response: {
                200: t.Object({
                    name: t.String({ description: "Simulation name" }),
                    description: t.String({ description: "Simulation description" }),
                    course_info: t.Any({ description: "Course information object" }),
                    assignment_weeks: t.Any({ description: "Assignment schedules" }),
                    current_status: t.Any({ description: "Current status object" }),
                    week_schedules: t.Array(t.Object({
                        adjustment_id: t.String({ description: "Scenario identifier", examples: ["adjustment_1", "adjustment_2", "adjustment_3", "adjustment_4"] }),
                        week_schedules: t.Any({ description: "Array of week schedules for this scenario" })
                    })),
                    optimization_request: t.Any({ description: "Optimization configuration" }),
                    students: t.Any({ description: "Student information" }),
                    metadata: t.Any({ description: "Simulation metadata" })
                }, { description: "Complete simulation with all scenarios" }),
                404: t.Object({
                    error: t.String({ examples: ["Simulation not found"] })
                }, { description: "Case ID not found in database" }),
                500: t.Object({
                    error: t.String({ examples: ["An error occurred while retrieving the simulation."] }),
                    message: t.String({ examples: ["Database connection failed"] })
                }, { description: "Internal server error" })
            },
            detail: {
                summary: "Retrieve all optimization scenarios for a simulation",
                description:
                    "Returns the complete simulation including course information and all 4 generated optimization scenarios (adjustment_1 through adjustment_4). Use this endpoint to get an overview and compare all scenarios before diving into specific details.",
                tags: ["Educational Stress"],
            },
        }
    )

    /**
     * GET /api/simulations/education/:caseId/:adjustmentId
     * Retrieve a specific adjustment result
     */
    .get(
        "/:caseId/:adjustmentId",
        async ({ params, set }) => {
            const { caseId, adjustmentId } = params;

            try {
                // Fetch the simulation to get thresholds
                const simulation = await db.query.educational_simulations.findFirst({
                    where: eq(educational_simulations.case_id, caseId),
                });

                if (!simulation) {
                    set.status = 404;
                    return {
                        error: "Simulation not found",
                    };
                }

                // Fetch the specific adjustment
                const adjustment = await db.query.adjustment_scenarios.findFirst({
                    where: and(
                        eq(adjustment_scenarios.case_id, caseId),
                        eq(adjustment_scenarios.adjustment_id, adjustmentId)
                    ),
                });

                if (!adjustment) {
                    set.status = 404;
                    return {
                        error: "Adjustment not found",
                    };
                }

                // Get adjustment name based on ID
                const adjustmentNames: Record<string, string> = {
                    adjustment_1: "Minimal Adjustment - Critical Weeks Only",
                    adjustment_2: "Balanced Redistribution - Smooth Stress Curve",
                    adjustment_3: "Aggressive Optimization - Maximum Stress Reduction",
                    adjustment_4: "Extension-Based - Deadline Flexibility",
                };

                // Calculate or retrieve summary metrics
                const summary = adjustment.summary_metrics || {
                    total_adjustments_made: 0,
                    hours_redistributed: false,
                    peak_stress: 0,
                    average_stress: 0,
                    total_hours_maintained: true,
                };

                // Extract thresholds from simulation
                const thresholds = {
                    warning: (simulation.optimization_request as any).stress_threshold_warning || 75,
                    critical: (simulation.optimization_request as any).stress_threshold_critical || 85,
                };

                // Calculate feasibility score based on optimization results
                const feasibilityScore = calculateFeasibilityScore(
                    adjustment.week_schedules as any[],
                    thresholds
                );

                // Calculate extensions used from extensions_applied field
                const extensionsApplied = adjustment.extensions_applied as any[];
                const extensionsUsed = extensionsApplied ? extensionsApplied.length : 0;

                // Build response with detailed information
                return {
                    adjustment_id: adjustment.adjustment_id,
                    name: adjustmentNames[adjustment.adjustment_id] || "Custom Adjustment",
                    feasibility_score: feasibilityScore,
                    key_changes: getKeyChanges(adjustment.adjustment_id),
                    peak_stress: (summary as any).peak_stress || 0,
                    total_hours_maintained: true,
                    optimization_summary: {
                        stress_reduction_achieved: calculateStressReduction(
                            adjustment.week_schedules as any
                        ),
                        learning_outcomes_maintained: true,
                        total_adjustments_made:
                            (summary as any).total_adjustments_made || 0,
                        extensions_used: extensionsUsed,
                        hours_redistributed: (summary as any).hours_redistributed || false,
                        total_hours_maintained: true,
                    },
                    week_schedules: adjustment.week_schedules,
                };
            } catch (error: any) {
                console.error("Failed to retrieve adjustment:", error);
                set.status = 500;
                return {
                    error: "An error occurred while retrieving the adjustment.",
                    message: error.message,
                };
            }
        },
        {
            params: t.Object({
                caseId: t.String({ description: "Unique simulation case identifier (UUID)", examples: ["6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c"] }),
                adjustmentId: t.String({
                    description: "Adjustment scenario identifier",
                    examples: ["adjustment_1", "adjustment_2", "adjustment_3", "adjustment_4"],
                    enum: ["adjustment_1", "adjustment_2", "adjustment_3", "adjustment_4"]
                })
            }),
            response: {
                200: t.Object({
                    adjustment_id: t.String({ description: "Scenario identifier", examples: ["adjustment_4"] }),
                    name: t.String({ description: "Human-readable scenario name", examples: ["Extension-Based - Deadline Flexibility"] }),
                    feasibility_score: t.Number({ description: "Score from 0-100 indicating optimization quality (80-100=Excellent, 60-80=Good, 40-60=Moderate, 0-40=Poor)", examples: [72.8] }),
                    key_changes: t.String({ description: "Summary of optimization strategy", examples: ["Assignment extensions + moderate redistribution"] }),
                    peak_stress: t.Number({ description: "Highest stress level across all weeks", examples: [79.4] }),
                    total_hours_maintained: t.Boolean({ description: "Whether total homework hours were conserved (always true for ECTS integrity)", examples: [true] }),
                    optimization_summary: t.Object({
                        stress_reduction_achieved: t.Number({ description: "Percentage reduction in average stress", examples: [12.6] }),
                        learning_outcomes_maintained: t.Boolean({ description: "Whether learning outcomes preserved (always true)", examples: [true] }),
                        total_adjustments_made: t.Number({ description: "Number of weeks modified", examples: [7] }),
                        extensions_used: t.Number({ description: "Number of assignment deadline extensions applied", examples: [2] }),
                        hours_redistributed: t.Boolean({ description: "Whether homework hours were moved between weeks", examples: [true] }),
                        total_hours_maintained: t.Boolean({ description: "Total hours conserved (always true)", examples: [true] })
                    }),
                    week_schedules: t.Any({ description: "Array of week-by-week schedules with stress metrics and optimization changes" })
                }, { description: "Detailed optimization scenario with week-by-week breakdown" }),
                404: t.Object({
                    error: t.String({ examples: ["Adjustment not found", "Simulation not found"] })
                }, { description: "Case ID or adjustment ID not found" }),
                500: t.Object({
                    error: t.String({ examples: ["An error occurred while retrieving the adjustment."] }),
                    message: t.String({ examples: ["Database query failed"] })
                }, { description: "Internal server error" })
            },
            detail: {
                summary: "Retrieve detailed information for a specific optimization scenario",
                description:
                    "Returns comprehensive details for one of the 4 optimization scenarios, including: feasibility score (0-100), peak stress levels, number of adjustments made, extensions used, and complete week-by-week schedules showing stress metrics and optimization changes. Use this to analyze a specific scenario in detail after comparing all scenarios.",
                tags: ["Educational Stress"],
            },
        }
    )

    /**
     * PUT /api/simulations/education/:caseId/select
     * Select a specific adjustment scenario as the preferred one
     */
    .put(
        "/:caseId/select",
        async ({ params, body, set }) => {
            const { caseId } = params;
            const { adjustmentId } = body as { adjustmentId: string };

            try {
                // Verify the simulation exists
                const simulation = await db.query.educational_simulations.findFirst({
                    where: eq(educational_simulations.case_id, caseId),
                });

                if (!simulation) {
                    set.status = 404;
                    return {
                        error: "Simulation not found",
                    };
                }

                // Verify the adjustment exists
                const adjustment = await db.query.adjustment_scenarios.findFirst({
                    where: and(
                        eq(adjustment_scenarios.case_id, caseId),
                        eq(adjustment_scenarios.adjustment_id, adjustmentId)
                    ),
                });

                if (!adjustment) {
                    set.status = 404;
                    return {
                        error: "Adjustment scenario not found",
                    };
                }

                // Update the selection
                await db
                    .update(educational_simulations)
                    .set({
                        selected_adjustment_id: adjustmentId,
                        selected_at: new Date(),
                    })
                    .where(eq(educational_simulations.case_id, caseId));

                return {
                    success: true,
                    caseId: caseId,
                    selectedAdjustmentId: adjustmentId,
                    selectedAt: new Date().toISOString(),
                };
            } catch (error: any) {
                console.error("Failed to update selection:", error);
                set.status = 500;
                return {
                    error: "An error occurred while updating the selection.",
                    message: error.message,
                };
            }
        },
        {
            params: t.Object({
                caseId: t.String({
                    description: "Unique simulation case identifier (UUID)",
                    examples: ["6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c"]
                })
            }),
            body: t.Object({
                adjustmentId: t.String({
                    description: "The adjustment scenario to select",
                    examples: ["adjustment_1", "adjustment_2", "adjustment_3", "adjustment_4"],
                    enum: ["adjustment_1", "adjustment_2", "adjustment_3", "adjustment_4"]
                })
            }),
            response: {
                200: t.Object({
                    success: t.Boolean({ description: "Whether the selection was successful", examples: [true] }),
                    caseId: t.String({ description: "The simulation case ID", examples: ["6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c"] }),
                    selectedAdjustmentId: t.String({ description: "The selected adjustment ID", examples: ["adjustment_2"] }),
                    selectedAt: t.String({ description: "ISO 8601 timestamp of selection", examples: ["2025-01-15T14:30:00.000Z"] })
                }, { description: "Selection successfully updated" }),
                404: t.Object({
                    error: t.String({ examples: ["Simulation not found", "Adjustment scenario not found"] })
                }, { description: "Case ID or adjustment ID not found" }),
                500: t.Object({
                    error: t.String({ examples: ["An error occurred while updating the selection."] }),
                    message: t.String({ examples: ["Database update failed"] })
                }, { description: "Internal server error" })
            },
            detail: {
                summary: "Select a preferred adjustment scenario",
                description:
                    "Marks a specific optimization scenario (adjustment_1 through adjustment_4) as the user's selected/preferred option for this simulation. This selection is stored and can be retrieved later to indicate which scenario the user has chosen to implement.",
                tags: ["Educational Stress"],
            },
        }
    )

    /**
     * GET /api/simulations/education/:caseId/selection
     * Get the currently selected adjustment scenario for a simulation
     */
    .get(
        "/:caseId/selection",
        async ({ params, set }) => {
            const { caseId } = params;

            try {
                // Fetch the simulation with selected adjustment info
                const simulation = await db.query.educational_simulations.findFirst({
                    where: eq(educational_simulations.case_id, caseId),
                });

                if (!simulation) {
                    set.status = 404;
                    return {
                        error: "Simulation not found",
                    };
                }

                // If no selection has been made
                if (!simulation.selected_adjustment_id) {
                    return {
                        hasSelection: false,
                        caseId: caseId,
                        selectedAdjustmentId: null,
                        selectedAt: null,
                    };
                }

                // Fetch the selected adjustment details
                const adjustment = await db.query.adjustment_scenarios.findFirst({
                    where: and(
                        eq(adjustment_scenarios.case_id, caseId),
                        eq(adjustment_scenarios.adjustment_id, simulation.selected_adjustment_id)
                    ),
                });

                if (!adjustment) {
                    // Selection references non-existent adjustment (data inconsistency)
                    return {
                        hasSelection: false,
                        caseId: caseId,
                        selectedAdjustmentId: null,
                        selectedAt: null,
                        warning: "Selected adjustment no longer exists",
                    };
                }

                // Get adjustment name
                const adjustmentNames: Record<string, string> = {
                    adjustment_1: "Minimal Adjustment - Critical Weeks Only",
                    adjustment_2: "Balanced Redistribution - Smooth Stress Curve",
                    adjustment_3: "Aggressive Optimization - Maximum Stress Reduction",
                    adjustment_4: "Extension-Based - Deadline Flexibility",
                };

                // Extract thresholds from simulation
                const thresholds = {
                    warning: (simulation.optimization_request as any).stress_threshold_warning || 75,
                    critical: (simulation.optimization_request as any).stress_threshold_critical || 85,
                };

                // Calculate feasibility score
                const feasibilityScore = calculateFeasibilityScore(
                    adjustment.week_schedules as any[],
                    thresholds
                );

                return {
                    hasSelection: true,
                    caseId: caseId,
                    selectedAdjustmentId: simulation.selected_adjustment_id,
                    selectedAt: simulation.selected_at?.toISOString() || new Date().toISOString(),
                    adjustment: {
                        adjustment_id: adjustment.adjustment_id,
                        name: adjustmentNames[adjustment.adjustment_id] || "Custom Adjustment",
                        feasibility_score: feasibilityScore,
                        key_changes: getKeyChanges(adjustment.adjustment_id),
                        summary_metrics: adjustment.summary_metrics,
                    },
                };
            } catch (error: any) {
                console.error("Failed to retrieve selection:", error);
                set.status = 500;
                return {
                    error: "An error occurred while retrieving the selection.",
                    message: error.message,
                };
            }
        },
        {
            params: t.Object({
                caseId: t.String({
                    description: "Unique simulation case identifier (UUID)",
                    examples: ["6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c"]
                })
            }),
            response: {
                200: t.Union([
                    t.Object({
                        hasSelection: t.Literal(false),
                        caseId: t.String({ description: "The simulation case ID" }),
                        selectedAdjustmentId: t.Null(),
                        selectedAt: t.Null(),
                        warning: t.Optional(t.String({ description: "Warning message if data inconsistency" }))
                    }, { description: "No adjustment has been selected yet" }),
                    t.Object({
                        hasSelection: t.Literal(true),
                        caseId: t.String({ description: "The simulation case ID", examples: ["6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c"] }),
                        selectedAdjustmentId: t.String({ description: "The selected adjustment ID", examples: ["adjustment_2"] }),
                        selectedAt: t.String({ description: "ISO 8601 timestamp of selection", examples: ["2025-01-15T14:30:00.000Z"] }),
                        adjustment: t.Object({
                            adjustment_id: t.String({ description: "Adjustment scenario identifier" }),
                            name: t.String({ description: "Human-readable name" }),
                            feasibility_score: t.Number({ description: "Quality score 0-100" }),
                            key_changes: t.String({ description: "Summary of changes" }),
                            summary_metrics: t.Any({ description: "Summary metrics object" })
                        })
                    }, { description: "An adjustment has been selected" })
                ]),
                404: t.Object({
                    error: t.String({ examples: ["Simulation not found"] })
                }, { description: "Case ID not found" }),
                500: t.Object({
                    error: t.String({ examples: ["An error occurred while retrieving the selection."] }),
                    message: t.String({ examples: ["Database query failed"] })
                }, { description: "Internal server error" })
            },
            detail: {
                summary: "Get the selected adjustment scenario",
                description:
                    "Returns information about which optimization scenario (if any) the user has selected for this simulation. Returns hasSelection: false if no selection has been made, or hasSelection: true with full adjustment details if a selection exists.",
                tags: ["Educational Stress"],
            },
        }
    );
