// backend/src/services/extensionService.ts

import { StressCalculator } from "./stressCalculation";
import type {
    AssignmentWeek,
    WeekSchedule,
    ExtensionApplication,
    StressFactors,
} from "../types/educationalStress";

/**
 * Recommendation for extending a specific assignment
 */
interface ExtensionRecommendation {
    assignmentIndex: number;
    assignmentId: number;
    extensionWeeks: number;
    estimatedStressReduction: number;
    priority: number; // Higher = more important to extend
}

/**
 * Service for calculating and applying assignment deadline extensions
 * to reduce student stress while maintaining learning outcomes
 */
export class DeadlineExtensionService {
    private stressCalculator: StressCalculator;

    constructor() {
        this.stressCalculator = new StressCalculator();
    }

    /**
     * Determine which assignments should be extended and by how many weeks
     * Uses a greedy algorithm to prioritize extensions with highest stress reduction
     *
     * @param assignmentWeeks - All course assignments
     * @param weekSchedules - Current week schedules with stress metrics
     * @param currentWeek - Current week in the semester
     * @param maxExtensionsPerAssignment - Maximum weeks to extend any assignment
     * @param stressThresholds - Warning and critical stress levels
     * @returns Ordered list of recommended extensions
     */
    calculateOptimalExtensions(
        assignmentWeeks: AssignmentWeek[],
        weekSchedules: WeekSchedule[],
        currentWeek: number,
        maxExtensionsPerAssignment: number,
        stressThresholds: { warning: number; critical: number }
    ): ExtensionRecommendation[] {
        const recommendations: ExtensionRecommendation[] = [];
        const totalWeeks = weekSchedules.length;

        // Step 1: Filter assignments that can be extended
        const extendableAssignments = assignmentWeeks
            .map((assignment, index) => ({ assignment, index }))
            .filter(({ assignment }) => {
                const canExtend = this.canExtendAssignment(
                    assignment,
                    currentWeek,
                    totalWeeks,
                    maxExtensionsPerAssignment
                );
                return canExtend.canExtend;
            });

        // Step 2: For each extendable assignment, calculate stress reduction potential
        for (const { assignment, index } of extendableAssignments) {
            // Find weeks affected by this assignment's deadline
            const affectedWeeks = weekSchedules.filter(
                (w) =>
                    w.week_number >= assignment.start_week &&
                    w.week_number <= assignment.end_week
            );

            // Calculate current stress during assignment period
            const currentStress = affectedWeeks.reduce(
                (sum, w) => sum + (w.stress_metrics?.average_stress || 0),
                0
            );

            // Try extending by 1, 2, ... N weeks and find best
            let bestExtension = 0;
            let bestReduction = 0;

            const maxPossibleExtension = Math.min(
                maxExtensionsPerAssignment,
                totalWeeks - assignment.end_week
            );

            for (let weeks = 1; weeks <= maxPossibleExtension; weeks++) {
                const reduction = this.estimateStressReduction(
                    assignment,
                    weekSchedules,
                    weeks
                );

                if (reduction > bestReduction) {
                    bestReduction = reduction;
                    bestExtension = weeks;
                }
            }

            // Only recommend if there's meaningful reduction (> 5 stress points)
            if (bestReduction > 5) {
                recommendations.push({
                    assignmentIndex: index,
                    assignmentId: assignment.id,
                    extensionWeeks: bestExtension,
                    estimatedStressReduction: bestReduction,
                    priority: bestReduction / bestExtension, // Efficiency metric
                });
            }
        }

        // Step 3: Sort by priority (highest stress reduction per week extended)
        return recommendations.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Apply an extension to an assignment and redistribute its homework
     *
     * @param assignmentWeek - The assignment to extend
     * @param weekSchedules - Week schedules to modify
     * @param extensionWeeks - Number of weeks to extend
     * @param currentWeek - Current week in semester
     * @returns Modified assignment, weeks, and extension details
     */
    applyExtension(
        assignmentWeek: AssignmentWeek,
        weekSchedules: WeekSchedule[],
        extensionWeeks: number,
        currentWeek: number
    ): {
        modifiedAssignment: AssignmentWeek;
        modifiedWeeks: WeekSchedule[];
        extensionDetails: ExtensionApplication;
    } {
        // Deep copy to avoid mutations
        const modifiedAssignment = JSON.parse(
            JSON.stringify(assignmentWeek)
        ) as AssignmentWeek;
        const modifiedWeeks = JSON.parse(
            JSON.stringify(weekSchedules)
        ) as WeekSchedule[];

        const originalEndWeek = modifiedAssignment.end_week;
        const newEndWeek = originalEndWeek + extensionWeeks;

        // Calculate homework hours to redistribute
        // Find weeks in the assignment period that have homework
        const assignmentPeriodWeeks = modifiedWeeks.filter(
            (w) =>
                w.week_number >= Math.max(currentWeek, assignmentWeek.start_week) &&
                w.week_number <= originalEndWeek
        );

        // Calculate average homework per week during assignment
        const totalHomework = assignmentPeriodWeeks.reduce(
            (sum, w) => sum + w.homework_hours,
            0
        );

        // Redistribute across original + extension period
        const totalPeriodWeeks = assignmentPeriodWeeks.length + extensionWeeks;
        const homeworkPerWeek = totalHomework / totalPeriodWeeks;

        // Reduce homework in original weeks
        let hoursRedistributed = 0;
        for (const week of assignmentPeriodWeeks) {
            const originalHours = week.homework_hours;
            const newHours = Math.max(0, homeworkPerWeek);
            const reduction = originalHours - newHours;

            week.homework_hours = newHours;
            week.adjusted = true;
            hoursRedistributed += reduction;

            if (!week.optimization_changes) {
                week.optimization_changes = {
                    original_homework_hours: originalHours,
                    original_teaching_hours: week.teaching_hours,
                    original_lab_hours: week.lab_hours,
                    hours_redistributed: true,
                    change_reason: "assignment_deadline_extended",
                };
            }
        }

        // Add homework to extension weeks
        for (let weekNum = originalEndWeek + 1; weekNum <= newEndWeek; weekNum++) {
            const week = modifiedWeeks.find((w) => w.week_number === weekNum);
            if (week) {
                const originalHours = week.homework_hours;
                week.homework_hours += homeworkPerWeek;
                week.adjusted = true;

                if (!week.optimization_changes) {
                    week.optimization_changes = {
                        original_homework_hours: originalHours,
                        original_teaching_hours: week.teaching_hours,
                        original_lab_hours: week.lab_hours,
                        hours_redistributed: true,
                        change_reason: "received_extended_assignment_hours",
                    };
                }
            }
        }

        // Update the assignment
        modifiedAssignment.end_week = newEndWeek;
        modifiedAssignment.extensions.push({
            extension_id: modifiedAssignment.extensions.length + 1,
            new_end_week: newEndWeek,
            reason: "stress_reduction",
            weeks_extended: extensionWeeks,
            applied_in_scenario: "adjustment_4",
        });

        // Create extension details record
        const extensionDetails: ExtensionApplication = {
            assignment_id: assignmentWeek.id,
            original_end_week: originalEndWeek,
            new_end_week: newEndWeek,
            weeks_extended: extensionWeeks,
            reason: "stress_reduction",
            homework_hours_affected: hoursRedistributed,
        };

        return {
            modifiedAssignment,
            modifiedWeeks,
            extensionDetails,
        };
    }

    /**
     * Check if an assignment can be extended
     *
     * @param assignment - Assignment to check
     * @param currentWeek - Current week in semester
     * @param totalWeeks - Total weeks in semester
     * @param maxExtensions - Maximum extension weeks allowed
     * @returns Whether extension is possible and constraints
     */
    canExtendAssignment(
        assignment: AssignmentWeek,
        currentWeek: number,
        totalWeeks: number,
        maxExtensions: number
    ): { canExtend: boolean; reason?: string; maxWeeksAvailable: number } {
        // Cannot extend assignments that have already ended
        if (assignment.end_week < currentWeek) {
            return {
                canExtend: false,
                reason: "assignment_already_ended",
                maxWeeksAvailable: 0,
            };
        }

        // Check if already at max extensions
        const currentExtensionWeeks = assignment.extensions.reduce(
            (sum, ext) => sum + ext.weeks_extended,
            0
        );

        if (currentExtensionWeeks >= maxExtensions) {
            return {
                canExtend: false,
                reason: "max_extensions_reached",
                maxWeeksAvailable: 0,
            };
        }

        // Calculate how many more weeks are available
        const weeksUntilSemesterEnd = totalWeeks - assignment.end_week;
        const additionalExtensionsAllowed = maxExtensions - currentExtensionWeeks;
        const maxWeeksAvailable = Math.min(
            weeksUntilSemesterEnd,
            additionalExtensionsAllowed
        );

        if (maxWeeksAvailable <= 0) {
            return {
                canExtend: false,
                reason: "no_weeks_available",
                maxWeeksAvailable: 0,
            };
        }

        return {
            canExtend: true,
            maxWeeksAvailable,
        };
    }

    /**
     * Estimate stress reduction from extending a specific assignment
     *
     * @param assignment - Assignment to extend
     * @param weekSchedules - Current week schedules
     * @param extensionWeeks - Number of weeks to extend
     * @returns Estimated stress reduction (positive = improvement)
     */
    estimateStressReduction(
        assignment: AssignmentWeek,
        weekSchedules: WeekSchedule[],
        extensionWeeks: number
    ): number {
        // Find weeks affected by this assignment
        const affectedWeeks = weekSchedules.filter(
            (w) =>
                w.week_number >= assignment.start_week &&
                w.week_number <= assignment.end_week
        );

        if (affectedWeeks.length === 0) return 0;

        // Calculate current total stress
        const currentTotalStress = affectedWeeks.reduce(
            (sum, w) => sum + (w.stress_metrics?.average_stress || 0),
            0
        );

        // Estimate stress after extension (simplified)
        // Assumption: Spreading homework over more weeks reduces stress proportionally
        const originalPeriodLength = affectedWeeks.length;
        const extendedPeriodLength = originalPeriodLength + extensionWeeks;
        const reductionFactor = originalPeriodLength / extendedPeriodLength;

        // Estimated stress after extension
        const estimatedStressAfter = currentTotalStress * reductionFactor;

        // Return the reduction (positive number)
        return currentTotalStress - estimatedStressAfter;
    }
}
