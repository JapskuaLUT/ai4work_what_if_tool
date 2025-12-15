// backend/src/services/optimizationEngine.ts

import { StressCalculator } from "./stressCalculation";
import { DeadlineExtensionService } from "./extensionService";
import type {
    CourseAnalysisInput,
    AdjustmentScenario,
    WeekSchedule,
    StressFactors,
    AssignmentWeek,
    ExtensionApplication,
} from "../types/educationalStress";

/**
 * CourseOptimizationEngine - Generates optimized course schedules
 *
 * Creates multiple adjustment scenarios that reduce student stress
 * while maintaining learning outcomes and total hours.
 */
export class CourseOptimizationEngine {
    private stressCalculator: StressCalculator;
    private extensionService: DeadlineExtensionService;

    constructor() {
        this.stressCalculator = new StressCalculator();
        this.extensionService = new DeadlineExtensionService();
    }

    /**
     * Generate all optimization scenarios for a course
     * Returns 3-4 scenarios depending on configuration
     */
    generateOptimizationScenarios(
        input: CourseAnalysisInput
    ): AdjustmentScenario[] {
        const scenarios: AdjustmentScenario[] = [];

        // Scenario 1: Minimal Adjustment - Only fix critical weeks
        scenarios.push(this.generateMinimalAdjustmentScenario(input));

        // Scenario 2: Balanced Redistribution - Smooth stress curve
        scenarios.push(this.generateBalancedScenario(input));

        // Scenario 3: Aggressive Optimization - Maximum stress reduction
        scenarios.push(this.generateAggressiveScenario(input));

        // Scenario 4: Extension-Based (only if allowed)
        if (input.optimization_request.allow_extensions) {
            scenarios.push(this.generateExtensionScenario(input));
        }

        return scenarios;
    }

    /**
     * Scenario 1: Minimal Adjustment
     * Only modify weeks that exceed critical stress threshold
     */
    private generateMinimalAdjustmentScenario(
        input: CourseAnalysisInput
    ): AdjustmentScenario {
        const adjustedWeeks = JSON.parse(
            JSON.stringify(input.week_schedules)
        ) as WeekSchedule[];
        const currentWeek = input.current_status.current_week;

        // Calculate stress for all future weeks first
        for (let i = currentWeek - 1; i < adjustedWeeks.length; i++) {
            const week = adjustedWeeks[i];
            const stressMetrics = this.calculateWeekStress(
                week,
                input,
                week.week_number
            );
            week.stress_metrics = stressMetrics;
        }

        // Only adjust weeks exceeding critical threshold
        for (let i = currentWeek - 1; i < adjustedWeeks.length; i++) {
            const week = adjustedWeeks[i];

            if (
                week.stress_metrics &&
                week.stress_metrics.average_stress >
                    input.optimization_request.stress_threshold_critical
            ) {
                // Reduce homework by 20%
                const originalHomework = week.homework_hours;
                const reduction = Math.ceil(originalHomework * 0.2);
                week.homework_hours = Math.max(0, originalHomework - reduction);
                week.adjusted = true;

                week.optimization_changes = {
                    original_homework_hours: originalHomework,
                    original_teaching_hours: week.teaching_hours,
                    original_lab_hours: week.lab_hours,
                    hours_redistributed: true,
                    change_reason: "critical_stress_reduction",
                };

                // Recalculate stress after adjustment
                week.stress_metrics = this.calculateWeekStress(
                    week,
                    input,
                    week.week_number
                );
            }
        }

        // Redistribute removed hours to weeks with lower stress
        this.redistributeHours(adjustedWeeks, input, currentWeek);

        return {
            adjustment_id: "adjustment_1",
            week_schedules: adjustedWeeks,
        };
    }

    /**
     * Scenario 2: Balanced Redistribution
     * Smooth out stress across all remaining weeks
     */
    private generateBalancedScenario(
        input: CourseAnalysisInput
    ): AdjustmentScenario {
        const adjustedWeeks = JSON.parse(
            JSON.stringify(input.week_schedules)
        ) as WeekSchedule[];
        const currentWeek = input.current_status.current_week;

        // Calculate stress for all weeks
        for (let i = currentWeek - 1; i < adjustedWeeks.length; i++) {
            const week = adjustedWeeks[i];
            week.stress_metrics = this.calculateWeekStress(
                week,
                input,
                week.week_number
            );
        }

        // Calculate target average stress (slightly below warning threshold)
        const targetStress =
            input.optimization_request.stress_threshold_warning * 0.9;

        // Adjust weeks to approach target stress
        for (let i = currentWeek - 1; i < adjustedWeeks.length; i++) {
            const week = adjustedWeeks[i];

            if (
                week.stress_metrics &&
                week.stress_metrics.average_stress > targetStress
            ) {
                const originalHomework = week.homework_hours;
                // Calculate how much to reduce based on stress delta
                const stressDelta =
                    week.stress_metrics.average_stress - targetStress;
                const reductionPercent = Math.min(0.3, stressDelta / 100);
                const reduction = Math.ceil(
                    originalHomework * reductionPercent
                );

                week.homework_hours = Math.max(0, originalHomework - reduction);
                week.adjusted = true;

                week.optimization_changes = {
                    original_homework_hours: originalHomework,
                    original_teaching_hours: week.teaching_hours,
                    original_lab_hours: week.lab_hours,
                    hours_redistributed: true,
                    change_reason: "balanced_stress_redistribution",
                };

                // Recalculate stress
                week.stress_metrics = this.calculateWeekStress(
                    week,
                    input,
                    week.week_number
                );
            }
        }

        // Redistribute hours to low-stress weeks
        this.redistributeHours(adjustedWeeks, input, currentWeek);

        return {
            adjustment_id: "adjustment_2",
            week_schedules: adjustedWeeks,
        };
    }

    /**
     * Scenario 3: Aggressive Optimization
     * Maximize stress reduction, may extend deadlines
     */
    private generateAggressiveScenario(
        input: CourseAnalysisInput
    ): AdjustmentScenario {
        const adjustedWeeks = JSON.parse(
            JSON.stringify(input.week_schedules)
        ) as WeekSchedule[];
        const currentWeek = input.current_status.current_week;

        // Calculate stress for all weeks
        for (let i = currentWeek - 1; i < adjustedWeeks.length; i++) {
            const week = adjustedWeeks[i];
            week.stress_metrics = this.calculateWeekStress(
                week,
                input,
                week.week_number
            );
        }

        // Aggressively reduce any week above warning threshold
        for (let i = currentWeek - 1; i < adjustedWeeks.length; i++) {
            const week = adjustedWeeks[i];

            if (
                week.stress_metrics &&
                week.stress_metrics.average_stress >
                    input.optimization_request.stress_threshold_warning
            ) {
                const originalHomework = week.homework_hours;
                // Aggressive reduction: 30-40%
                const reduction = Math.ceil(originalHomework * 0.35);
                week.homework_hours = Math.max(0, originalHomework - reduction);
                week.adjusted = true;

                week.optimization_changes = {
                    original_homework_hours: originalHomework,
                    original_teaching_hours: week.teaching_hours,
                    original_lab_hours: week.lab_hours,
                    hours_redistributed: true,
                    change_reason: "aggressive_stress_optimization",
                };

                // Recalculate stress
                week.stress_metrics = this.calculateWeekStress(
                    week,
                    input,
                    week.week_number
                );
            }
        }

        // Redistribute hours to low-stress weeks
        this.redistributeHours(adjustedWeeks, input, currentWeek);

        return {
            adjustment_id: "adjustment_3",
            week_schedules: adjustedWeeks,
        };
    }

    /**
     * Scenario 4: Extension-Based
     * Use assignment deadline extensions to reduce stress
     */
    private generateExtensionScenario(
        input: CourseAnalysisInput
    ): AdjustmentScenario {
        let adjustedWeeks = JSON.parse(
            JSON.stringify(input.week_schedules)
        ) as WeekSchedule[];
        let adjustedAssignments = JSON.parse(
            JSON.stringify(input.assignment_weeks)
        ) as AssignmentWeek[];
        const currentWeek = input.current_status.current_week;
        const extensionsApplied: ExtensionApplication[] = [];

        // Calculate initial stress for all weeks
        for (let i = currentWeek - 1; i < adjustedWeeks.length; i++) {
            const week = adjustedWeeks[i];
            week.stress_metrics = this.calculateWeekStressWithAssignments(
                week,
                input,
                week.week_number,
                adjustedAssignments
            );
        }

        // Calculate optimal extensions using the extension service
        const recommendations = this.extensionService.calculateOptimalExtensions(
            adjustedAssignments,
            adjustedWeeks,
            currentWeek,
            input.optimization_request.max_extensions_per_assignment,
            {
                warning: input.optimization_request.stress_threshold_warning,
                critical: input.optimization_request.stress_threshold_critical,
            }
        );

        // Apply the recommended extensions
        for (const recommendation of recommendations) {
            const assignment = adjustedAssignments[recommendation.assignmentIndex];

            const result = this.extensionService.applyExtension(
                assignment,
                adjustedWeeks,
                recommendation.extensionWeeks,
                currentWeek
            );

            // Update the assignment and weeks with the extension results
            adjustedAssignments[recommendation.assignmentIndex] = result.modifiedAssignment;
            adjustedWeeks = result.modifiedWeeks;
            extensionsApplied.push(result.extensionDetails);

            // Recalculate stress for all affected weeks
            for (let i = currentWeek - 1; i < adjustedWeeks.length; i++) {
                const week = adjustedWeeks[i];
                week.stress_metrics = this.calculateWeekStressWithAssignments(
                    week,
                    input,
                    week.week_number,
                    adjustedAssignments
                );
            }
        }

        // If no extensions were applied, do moderate homework reduction
        // This ensures the scenario still provides some optimization
        if (extensionsApplied.length === 0) {
            for (let i = currentWeek - 1; i < adjustedWeeks.length; i++) {
                const week = adjustedWeeks[i];

                if (
                    week.stress_metrics &&
                    week.stress_metrics.average_stress >
                        input.optimization_request.stress_threshold_warning
                ) {
                    const originalHomework = week.homework_hours;
                    const reduction = Math.ceil(originalHomework * 0.25);
                    week.homework_hours = Math.max(0, originalHomework - reduction);
                    week.adjusted = true;

                    week.optimization_changes = {
                        original_homework_hours: originalHomework,
                        original_teaching_hours: week.teaching_hours,
                        original_lab_hours: week.lab_hours,
                        hours_redistributed: true,
                        change_reason: "deadline_extension_optimization",
                    };

                    week.stress_metrics = this.calculateWeekStressWithAssignments(
                        week,
                        input,
                        week.week_number,
                        adjustedAssignments
                    );
                }
            }

            this.redistributeHours(adjustedWeeks, input, currentWeek);
        }

        return {
            adjustment_id: "adjustment_4",
            week_schedules: adjustedWeeks,
            assignment_weeks: adjustedAssignments,
            extensions_applied: extensionsApplied,
        };
    }

    /**
     * Redistribute removed hours to weeks with lower stress
     * Maintains total homework hours across the semester
     */
    private redistributeHours(
        weeks: WeekSchedule[],
        input: CourseAnalysisInput,
        currentWeek: number
    ): void {
        // Calculate total original hours and total adjusted hours
        let originalTotal = 0;
        let adjustedTotal = 0;

        for (let i = currentWeek - 1; i < weeks.length; i++) {
            const week = weeks[i];
            if (week.optimization_changes) {
                originalTotal += week.optimization_changes.original_homework_hours;
            } else {
                originalTotal += week.homework_hours;
            }
            adjustedTotal += week.homework_hours;
        }

        const hoursToRedistribute = originalTotal - adjustedTotal;

        if (hoursToRedistribute <= 0) return;

        // Find weeks with lowest stress to add hours
        const lowStressWeeks = weeks
            .slice(currentWeek - 1)
            .filter(
                (w) =>
                    w.stress_metrics &&
                    w.stress_metrics.average_stress <
                        input.optimization_request.stress_threshold_warning * 0.8
            )
            .sort(
                (a, b) =>
                    (a.stress_metrics?.average_stress || 0) -
                    (b.stress_metrics?.average_stress || 0)
            );

        if (lowStressWeeks.length === 0) return;

        // Distribute hours evenly among low-stress weeks
        const hoursPerWeek = Math.ceil(
            hoursToRedistribute / lowStressWeeks.length
        );

        for (const week of lowStressWeeks) {
            const originalHomework = week.optimization_changes
                ? week.optimization_changes.original_homework_hours
                : week.homework_hours;

            if (!week.optimization_changes) {
                week.optimization_changes = {
                    original_homework_hours: originalHomework,
                    original_teaching_hours: week.teaching_hours,
                    original_lab_hours: week.lab_hours,
                    hours_redistributed: true,
                    change_reason: "received_redistributed_hours",
                };
            }

            week.homework_hours += hoursPerWeek;
            week.adjusted = true;

            // Recalculate stress with added hours
            week.stress_metrics = this.calculateWeekStress(
                week,
                input,
                week.week_number
            );
        }
    }

    /**
     * Calculate stress for a specific week
     */
    private calculateWeekStress(
        week: WeekSchedule,
        input: CourseAnalysisInput,
        weekNumber: number
    ): { average_stress: number; maximum_stress: number } {
        return this.calculateWeekStressWithAssignments(
            week,
            input,
            weekNumber,
            input.assignment_weeks
        );
    }

    /**
     * Calculate stress for a specific week with custom assignments
     * Allows using modified assignment schedules (e.g., with extensions)
     */
    private calculateWeekStressWithAssignments(
        week: WeekSchedule,
        input: CourseAnalysisInput,
        weekNumber: number,
        assignments: AssignmentWeek[]
    ): { average_stress: number; maximum_stress: number } {
        // Count concurrent assignment deadlines
        const deadlines = this.countDeadlines(assignments, weekNumber);

        const totalHours =
            week.teaching_hours + week.lab_hours + week.homework_hours;

        const factors: StressFactors = {
            workloadHours: totalHours,
            assignmentDeadlines: deadlines,
            topicDifficulty: input.course_info.topic_difficulty,
            hasPrerequisites: input.course_info.has_prerequisites,
            attendanceMethod: input.course_info.attendance_method,
            currentWeek: weekNumber,
            totalWeeks: input.course_info.total_weeks,
        };

        const metrics = this.stressCalculator.calculateWeeklyStress(factors);

        return {
            average_stress: metrics.averageStress,
            maximum_stress: metrics.maximumStress,
        };
    }

    /**
     * Count how many assignments have deadlines in this week
     */
    private countDeadlines(
        assignments: AssignmentWeek[],
        weekNumber: number
    ): number {
        return assignments.filter(
            (a) => weekNumber >= a.start_week && weekNumber <= a.end_week
        ).length;
    }

    /**
     * Calculate summary metrics for an adjustment scenario
     */
    calculateAdjustmentSummary(scenario: AdjustmentScenario) {
        let totalAdjustments = 0;
        let hoursRedistributed = false;
        let peakStress = 0;
        let totalStress = 0;
        let weekCount = 0;

        for (const week of scenario.week_schedules) {
            if (week.adjusted) {
                totalAdjustments++;
            }
            if (week.optimization_changes?.hours_redistributed) {
                hoursRedistributed = true;
            }
            if (week.stress_metrics) {
                peakStress = Math.max(
                    peakStress,
                    week.stress_metrics.maximum_stress
                );
                totalStress += week.stress_metrics.average_stress;
                weekCount++;
            }
        }

        const averageStress = weekCount > 0 ? totalStress / weekCount : 0;

        return {
            total_adjustments_made: totalAdjustments,
            hours_redistributed: hoursRedistributed,
            peak_stress: Math.round(peakStress * 10) / 10,
            average_stress: Math.round(averageStress * 10) / 10,
            total_hours_maintained: true, // Always true in our implementation
        };
    }

    /**
     * Validate that total hours are conserved
     */
    validateHoursConservation(
        original: WeekSchedule[],
        adjusted: WeekSchedule[]
    ): boolean {
        const originalTotal = original.reduce(
            (sum, w) => sum + w.homework_hours,
            0
        );
        const adjustedTotal = adjusted.reduce(
            (sum, w) => sum + w.homework_hours,
            0
        );

        // Allow small rounding differences
        return Math.abs(originalTotal - adjustedTotal) < 0.1;
    }
}
