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
                        }/results/${caseId}`,
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
            detail: {
                summary: "Create a new educational stress simulation",
                description:
                    "Creates a new simulation case with multiple optimization scenarios for reducing student stress.",
                tags: ["Educational Stress"],
                responses: {
                    201: {
                        description: "Simulation successfully created",
                    },
                    500: {
                        description: "Internal Server Error",
                    },
                },
            },
        }
    )

    /**
     * GET /api/simulations/education/:caseId
     * Retrieve all generated course adjustments for a case
     */
    .get(
        "/:caseId",
        async ({ params }) => {
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
                    return new Response(
                        JSON.stringify({
                            error: "Simulation not found",
                        }),
                        {
                            status: 404,
                            headers: { "Content-Type": "application/json" },
                        }
                    );
                }

                // Transform to match API specification
                const response = {
                    name: simulation.name,
                    description: simulation.description,
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

                return new Response(JSON.stringify(response), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error: any) {
                console.error("Failed to retrieve simulation:", error);
                return new Response(
                    JSON.stringify({
                        error: "An error occurred while retrieving the simulation.",
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
            detail: {
                summary: "Retrieve all adjustments for a simulation",
                description:
                    "Fetches a complete simulation with all generated optimization scenarios.",
                tags: ["Educational Stress"],
                responses: {
                    200: {
                        description: "Simulation retrieved successfully",
                    },
                    404: {
                        description: "Simulation not found",
                    },
                    500: {
                        description: "Internal Server Error",
                    },
                },
            },
        }
    )

    /**
     * GET /api/simulations/education/:caseId/:adjustmentId
     * Retrieve a specific adjustment result
     */
    .get(
        "/:caseId/:adjustmentId",
        async ({ params }) => {
            const { caseId, adjustmentId } = params;

            try {
                // Fetch the simulation to get thresholds
                const simulation = await db.query.educational_simulations.findFirst({
                    where: eq(educational_simulations.case_id, caseId),
                });

                if (!simulation) {
                    return new Response(
                        JSON.stringify({
                            error: "Simulation not found",
                        }),
                        {
                            status: 404,
                            headers: { "Content-Type": "application/json" },
                        }
                    );
                }

                // Fetch the specific adjustment
                const adjustment = await db.query.adjustment_scenarios.findFirst({
                    where: and(
                        eq(adjustment_scenarios.case_id, caseId),
                        eq(adjustment_scenarios.adjustment_id, adjustmentId)
                    ),
                });

                if (!adjustment) {
                    return new Response(
                        JSON.stringify({
                            error: "Adjustment not found",
                        }),
                        {
                            status: 404,
                            headers: { "Content-Type": "application/json" },
                        }
                    );
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
                const response = {
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

                return new Response(JSON.stringify(response), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error: any) {
                console.error("Failed to retrieve adjustment:", error);
                return new Response(
                    JSON.stringify({
                        error: "An error occurred while retrieving the adjustment.",
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
            detail: {
                summary: "Retrieve a specific adjustment scenario",
                description:
                    "Fetches detailed information about a single optimization scenario.",
                tags: ["Educational Stress"],
                responses: {
                    200: {
                        description: "Adjustment retrieved successfully",
                    },
                    404: {
                        description: "Adjustment not found",
                    },
                    500: {
                        description: "Internal Server Error",
                    },
                },
            },
        }
    );
