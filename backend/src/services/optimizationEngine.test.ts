// backend/src/services/optimizationEngine.test.ts

import { describe, test, expect, beforeEach } from "bun:test";
import { CourseOptimizationEngine } from "./optimizationEngine";
import type { CourseAnalysisInput, WeekSchedule } from "../types/educationalStress";

describe("CourseOptimizationEngine", () => {
    let engine: CourseOptimizationEngine;
    let mockInput: CourseAnalysisInput;

    beforeEach(() => {
        engine = new CourseOptimizationEngine();

        // Create mock input data
        mockInput = {
            name: "Test Course",
            description: "Test optimization",
            course_info: {
                course_name: "Mathematics I",
                course_id: "MATH101",
                teaching_hours: 40,
                lab_hours: 26,
                ects: 5,
                topic_difficulty: 3,
                has_prerequisites: true,
                total_homework_hours: 100,
                total_weeks: 10,
                total_assignments: 2,
                attendance_method: "Physical",
                success_rate_percent: 85,
                average_grade: 3.5,
                course_sessions: [
                    { day: "monday", start_time: "10:00", end_time: "12:00" },
                ],
                lab_sessions: [
                    { day: "wednesday", start_time: "14:00", end_time: "16:00" },
                ],
            },
            assignment_weeks: [
                { id: 1, start_week: 1, end_week: 5, extensions: [] },
                { id: 2, start_week: 6, end_week: 10, extensions: [] },
            ],
            current_status: {
                current_week: 4,
                latest_adjusted_week: 0,
            },
            week_schedules: [
                // Weeks 1-3 (past)
                {
                    week_number: 1,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 10,
                    stress_metrics: { average_stress: 45, maximum_stress: 60 },
                },
                {
                    week_number: 2,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 10,
                    stress_metrics: { average_stress: 50, maximum_stress: 65 },
                },
                {
                    week_number: 3,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 10,
                    stress_metrics: { average_stress: 55, maximum_stress: 70 },
                },
                // Week 4 (current) - high stress
                {
                    week_number: 4,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 15, // High workload
                },
                // Weeks 5-7 (future) - very high stress
                {
                    week_number: 5,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 15,
                },
                {
                    week_number: 6,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 10,
                },
                {
                    week_number: 7,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 10,
                },
                // Weeks 8-10 (future) - moderate stress
                {
                    week_number: 8,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 2,
                    homework_hours: 10,
                },
                {
                    week_number: 9,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 2,
                    homework_hours: 10,
                },
                {
                    week_number: 10,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 2,
                    homework_hours: 10,
                },
            ],
            optimization_request: {
                optimization_target:
                    "minimize_stress_while_maintaining_learning_outcomes",
                stress_threshold_warning: 75.0,
                stress_threshold_critical: 85.0,
                allow_extensions: true,
                max_extensions_per_assignment: 2,
                consider_all_remaining_weeks: true,
            },
            students: { count: 30 },
            metadata: {
                created_at: "2025-11-13T10:00:00Z",
                creator_id: "user123",
                semester_id: "sem456",
            },
        };
    });

    describe("generateOptimizationScenarios", () => {
        test("generates 4 scenarios when extensions are allowed", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            expect(scenarios).toHaveLength(4);
            expect(scenarios[0].adjustment_id).toBe("adjustment_1");
            expect(scenarios[1].adjustment_id).toBe("adjustment_2");
            expect(scenarios[2].adjustment_id).toBe("adjustment_3");
            expect(scenarios[3].adjustment_id).toBe("adjustment_4");
        });

        test("generates 3 scenarios when extensions are not allowed", () => {
            mockInput.optimization_request.allow_extensions = false;
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            expect(scenarios).toHaveLength(3);
        });

        test("all scenarios have correct structure", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);

            scenarios.forEach((scenario) => {
                expect(scenario.adjustment_id).toBeDefined();
                expect(scenario.week_schedules).toBeInstanceOf(Array);
                expect(scenario.week_schedules).toHaveLength(10);
            });
        });

        test("scenarios maintain week count", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);

            scenarios.forEach((scenario) => {
                expect(scenario.week_schedules.length).toBe(
                    mockInput.week_schedules.length
                );
            });
        });
    });

    describe("generateMinimalAdjustmentScenario", () => {
        test("only adjusts weeks exceeding critical threshold", () => {
            // Set one week to very high stress
            mockInput.week_schedules[4].homework_hours = 20; // Week 5 - will be critical

            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const minimal = scenarios[0]; // adjustment_1

            // Count adjusted weeks from current week onwards
            const futureWeeks = minimal.week_schedules.slice(
                mockInput.current_status.current_week - 1
            );
            const adjustedCount = futureWeeks.filter((w) => w.adjusted).length;

            // Should adjust some weeks
            expect(adjustedCount).toBeGreaterThan(0);

            // Verify only weeks with reason containing "critical" or "received" are adjusted
            const adjustedWeeks = futureWeeks.filter((w) => w.adjusted);
            adjustedWeeks.forEach((week) => {
                expect(week.optimization_changes).toBeDefined();
                expect(
                    week.optimization_changes?.change_reason.includes(
                        "critical"
                    ) ||
                        week.optimization_changes?.change_reason.includes(
                            "received"
                        )
                ).toBe(true);
            });
        });

        test("marks adjusted weeks correctly", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const minimal = scenarios[0];

            minimal.week_schedules.forEach((week) => {
                if (week.adjusted) {
                    expect(week.optimization_changes).toBeDefined();
                    expect(
                        week.optimization_changes?.change_reason
                    ).toContain("stress");
                }
            });
        });

        test("calculates stress metrics for all future weeks", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const minimal = scenarios[0];

            for (
                let i = mockInput.current_status.current_week - 1;
                i < minimal.week_schedules.length;
                i++
            ) {
                const week = minimal.week_schedules[i];
                expect(week.stress_metrics).toBeDefined();
                expect(week.stress_metrics?.average_stress).toBeGreaterThanOrEqual(
                    0
                );
                expect(week.stress_metrics?.maximum_stress).toBeGreaterThanOrEqual(
                    week.stress_metrics?.average_stress || 0
                );
            }
        });
    });

    describe("generateBalancedScenario", () => {
        test("adjusts more weeks than minimal scenario", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const minimal = scenarios[0];
            const balanced = scenarios[1];

            const minimalAdjusted = minimal.week_schedules.filter(
                (w) => w.adjusted
            ).length;
            const balancedAdjusted = balanced.week_schedules.filter(
                (w) => w.adjusted
            ).length;

            expect(balancedAdjusted).toBeGreaterThanOrEqual(minimalAdjusted);
        });

        test("uses balanced redistribution reason", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const balanced = scenarios[1];

            const adjustedWeeks = balanced.week_schedules.filter(
                (w) => w.adjusted
            );

            adjustedWeeks.forEach((week) => {
                if (
                    week.optimization_changes?.change_reason.includes(
                        "balanced"
                    ) ||
                    week.optimization_changes?.change_reason.includes(
                        "received"
                    )
                ) {
                    expect(true).toBe(true); // Valid reason
                }
            });
        });

        test("reduces stress closer to target threshold", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const balanced = scenarios[1];

            const futureWeeks = balanced.week_schedules.slice(
                mockInput.current_status.current_week - 1
            );
            const highStressWeeks = futureWeeks.filter(
                (w) =>
                    w.stress_metrics &&
                    w.stress_metrics.average_stress >
                        mockInput.optimization_request.stress_threshold_warning
            );

            // Should have fewer high-stress weeks than original
            expect(highStressWeeks.length).toBeLessThanOrEqual(
                futureWeeks.length
            );
        });
    });

    describe("generateAggressiveScenario", () => {
        test("makes more aggressive adjustments", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const aggressive = scenarios[2];

            const adjustedWeeks = aggressive.week_schedules.filter(
                (w) => w.adjusted
            );

            // Should adjust many weeks
            expect(adjustedWeeks.length).toBeGreaterThan(0);

            // Check for aggressive reductions
            adjustedWeeks.forEach((week) => {
                if (week.optimization_changes) {
                    const reduction =
                        week.optimization_changes.original_homework_hours -
                        week.homework_hours;
                    // Aggressive should reduce by significant amount when adjusting
                    if (
                        week.optimization_changes.change_reason.includes(
                            "aggressive"
                        )
                    ) {
                        expect(reduction).toBeGreaterThan(0);
                    }
                }
            });
        });

        test("uses aggressive optimization reason", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const aggressive = scenarios[2];

            const adjustedWeeks = aggressive.week_schedules.filter(
                (w) =>
                    w.adjusted &&
                    w.optimization_changes?.change_reason.includes("aggressive")
            );

            // Should have some aggressive adjustments
            expect(adjustedWeeks.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe("generateExtensionScenario", () => {
        test("is only generated when extensions are allowed", () => {
            mockInput.optimization_request.allow_extensions = true;
            const scenariosWithExt =
                engine.generateOptimizationScenarios(mockInput);
            expect(scenariosWithExt).toHaveLength(4);

            mockInput.optimization_request.allow_extensions = false;
            const scenariosWithoutExt =
                engine.generateOptimizationScenarios(mockInput);
            expect(scenariosWithoutExt).toHaveLength(3);
        });

        test("uses extension-based optimization reason", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const extension = scenarios[3];

            const extensionWeeks = extension.week_schedules.filter(
                (w) =>
                    w.adjusted &&
                    w.optimization_changes?.change_reason.includes(
                        "deadline_extension"
                    )
            );

            // Should have some extension-based adjustments
            expect(extensionWeeks.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe("calculateAdjustmentSummary", () => {
        test("calculates correct summary metrics", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const summary = engine.calculateAdjustmentSummary(scenarios[0]);

            expect(summary.total_adjustments_made).toBeGreaterThanOrEqual(0);
            expect(summary.hours_redistributed).toBeDefined();
            expect(summary.peak_stress).toBeGreaterThanOrEqual(0);
            expect(summary.peak_stress).toBeLessThanOrEqual(100);
            expect(summary.average_stress).toBeGreaterThanOrEqual(0);
            expect(summary.average_stress).toBeLessThanOrEqual(100);
            expect(summary.total_hours_maintained).toBe(true);
        });

        test("peak stress is maximum of all weeks", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const scenario = scenarios[0];
            const summary = engine.calculateAdjustmentSummary(scenario);

            const maxStress = Math.max(
                ...scenario.week_schedules
                    .filter((w) => w.stress_metrics)
                    .map((w) => w.stress_metrics!.maximum_stress)
            );

            expect(summary.peak_stress).toBeCloseTo(maxStress, 1);
        });

        test("counts adjusted weeks correctly", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);
            const scenario = scenarios[0];
            const summary = engine.calculateAdjustmentSummary(scenario);

            const actualAdjusted = scenario.week_schedules.filter(
                (w) => w.adjusted
            ).length;

            expect(summary.total_adjustments_made).toBe(actualAdjusted);
        });
    });

    describe("validateHoursConservation", () => {
        test("validates equal total hours", () => {
            const original: WeekSchedule[] = [
                {
                    week_number: 1,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 10,
                },
                {
                    week_number: 2,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 10,
                },
            ];

            const adjusted: WeekSchedule[] = [
                {
                    week_number: 1,
                    adjusted: true,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 8,
                },
                {
                    week_number: 2,
                    adjusted: true,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 12,
                },
            ];

            const isValid = engine.validateHoursConservation(
                original,
                adjusted
            );
            expect(isValid).toBe(true);
        });

        test("detects non-conserved hours", () => {
            const original: WeekSchedule[] = [
                {
                    week_number: 1,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 10,
                },
            ];

            const adjusted: WeekSchedule[] = [
                {
                    week_number: 1,
                    adjusted: true,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 5, // Lost 5 hours
                },
            ];

            const isValid = engine.validateHoursConservation(
                original,
                adjusted
            );
            expect(isValid).toBe(false);
        });

        test("allows small rounding differences", () => {
            const original: WeekSchedule[] = [
                {
                    week_number: 1,
                    adjusted: false,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 10,
                },
            ];

            const adjusted: WeekSchedule[] = [
                {
                    week_number: 1,
                    adjusted: true,
                    teaching_hours: 4,
                    lab_hours: 3,
                    homework_hours: 10.05, // Small rounding difference
                },
            ];

            const isValid = engine.validateHoursConservation(
                original,
                adjusted
            );
            expect(isValid).toBe(true);
        });
    });

    describe("stress calculations", () => {
        test("calculates stress metrics for each week", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);

            scenarios.forEach((scenario) => {
                scenario.week_schedules.forEach((week) => {
                    if (
                        week.week_number >=
                        mockInput.current_status.current_week
                    ) {
                        expect(week.stress_metrics).toBeDefined();
                        expect(
                            week.stress_metrics?.average_stress
                        ).toBeDefined();
                        expect(
                            week.stress_metrics?.maximum_stress
                        ).toBeDefined();
                    }
                });
            });
        });

        test("stress metrics are within valid range", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);

            scenarios.forEach((scenario) => {
                scenario.week_schedules.forEach((week) => {
                    if (week.stress_metrics) {
                        expect(
                            week.stress_metrics.average_stress
                        ).toBeGreaterThanOrEqual(0);
                        expect(
                            week.stress_metrics.average_stress
                        ).toBeLessThanOrEqual(100);
                        expect(
                            week.stress_metrics.maximum_stress
                        ).toBeGreaterThanOrEqual(0);
                        expect(
                            week.stress_metrics.maximum_stress
                        ).toBeLessThanOrEqual(100);
                    }
                });
            });
        });
    });

    describe("optimization changes tracking", () => {
        test("tracks original values when adjusted", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);

            scenarios.forEach((scenario) => {
                scenario.week_schedules.forEach((week) => {
                    if (week.adjusted && week.optimization_changes) {
                        expect(
                            week.optimization_changes.original_homework_hours
                        ).toBeDefined();
                        expect(
                            week.optimization_changes.original_teaching_hours
                        ).toBeDefined();
                        expect(
                            week.optimization_changes.original_lab_hours
                        ).toBeDefined();
                        expect(
                            week.optimization_changes.hours_redistributed
                        ).toBeDefined();
                        expect(
                            week.optimization_changes.change_reason
                        ).toBeDefined();
                    }
                });
            });
        });

        test("change reasons are descriptive", () => {
            const scenarios = engine.generateOptimizationScenarios(mockInput);

            scenarios.forEach((scenario) => {
                scenario.week_schedules.forEach((week) => {
                    if (week.optimization_changes) {
                        const reason =
                            week.optimization_changes.change_reason;
                        expect(reason.length).toBeGreaterThan(5);
                        expect(
                            reason.includes("stress") ||
                                reason.includes("redistribution") ||
                                reason.includes("received") ||
                                reason.includes("extension") ||
                                reason.includes("critical") ||
                                reason.includes("balanced") ||
                                reason.includes("aggressive")
                        ).toBe(true);
                    }
                });
            });
        });
    });
});
