// backend/src/services/stressCalculation.ts

import type { StressFactors, WeeklyStressMetrics } from "../types/educationalStress";

/**
 * StressCalculator - Educational stress calculation service
 *
 * Calculates student stress levels based on multiple factors:
 * - Workload (teaching + lab + homework hours)
 * - Assignment deadlines
 * - Topic difficulty
 * - Attendance method
 * - Cumulative effects throughout semester
 */
export class StressCalculator {
    /**
     * Calculate comprehensive weekly stress metrics
     */
    calculateWeeklyStress(factors: StressFactors): WeeklyStressMetrics {
        // 1. Calculate base workload stress (normalized 0-100)
        const baseStress = this.calculateWorkloadStress(factors.workloadHours);

        // 2. Calculate deadline pressure
        const deadlineStress = this.calculateDeadlineStress(
            factors.assignmentDeadlines,
            factors.currentWeek,
            factors.totalWeeks
        );

        // 3. Calculate difficulty multiplier
        const difficultyMultiplier = this.calculateDifficultyMultiplier(
            factors.topicDifficulty,
            factors.hasPrerequisites
        );

        // 4. Calculate attendance method impact
        const attendanceModifier = this.getAttendanceModifier(
            factors.attendanceMethod
        );

        // 5. Calculate cumulative stress (stress accumulation over semester)
        const cumulativeFactor = this.calculateCumulativeFactor(
            factors.currentWeek,
            factors.totalWeeks
        );

        // 6. Combine all factors
        const combinedStress = this.combineStressFactors(
            baseStress,
            deadlineStress,
            difficultyMultiplier,
            attendanceModifier,
            cumulativeFactor
        );

        // 7. Calculate distribution (average and maximum)
        const metrics = this.calculateDistribution(
            combinedStress,
            baseStress,
            deadlineStress,
            difficultyMultiplier * attendanceModifier * cumulativeFactor
        );

        return metrics;
    }

    /**
     * Calculate stress from workload hours
     * Uses exponential curve for realistic stress modeling
     *
     * Light load (0-5h):   0-20 stress
     * Normal load (5-10h): 20-50 stress
     * Heavy load (10-15h): 50-75 stress
     * Extreme load (15+h): 75-100 stress
     */
    calculateWorkloadStress(hours: number): number {
        if (hours <= 5) {
            return hours * 4; // Linear up to 20
        } else if (hours <= 10) {
            return 20 + (hours - 5) * 6; // Linear 20-50
        } else if (hours <= 15) {
            return 50 + (hours - 10) * 5; // Linear 50-75
        } else {
            // Exponential growth above 15h
            return Math.min(100, 75 + (hours - 15) * 8);
        }
    }

    /**
     * Calculate stress from assignment deadlines
     * Multiple concurrent deadlines compound stress
     * Stress peaks at mid-semester and end-of-semester
     */
    calculateDeadlineStress(
        deadlineCount: number,
        currentWeek: number,
        totalWeeks: number
    ): number {
        if (deadlineCount === 0) return 0;

        // Base stress: 15 points per deadline
        const baseDeadlineStress = deadlineCount * 15;

        // Semester progress factor (0 to 1)
        const semesterProgress = currentWeek / totalWeeks;

        // Stress increases toward semester end (sinusoidal pattern)
        // Peaks at midterm and finals
        const periodFactor = Math.sin(semesterProgress * Math.PI) + 0.5;

        return baseDeadlineStress * periodFactor;
    }

    /**
     * Calculate difficulty multiplier
     * Harder topics require more cognitive effort
     * Missing prerequisites increases stress
     */
    calculateDifficultyMultiplier(
        difficulty: number,
        hasPrerequisites: boolean
    ): number {
        // Difficulty: 1-5 scale
        // Multiplier range: 1.0 to 1.6
        let multiplier = 1 + (difficulty - 1) * 0.15;

        // Without prerequisites: +20% stress
        if (!hasPrerequisites) {
            multiplier *= 1.2;
        }

        return multiplier;
    }

    /**
     * Get attendance method modifier
     * Different methods affect stress differently
     */
    getAttendanceModifier(method: string): number {
        const modifiers: Record<string, number> = {
            Physical: 1.0, // Baseline
            Online: 0.9, // Slightly less stressful (no commute)
            Hybrid: 0.95, // Mixed
            self_paced: 0.85, // Most flexible
        };

        return modifiers[method] || 1.0;
    }

    /**
     * Calculate cumulative stress factor
     * Stress accumulates as semester progresses
     * Week 1: 1.0x, Mid-semester: 1.25x, Final weeks: 1.5x
     */
    calculateCumulativeFactor(
        currentWeek: number,
        totalWeeks: number
    ): number {
        const progress = currentWeek / totalWeeks;

        // Linear increase with semester progress
        return 1.0 + progress * 0.5;
    }

    /**
     * Combine all stress factors into final stress value
     */
    combineStressFactors(
        baseStress: number,
        deadlineStress: number,
        difficultyMultiplier: number,
        attendanceModifier: number,
        cumulativeFactor: number
    ): number {
        // Weighted combination of all factors
        const workloadComponent = baseStress * difficultyMultiplier;
        const totalStress =
            (workloadComponent + deadlineStress) *
            attendanceModifier *
            cumulativeFactor;

        // Cap at 100
        return Math.min(100, totalStress);
    }

    /**
     * Calculate stress distribution across student population
     * Models students as normal distribution
     */
    calculateDistribution(
        combinedStress: number,
        baseStress: number,
        deadlineStress: number,
        multiplier: number
    ): WeeklyStressMetrics {
        // Model student population as normal distribution
        // Average stress = combinedStress
        // Maximum stress = average + 1.5 * stddev
        // Assume stddev = 15% of average

        const stddev = combinedStress * 0.15;
        const averageStress = combinedStress;
        const maximumStress = Math.min(100, combinedStress + 1.5 * stddev);

        // Generate distribution for visualization (100 students sample)
        const distribution = this.generateNormalDistribution(
            averageStress,
            stddev,
            100
        );

        return {
            baseWorkloadStress: baseStress,
            deadlineStress: deadlineStress,
            difficultyStress: baseStress * (multiplier - 1), // Stress added by difficulty
            cumulativeStress: combinedStress,
            averageStress: Math.round(averageStress * 10) / 10,
            maximumStress: Math.round(maximumStress * 10) / 10,
            stressDistribution: distribution,
        };
    }

    /**
     * Generate normal distribution using Box-Muller transform
     */
    private generateNormalDistribution(
        mean: number,
        stddev: number,
        count: number
    ): number[] {
        const distribution: number[] = [];

        for (let i = 0; i < count; i++) {
            const u1 = Math.random();
            const u2 = Math.random();

            // Box-Muller transform
            const z =
                Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const value = mean + z * stddev;

            // Clamp between 0 and 100
            distribution.push(Math.max(0, Math.min(100, value)));
        }

        // Sort for easier visualization
        return distribution.sort((a, b) => a - b);
    }

    /**
     * Predict next week's stress based on current trajectory
     * and upcoming assignments
     */
    predictNextWeekStress(
        currentFactors: StressFactors,
        upcomingAssignments: number
    ): WeeklyStressMetrics {
        const nextWeekFactors: StressFactors = {
            ...currentFactors,
            currentWeek: currentFactors.currentWeek + 1,
            assignmentDeadlines: upcomingAssignments,
        };

        return this.calculateWeeklyStress(nextWeekFactors);
    }

    /**
     * Validate stress factors input
     */
    validateFactors(factors: StressFactors): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (factors.workloadHours < 0) {
            errors.push("Workload hours cannot be negative");
        }

        if (factors.workloadHours > 80) {
            errors.push("Workload hours exceed reasonable maximum (80h/week)");
        }

        if (factors.assignmentDeadlines < 0) {
            errors.push("Assignment deadlines cannot be negative");
        }

        if (factors.topicDifficulty < 1 || factors.topicDifficulty > 5) {
            errors.push("Topic difficulty must be between 1 and 5");
        }

        if (factors.currentWeek < 1 || factors.currentWeek > factors.totalWeeks) {
            errors.push("Current week must be between 1 and total weeks");
        }

        if (factors.totalWeeks < 1 || factors.totalWeeks > 52) {
            errors.push("Total weeks must be between 1 and 52");
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
