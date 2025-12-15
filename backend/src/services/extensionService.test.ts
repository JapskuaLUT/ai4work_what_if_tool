// backend/src/services/extensionService.test.ts

import { describe, test, expect, beforeEach } from "bun:test";
import { DeadlineExtensionService } from "./extensionService";
import type {
    AssignmentWeek,
    WeekSchedule,
} from "../types/educationalStress";

describe("DeadlineExtensionService", () => {
    let service: DeadlineExtensionService;

    beforeEach(() => {
        service = new DeadlineExtensionService();
    });

    describe("canExtendAssignment", () => {
        test("allows extension for active assignment with weeks available", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 4,
                extensions: [],
            };

            const result = service.canExtendAssignment(assignment, 2, 12, 3);

            expect(result.canExtend).toBe(true);
            expect(result.maxWeeksAvailable).toBe(3);
            expect(result.reason).toBeUndefined();
        });

        test("prevents extension for assignment that already ended", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 4,
                extensions: [],
            };

            const result = service.canExtendAssignment(assignment, 5, 12, 3);

            expect(result.canExtend).toBe(false);
            expect(result.reason).toBe("assignment_already_ended");
            expect(result.maxWeeksAvailable).toBe(0);
        });

        test("prevents extension when max extensions already applied", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 6,
                extensions: [
                    {
                        extension_id: 1,
                        new_end_week: 5,
                        reason: "stress_reduction",
                        weeks_extended: 1,
                    },
                    {
                        extension_id: 2,
                        new_end_week: 6,
                        reason: "stress_reduction",
                        weeks_extended: 1,
                    },
                ],
            };

            const result = service.canExtendAssignment(assignment, 2, 12, 2);

            expect(result.canExtend).toBe(false);
            expect(result.reason).toBe("max_extensions_reached");
            expect(result.maxWeeksAvailable).toBe(0);
        });

        test("limits weeks available by semester end", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 10,
                extensions: [],
            };

            const result = service.canExtendAssignment(assignment, 5, 12, 5);

            expect(result.canExtend).toBe(true);
            expect(result.maxWeeksAvailable).toBe(2); // Only 2 weeks until semester ends
        });

        test("prevents extension when no weeks available", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 12,
                extensions: [],
            };

            const result = service.canExtendAssignment(assignment, 5, 12, 3);

            expect(result.canExtend).toBe(false);
            expect(result.reason).toBe("no_weeks_available");
            expect(result.maxWeeksAvailable).toBe(0);
        });

        test("accounts for existing extensions when checking max", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 5,
                extensions: [
                    {
                        extension_id: 1,
                        new_end_week: 5,
                        reason: "stress_reduction",
                        weeks_extended: 1,
                    },
                ],
            };

            const result = service.canExtendAssignment(assignment, 2, 12, 3);

            expect(result.canExtend).toBe(true);
            expect(result.maxWeeksAvailable).toBe(2); // Can extend 2 more (already extended 1)
        });
    });

    describe("estimateStressReduction", () => {
        test("calculates stress reduction for simple case", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 4,
                extensions: [],
            };

            const weekSchedules: WeekSchedule[] = [
                {
                    week_number: 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 8,
                    stress_metrics: { average_stress: 70, maximum_stress: 85 },
                },
                {
                    week_number: 2,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 8,
                    stress_metrics: { average_stress: 70, maximum_stress: 85 },
                },
                {
                    week_number: 3,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 8,
                    stress_metrics: { average_stress: 70, maximum_stress: 85 },
                },
                {
                    week_number: 4,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 12,
                    stress_metrics: { average_stress: 90, maximum_stress: 100 },
                },
            ];

            const reduction = service.estimateStressReduction(
                assignment,
                weekSchedules,
                1
            );

            expect(reduction).toBeGreaterThan(0);
            expect(reduction).toBeLessThan(300); // Total stress is 300
        });

        test("returns 0 when no weeks affected", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 10,
                end_week: 12,
                extensions: [],
            };

            const weekSchedules: WeekSchedule[] = [
                {
                    week_number: 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 8,
                    stress_metrics: { average_stress: 70, maximum_stress: 85 },
                },
            ];

            const reduction = service.estimateStressReduction(
                assignment,
                weekSchedules,
                1
            );

            expect(reduction).toBe(0);
        });

        test("larger extension produces greater reduction", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 4,
                extensions: [],
            };

            const weekSchedules: WeekSchedule[] = Array.from(
                { length: 4 },
                (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                    stress_metrics: { average_stress: 80, maximum_stress: 95 },
                })
            );

            const reduction1Week = service.estimateStressReduction(
                assignment,
                weekSchedules,
                1
            );
            const reduction2Weeks = service.estimateStressReduction(
                assignment,
                weekSchedules,
                2
            );

            expect(reduction2Weeks).toBeGreaterThan(reduction1Week);
        });
    });

    describe("calculateOptimalExtensions", () => {
        test("recommends extension for high-stress assignment", () => {
            const assignmentWeeks: AssignmentWeek[] = [
                {
                    id: 1,
                    start_week: 1,
                    end_week: 4,
                    extensions: [],
                },
            ];

            const weekSchedules: WeekSchedule[] = [
                {
                    week_number: 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 8,
                    stress_metrics: { average_stress: 75, maximum_stress: 90 },
                },
                {
                    week_number: 2,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                    stress_metrics: { average_stress: 85, maximum_stress: 95 },
                },
                {
                    week_number: 3,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                    stress_metrics: { average_stress: 85, maximum_stress: 95 },
                },
                {
                    week_number: 4,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 15,
                    stress_metrics: { average_stress: 95, maximum_stress: 100 },
                },
                ...Array.from({ length: 8 }, (_, i) => ({
                    week_number: i + 5,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 5,
                    stress_metrics: { average_stress: 50, maximum_stress: 65 },
                })),
            ];

            const recommendations = service.calculateOptimalExtensions(
                assignmentWeeks,
                weekSchedules,
                1,
                3,
                { warning: 75, critical: 85 }
            );

            expect(recommendations.length).toBeGreaterThan(0);
            expect(recommendations[0].assignmentId).toBe(1);
            expect(recommendations[0].extensionWeeks).toBeGreaterThan(0);
            expect(recommendations[0].estimatedStressReduction).toBeGreaterThan(
                5
            );
        });

        test("filters out low-impact extensions", () => {
            const assignmentWeeks: AssignmentWeek[] = [
                {
                    id: 1,
                    start_week: 1,
                    end_week: 1, // Very short assignment - only 1 week
                    extensions: [],
                },
            ];

            const weekSchedules: WeekSchedule[] = Array.from(
                { length: 12 },
                (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 2,
                    stress_metrics: { average_stress: 6, maximum_stress: 12 },
                })
            );

            const recommendations = service.calculateOptimalExtensions(
                assignmentWeeks,
                weekSchedules,
                1,
                3,
                { warning: 75, critical: 85 }
            );

            // Should return empty since reduction would be minimal (< 5 points)
            // For a 1-week assignment with 6 stress, max extension 3 weeks:
            // Best reduction = 6 * (1 - 1/4) = 4.5, which is <= 5 threshold
            expect(recommendations.length).toBe(0);
        });

        test("sorts recommendations by priority (efficiency)", () => {
            const assignmentWeeks: AssignmentWeek[] = [
                {
                    id: 1,
                    start_week: 1,
                    end_week: 3,
                    extensions: [],
                },
                {
                    id: 2,
                    start_week: 4,
                    end_week: 6,
                    extensions: [],
                },
            ];

            const weekSchedules: WeekSchedule[] = [
                ...Array.from({ length: 3 }, (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 12,
                    stress_metrics: { average_stress: 90, maximum_stress: 100 },
                })),
                ...Array.from({ length: 3 }, (_, i) => ({
                    week_number: i + 4,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 15,
                    stress_metrics: { average_stress: 95, maximum_stress: 100 },
                })),
                ...Array.from({ length: 6 }, (_, i) => ({
                    week_number: i + 7,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 5,
                    stress_metrics: { average_stress: 50, maximum_stress: 65 },
                })),
            ];

            const recommendations = service.calculateOptimalExtensions(
                assignmentWeeks,
                weekSchedules,
                1,
                2,
                { warning: 75, critical: 85 }
            );

            // Should have recommendations sorted by priority
            if (recommendations.length > 1) {
                expect(recommendations[0].priority).toBeGreaterThanOrEqual(
                    recommendations[1].priority
                );
            }
        });

        test("excludes assignments that cannot be extended", () => {
            const assignmentWeeks: AssignmentWeek[] = [
                {
                    id: 1,
                    start_week: 1,
                    end_week: 3,
                    extensions: [],
                },
                {
                    id: 2,
                    start_week: 4,
                    end_week: 6,
                    extensions: [],
                },
            ];

            const weekSchedules: WeekSchedule[] = Array.from(
                { length: 12 },
                (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                    stress_metrics: { average_stress: 80, maximum_stress: 95 },
                })
            );

            const recommendations = service.calculateOptimalExtensions(
                assignmentWeeks,
                weekSchedules,
                7, // Current week is past assignment 2
                2,
                { warning: 75, critical: 85 }
            );

            // Should exclude both assignments (already ended)
            expect(recommendations.length).toBe(0);
        });
    });

    describe("applyExtension", () => {
        test("extends assignment deadline correctly", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 4,
                extensions: [],
            };

            const weekSchedules: WeekSchedule[] = Array.from(
                { length: 12 },
                (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 8,
                })
            );

            const result = service.applyExtension(assignment, weekSchedules, 2, 1);

            expect(result.modifiedAssignment.end_week).toBe(6);
            expect(result.modifiedAssignment.extensions).toHaveLength(1);
            expect(result.modifiedAssignment.extensions[0].weeks_extended).toBe(2);
            expect(result.extensionDetails.weeks_extended).toBe(2);
            expect(result.extensionDetails.new_end_week).toBe(6);
        });

        test("redistributes homework hours correctly", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 4,
                extensions: [],
            };

            const weekSchedules: WeekSchedule[] = [
                {
                    week_number: 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                },
                {
                    week_number: 2,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                },
                {
                    week_number: 3,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                },
                {
                    week_number: 4,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                },
                {
                    week_number: 5,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 5,
                },
                {
                    week_number: 6,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 5,
                },
            ];

            const result = service.applyExtension(assignment, weekSchedules, 2, 1);

            // Calculate homework removed from original assignment weeks (1-4)
            const homeworkRemoved = weekSchedules
                .slice(0, 4)
                .reduce(
                    (sum, w, i) => sum + (w.homework_hours - result.modifiedWeeks[i].homework_hours),
                    0
                );

            // Calculate homework added to extension weeks (5-6)
            const homeworkAdded =
                (result.modifiedWeeks[4].homework_hours - weekSchedules[4].homework_hours) +
                (result.modifiedWeeks[5].homework_hours - weekSchedules[5].homework_hours);

            // Hours removed from original weeks should equal hours added to extension weeks
            expect(homeworkAdded).toBeCloseTo(homeworkRemoved, 0.1);

            // Homework in original weeks should be reduced
            expect(result.modifiedWeeks[0].homework_hours).toBeLessThan(
                weekSchedules[0].homework_hours
            );

            // Extension weeks should have added homework
            expect(result.modifiedWeeks[4].homework_hours).toBeGreaterThan(
                weekSchedules[4].homework_hours
            );

            // Average homework per week should be the same across the assignment period
            const originalAvg = weekSchedules.slice(0, 4).reduce((sum, w) => sum + w.homework_hours, 0) / 4;
            const extendedAvg = result.modifiedWeeks.slice(0, 6).reduce((sum, w) => sum + w.homework_hours, 0) / 6;

            // Extended average should be less than original (spread over more weeks)
            expect(extendedAvg).toBeLessThan(originalAvg);
        });

        test("marks affected weeks as adjusted", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 3,
                extensions: [],
            };

            const weekSchedules: WeekSchedule[] = Array.from(
                { length: 6 },
                (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 8,
                })
            );

            const result = service.applyExtension(assignment, weekSchedules, 2, 1);

            // Original period weeks should be adjusted
            expect(result.modifiedWeeks[0].adjusted).toBe(true);
            expect(result.modifiedWeeks[1].adjusted).toBe(true);
            expect(result.modifiedWeeks[2].adjusted).toBe(true);

            // Extension weeks should be adjusted
            expect(result.modifiedWeeks[3].adjusted).toBe(true);
            expect(result.modifiedWeeks[4].adjusted).toBe(true);

            // Unaffected week should not be adjusted
            expect(result.modifiedWeeks[5].adjusted).toBe(false);
        });

        test("tracks optimization changes correctly", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 3,
                extensions: [],
            };

            const weekSchedules: WeekSchedule[] = Array.from(
                { length: 6 },
                (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                })
            );

            const result = service.applyExtension(assignment, weekSchedules, 1, 1);

            // Original weeks should have optimization changes tracked
            const week1 = result.modifiedWeeks[0];
            expect(week1.optimization_changes).toBeDefined();
            expect(week1.optimization_changes?.original_homework_hours).toBe(10);
            expect(week1.optimization_changes?.change_reason).toBe(
                "assignment_extension_applied"
            );

            // Extension week should have optimization changes
            const extensionWeek = result.modifiedWeeks[3];
            expect(extensionWeek.optimization_changes).toBeDefined();
            expect(extensionWeek.optimization_changes?.change_reason).toBe(
                "received_extension_hours"
            );
        });

        test("does not mutate original data", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 4,
                extensions: [],
            };

            const weekSchedules: WeekSchedule[] = Array.from(
                { length: 8 },
                (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 8,
                })
            );

            const originalEndWeek = assignment.end_week;
            const originalHours = weekSchedules[0].homework_hours;

            service.applyExtension(assignment, weekSchedules, 2, 1);

            // Original objects should be unchanged
            expect(assignment.end_week).toBe(originalEndWeek);
            expect(weekSchedules[0].homework_hours).toBe(originalHours);
        });

        test("calculates hours redistributed correctly", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 4,
                extensions: [],
            };

            const weekSchedules: WeekSchedule[] = Array.from(
                { length: 8 },
                (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                })
            );

            const result = service.applyExtension(assignment, weekSchedules, 2, 1);

            expect(result.extensionDetails.homework_hours_affected).toBeGreaterThan(
                0
            );
        });

        test("handles current week in middle of assignment", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 6,
                extensions: [],
            };

            const weekSchedules: WeekSchedule[] = Array.from(
                { length: 10 },
                (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 10,
                })
            );

            const result = service.applyExtension(assignment, weekSchedules, 2, 3);

            // Should only redistribute from week 3 onwards
            expect(result.modifiedWeeks[0].adjusted).toBe(false);
            expect(result.modifiedWeeks[1].adjusted).toBe(false);
            expect(result.modifiedWeeks[2].adjusted).toBe(true);
        });

        test("adds extension record to assignment", () => {
            const assignment: AssignmentWeek = {
                id: 1,
                start_week: 1,
                end_week: 4,
                extensions: [
                    {
                        extension_id: 1,
                        new_end_week: 4,
                        reason: "previous_extension",
                        weeks_extended: 1,
                    },
                ],
            };

            const weekSchedules: WeekSchedule[] = Array.from(
                { length: 8 },
                (_, i) => ({
                    week_number: i + 1,
                    adjusted: false,
                    teaching_hours: 3,
                    lab_hours: 2,
                    homework_hours: 8,
                })
            );

            const result = service.applyExtension(assignment, weekSchedules, 2, 1);

            expect(result.modifiedAssignment.extensions).toHaveLength(2);
            expect(result.modifiedAssignment.extensions[1].extension_id).toBe(2);
            expect(result.modifiedAssignment.extensions[1].weeks_extended).toBe(2);
            expect(result.modifiedAssignment.extensions[1].reason).toBe(
                "stress_reduction"
            );
        });
    });
});
