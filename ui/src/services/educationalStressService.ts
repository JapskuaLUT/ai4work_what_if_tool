// ui/src/services/educationalStressService.ts

import type {
    CourseAnalysisInput,
    CourseAnalysisOutput,
    AdjustmentDetail,
    SimulationStartResponse,
} from "../types/educationalStress";

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000";

/**
 * Create a new educational stress simulation
 * Generates multiple optimization scenarios for the course
 */
export async function createEducationalSimulation(
    input: CourseAnalysisInput
): Promise<SimulationStartResponse> {
    const response = await fetch(`${API_BASE_URL}/simulations/education/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            error.message || "Failed to create educational simulation"
        );
    }

    return response.json();
}

/**
 * Fetch an educational simulation with all adjustment scenarios
 */
export async function fetchEducationalSimulation(
    caseId: string
): Promise<CourseAnalysisOutput> {
    const response = await fetch(
        `${API_BASE_URL}/simulations/education/${caseId}`
    );

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Simulation not found");
        }
        const error = await response.json();
        throw new Error(
            error.message || "Failed to fetch educational simulation"
        );
    }

    return response.json();
}

/**
 * Fetch details for a specific adjustment scenario
 */
export async function fetchAdjustmentDetails(
    caseId: string,
    adjustmentId: string
): Promise<AdjustmentDetail> {
    const response = await fetch(
        `${API_BASE_URL}/simulations/education/${caseId}/${adjustmentId}`
    );

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Adjustment scenario not found");
        }
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch adjustment details");
    }

    return response.json();
}

/**
 * Calculate summary statistics for a set of week schedules
 */
export function calculateWeekSummary(weeks: any[]) {
    const adjustedWeeks = weeks.filter((w) => w.adjusted);
    const totalWeeks = weeks.length;

    const avgStress =
        weeks.reduce((sum, w) => sum + (w.stress_metrics?.average_stress || 0), 0) /
        totalWeeks;

    const peakStress = Math.max(
        ...weeks.map((w) => w.stress_metrics?.maximum_stress || 0)
    );

    return {
        adjustedCount: adjustedWeeks.length,
        totalWeeks,
        averageStress: Math.round(avgStress * 10) / 10,
        peakStress: Math.round(peakStress * 10) / 10,
    };
}

/**
 * Get color for stress level based on thresholds
 */
export function getStressColor(
    stress: number,
    thresholds: { warning: number; critical: number }
): string {
    if (stress >= thresholds.critical) return "text-red-600";
    if (stress >= thresholds.warning) return "text-yellow-600";
    return "text-green-600";
}

/**
 * Get background color for stress level
 */
export function getStressBackgroundColor(
    stress: number,
    thresholds: { warning: number; critical: number }
): string {
    if (stress >= thresholds.critical) return "bg-red-50";
    if (stress >= thresholds.warning) return "bg-yellow-50";
    return "bg-green-50";
}

/**
 * Format stress value for display
 */
export function formatStress(stress: number): string {
    return stress.toFixed(1);
}

/**
 * Get human-readable name for adjustment scenario
 */
export function getAdjustmentName(adjustmentId: string): string {
    const names: Record<string, string> = {
        adjustment_1: "Minimal Adjustment",
        adjustment_2: "Balanced Redistribution",
        adjustment_3: "Aggressive Optimization",
        adjustment_4: "Extension-Based",
    };
    return names[adjustmentId] || "Custom Adjustment";
}

/**
 * Get description for adjustment scenario
 */
export function getAdjustmentDescription(adjustmentId: string): string {
    const descriptions: Record<string, string> = {
        adjustment_1:
            "Only adjusts weeks that exceed the critical stress threshold. Minimal disruption to the original schedule.",
        adjustment_2:
            "Smooths out stress across all remaining weeks, targeting a balanced workload distribution.",
        adjustment_3:
            "Aggressively reduces stress on all high-stress weeks for maximum stress reduction.",
        adjustment_4:
            "Uses assignment deadline extensions strategically to reduce stress peaks.",
    };
    return descriptions[adjustmentId] || "Custom optimization strategy";
}

/**
 * Calculate stress reduction percentage between two scenarios
 */
export function calculateStressReduction(
    originalWeeks: any[],
    adjustedWeeks: any[]
): number {
    const originalAvg =
        originalWeeks.reduce(
            (sum, w) => sum + (w.stress_metrics?.average_stress || 0),
            0
        ) / originalWeeks.length;

    const adjustedAvg =
        adjustedWeeks.reduce(
            (sum, w) => sum + (w.stress_metrics?.average_stress || 0),
            0
        ) / adjustedWeeks.length;

    const reduction = ((originalAvg - adjustedAvg) / originalAvg) * 100;
    return Math.max(0, Math.round(reduction * 10) / 10);
}
