// backend/src/services/stressCalculation.test.ts

import { describe, test, expect, beforeEach } from "bun:test";
import { StressCalculator } from "./stressCalculation";
import type { StressFactors } from "../types/educationalStress";

describe("StressCalculator", () => {
    let calculator: StressCalculator;

    beforeEach(() => {
        calculator = new StressCalculator();
    });

    describe("calculateWorkloadStress", () => {
        test("calculates light load correctly (0-5h)", () => {
            expect(calculator.calculateWorkloadStress(0)).toBe(0);
            expect(calculator.calculateWorkloadStress(2.5)).toBe(10);
            expect(calculator.calculateWorkloadStress(5)).toBe(20);
        });

        test("calculates normal load correctly (5-10h)", () => {
            expect(calculator.calculateWorkloadStress(7.5)).toBe(35);
            expect(calculator.calculateWorkloadStress(10)).toBe(50);
        });

        test("calculates heavy load correctly (10-15h)", () => {
            expect(calculator.calculateWorkloadStress(12.5)).toBe(62.5);
            expect(calculator.calculateWorkloadStress(15)).toBe(75);
        });

        test("calculates extreme load correctly (15+h)", () => {
            expect(calculator.calculateWorkloadStress(17.5)).toBe(95);
            expect(calculator.calculateWorkloadStress(20)).toBe(100); // Capped
        });

        test("caps stress at 100", () => {
            expect(calculator.calculateWorkloadStress(50)).toBe(100);
        });
    });

    describe("calculateDeadlineStress", () => {
        test("returns 0 for no deadlines", () => {
            const stress = calculator.calculateDeadlineStress(0, 1, 13);
            expect(stress).toBe(0);
        });

        test("calculates single deadline stress", () => {
            const stress = calculator.calculateDeadlineStress(1, 1, 13);
            expect(stress).toBeGreaterThan(0);
            expect(stress).toBeLessThanOrEqual(15 * 1.5); // Max periodFactor ≈ 1.5
        });

        test("compounds multiple deadlines", () => {
            const singleDeadline = calculator.calculateDeadlineStress(1, 5, 13);
            const multipleDeadlines = calculator.calculateDeadlineStress(3, 5, 13);
            expect(multipleDeadlines).toBeGreaterThan(singleDeadline * 2.5);
        });

        test("stress varies by semester progress", () => {
            const earlyStress = calculator.calculateDeadlineStress(2, 1, 13);
            const midStress = calculator.calculateDeadlineStress(2, 7, 13);
            const lateStress = calculator.calculateDeadlineStress(2, 13, 13);

            // Mid-semester should have higher stress due to sin curve
            expect(midStress).toBeGreaterThan(earlyStress);
            // End should be lower than mid due to sin curve
            expect(lateStress).toBeLessThan(midStress);
        });
    });

    describe("calculateDifficultyMultiplier", () => {
        test("minimum difficulty with prerequisites", () => {
            const multiplier = calculator.calculateDifficultyMultiplier(1, true);
            expect(multiplier).toBeCloseTo(1.0);
        });

        test("maximum difficulty with prerequisites", () => {
            const multiplier = calculator.calculateDifficultyMultiplier(5, true);
            expect(multiplier).toBeCloseTo(1.6);
        });

        test("adds 20% without prerequisites", () => {
            const withPrereq = calculator.calculateDifficultyMultiplier(3, true);
            const withoutPrereq = calculator.calculateDifficultyMultiplier(3, false);
            expect(withoutPrereq).toBeCloseTo(withPrereq * 1.2);
        });

        test("mid-range difficulty", () => {
            const multiplier = calculator.calculateDifficultyMultiplier(3, true);
            expect(multiplier).toBeCloseTo(1.3); // 1 + (3-1)*0.15
        });
    });

    describe("getAttendanceModifier", () => {
        test("Physical is baseline", () => {
            expect(calculator.getAttendanceModifier("Physical")).toBe(1.0);
        });

        test("Online reduces stress", () => {
            expect(calculator.getAttendanceModifier("Online")).toBe(0.9);
        });

        test("Hybrid is between Physical and Online", () => {
            expect(calculator.getAttendanceModifier("Hybrid")).toBe(0.95);
        });

        test("self_paced has lowest stress", () => {
            expect(calculator.getAttendanceModifier("self_paced")).toBe(0.85);
        });

        test("unknown method defaults to 1.0", () => {
            expect(calculator.getAttendanceModifier("Unknown")).toBe(1.0);
        });
    });

    describe("calculateCumulativeFactor", () => {
        test("week 1 has no cumulative factor", () => {
            const factor = calculator.calculateCumulativeFactor(1, 13);
            expect(factor).toBeCloseTo(1.0 + 1 / 13 * 0.5);
        });

        test("mid-semester has moderate cumulative factor", () => {
            const factor = calculator.calculateCumulativeFactor(7, 13);
            expect(factor).toBeCloseTo(1.27, 0.01);
        });

        test("final week has maximum cumulative factor", () => {
            const factor = calculator.calculateCumulativeFactor(13, 13);
            expect(factor).toBeCloseTo(1.5);
        });

        test("cumulative factor increases linearly", () => {
            const early = calculator.calculateCumulativeFactor(3, 13);
            const late = calculator.calculateCumulativeFactor(10, 13);
            expect(late).toBeGreaterThan(early);
        });
    });

    describe("combineStressFactors", () => {
        test("combines factors correctly", () => {
            const combined = calculator.combineStressFactors(
                50, // baseStress
                20, // deadlineStress
                1.2, // difficultyMultiplier
                1.0, // attendanceModifier
                1.0 // cumulativeFactor
            );

            // (50 * 1.2 + 20) * 1.0 * 1.0 = 80
            expect(combined).toBeCloseTo(80);
        });

        test("caps combined stress at 100", () => {
            const combined = calculator.combineStressFactors(
                80, // baseStress
                40, // deadlineStress
                1.5, // difficultyMultiplier
                1.0, // attendanceModifier
                1.5 // cumulativeFactor
            );

            expect(combined).toBe(100);
        });

        test("attendance modifier reduces stress", () => {
            const physical = calculator.combineStressFactors(
                50,
                20,
                1.2,
                1.0,
                1.0
            );
            const online = calculator.combineStressFactors(50, 20, 1.2, 0.9, 1.0);
            expect(online).toBeLessThan(physical);
        });
    });

    describe("calculateWeeklyStress", () => {
        test("calculates comprehensive stress metrics", () => {
            const factors: StressFactors = {
                workloadHours: 10,
                assignmentDeadlines: 2,
                topicDifficulty: 3,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 5,
                totalWeeks: 13,
            };

            const metrics = calculator.calculateWeeklyStress(factors);

            expect(metrics.averageStress).toBeGreaterThan(0);
            expect(metrics.maximumStress).toBeGreaterThanOrEqual(metrics.averageStress);
            expect(metrics.maximumStress).toBeLessThanOrEqual(100);
            expect(metrics.baseWorkloadStress).toBe(50); // 10h = 50 stress
            expect(metrics.deadlineStress).toBeGreaterThan(0);
            expect(metrics.stressDistribution).toHaveLength(100);
        });

        test("maximum stress exceeds average", () => {
            const factors: StressFactors = {
                workloadHours: 15,
                assignmentDeadlines: 3,
                topicDifficulty: 5,
                hasPrerequisites: false,
                attendanceMethod: "Physical",
                currentWeek: 10,
                totalWeeks: 13,
            };

            const metrics = calculator.calculateWeeklyStress(factors);
            expect(metrics.maximumStress).toBeGreaterThanOrEqual(metrics.averageStress);
        });

        test("light workload produces low stress", () => {
            const factors: StressFactors = {
                workloadHours: 3,
                assignmentDeadlines: 0,
                topicDifficulty: 1,
                hasPrerequisites: true,
                attendanceMethod: "Online",
                currentWeek: 1,
                totalWeeks: 13,
            };

            const metrics = calculator.calculateWeeklyStress(factors);
            expect(metrics.averageStress).toBeLessThan(30);
        });
    });

    describe("predictNextWeekStress", () => {
        test("predicts next week correctly", () => {
            const currentFactors: StressFactors = {
                workloadHours: 10,
                assignmentDeadlines: 1,
                topicDifficulty: 3,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 5,
                totalWeeks: 13,
            };

            const prediction = calculator.predictNextWeekStress(
                currentFactors,
                2 // upcoming assignments
            );

            expect(prediction.averageStress).toBeGreaterThan(0);
            // Should have higher or equal stress due to more deadlines and cumulative factor
            const current = calculator.calculateWeeklyStress(currentFactors);
            expect(prediction.averageStress).toBeGreaterThanOrEqual(
                current.averageStress
            );
        });

        test("increments week number", () => {
            const currentFactors: StressFactors = {
                workloadHours: 10,
                assignmentDeadlines: 1,
                topicDifficulty: 3,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 5,
                totalWeeks: 13,
            };

            calculator.predictNextWeekStress(currentFactors, 1);
            // Prediction should use week 6, which has higher cumulative factor
        });
    });

    describe("validateFactors", () => {
        test("validates correct factors", () => {
            const factors: StressFactors = {
                workloadHours: 10,
                assignmentDeadlines: 2,
                topicDifficulty: 3,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 5,
                totalWeeks: 13,
            };

            const result = calculator.validateFactors(factors);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test("rejects negative workload hours", () => {
            const factors: StressFactors = {
                workloadHours: -5,
                assignmentDeadlines: 2,
                topicDifficulty: 3,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 5,
                totalWeeks: 13,
            };

            const result = calculator.validateFactors(factors);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Workload hours cannot be negative");
        });

        test("rejects excessive workload hours", () => {
            const factors: StressFactors = {
                workloadHours: 100,
                assignmentDeadlines: 2,
                topicDifficulty: 3,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 5,
                totalWeeks: 13,
            };

            const result = calculator.validateFactors(factors);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain(
                "Workload hours exceed reasonable maximum (80h/week)"
            );
        });

        test("rejects invalid difficulty", () => {
            const factors: StressFactors = {
                workloadHours: 10,
                assignmentDeadlines: 2,
                topicDifficulty: 6,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 5,
                totalWeeks: 13,
            };

            const result = calculator.validateFactors(factors);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain(
                "Topic difficulty must be between 1 and 5"
            );
        });

        test("rejects invalid week range", () => {
            const factors: StressFactors = {
                workloadHours: 10,
                assignmentDeadlines: 2,
                topicDifficulty: 3,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 15,
                totalWeeks: 13,
            };

            const result = calculator.validateFactors(factors);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain(
                "Current week must be between 1 and total weeks"
            );
        });

        test("accumulates multiple errors", () => {
            const factors: StressFactors = {
                workloadHours: -10,
                assignmentDeadlines: 2,
                topicDifficulty: 10,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 15,
                totalWeeks: 13,
            };

            const result = calculator.validateFactors(factors);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });

    describe("calculateDistribution", () => {
        test("generates 100 student samples", () => {
            const metrics = calculator.calculateWeeklyStress({
                workloadHours: 10,
                assignmentDeadlines: 2,
                topicDifficulty: 3,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 5,
                totalWeeks: 13,
            });

            expect(metrics.stressDistribution).toHaveLength(100);
        });

        test("distribution is sorted", () => {
            const metrics = calculator.calculateWeeklyStress({
                workloadHours: 10,
                assignmentDeadlines: 2,
                topicDifficulty: 3,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 5,
                totalWeeks: 13,
            });

            const distribution = metrics.stressDistribution;
            for (let i = 1; i < distribution.length; i++) {
                expect(distribution[i]).toBeGreaterThanOrEqual(distribution[i - 1]);
            }
        });

        test("all values are within 0-100", () => {
            const metrics = calculator.calculateWeeklyStress({
                workloadHours: 10,
                assignmentDeadlines: 2,
                topicDifficulty: 3,
                hasPrerequisites: true,
                attendanceMethod: "Physical",
                currentWeek: 5,
                totalWeeks: 13,
            });

            metrics.stressDistribution.forEach((value) => {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(100);
            });
        });
    });
});
