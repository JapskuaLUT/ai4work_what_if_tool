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

/**
 * Select an adjustment scenario as the preferred option
 */
export async function selectAdjustment(
    caseId: string,
    adjustmentId: string
): Promise<{
    success: boolean;
    caseId: string;
    selectedAdjustmentId: string;
    selectedAt: string;
}> {
    const response = await fetch(
        `${API_BASE_URL}/simulations/education/${caseId}/select`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ adjustmentId }),
        }
    );

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Simulation or adjustment not found");
        }
        const error = await response.json();
        throw new Error(error.message || "Failed to select adjustment");
    }

    return response.json();
}

/**
 * Get the currently selected adjustment scenario
 */
export async function getSelectedAdjustment(caseId: string): Promise<{
    hasSelection: boolean;
    caseId: string;
    selectedAdjustmentId: string | null;
    selectedAt: string | null;
    adjustment?: {
        adjustment_id: string;
        name: string;
        feasibility_score: number;
        key_changes: string;
        summary_metrics: any;
    };
    warning?: string;
}> {
    const response = await fetch(
        `${API_BASE_URL}/simulations/education/${caseId}/selection`
    );

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Simulation not found");
        }
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch selection");
    }

    return response.json();
}

// ============================================================================
// course_stress_prediction v1.0
// ============================================================================

import type {
    AdjustmentRequest,
    EducationCaseV1,
    ScenarioListEntry,
    ScenarioResult,
    StressModelConfig,
    WeeklyResult,
    WeekScheduleV1,
} from "../types/educationalStress";

/** §2 — the classification bands. Distinct from the warning/critical thresholds. */
export type StressClassification = "Low" | "Moderate" | "High";

export function classifyStress(stress: number): StressClassification {
    if (stress <= 33) return "Low";
    if (stress <= 66) return "Moderate";
    return "High";
}

/** True when a case was computed with v1.0 rather than the pre-v1.0 calculator. */
export function isV1Case(caseData: { stress_model?: { version?: string } | null }): boolean {
    const version = caseData?.stress_model?.version;
    return Boolean(version) && version !== "legacy-0";
}

/**
 * Read the versioned model configuration the backend is using. Useful for
 * showing users which model produced the numbers they are looking at.
 */
export async function fetchStressModel(): Promise<{
    stress_model: StressModelConfig;
    classification_bands: Record<string, unknown>;
    components: Record<string, unknown>;
    schedule_build: Record<string, unknown>;
}> {
    const response = await fetch(
        `${API_BASE_URL}/simulations/education/stress-model`
    );
    if (!response.ok) throw new Error("Failed to fetch the stress model configuration");
    return response.json();
}

/** Run a week series through the model directly. No persistence. */
export async function evaluateStressModel(
    weeks: Array<Partial<WeekScheduleV1> & { actual_stress?: number | null }>,
    useObservedStress = true
) {
    const response = await fetch(
        `${API_BASE_URL}/simulations/education/stress-model/evaluate`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weeks, use_observed_stress: useObservedStress }),
        }
    );
    if (!response.ok) throw new Error("Failed to evaluate the stress model");
    return response.json();
}

/** Fetch a v1 case with its domain objects, baseline and scenario list. */
export async function fetchEducationCaseV1(
    caseId: string
): Promise<EducationCaseV1> {
    const response = await fetch(
        `${API_BASE_URL}/simulations/education/${caseId}`
    );
    if (!response.ok) {
        if (response.status === 404) throw new Error("Simulation not found");
        throw new Error("Failed to fetch the simulation");
    }
    return response.json();
}

export async function listScenarios(
    caseId: string,
    origin?: "generated" | "user"
): Promise<ScenarioListEntry[]> {
    const query = origin ? `?origin=${origin}` : "";
    const response = await fetch(
        `${API_BASE_URL}/simulations/education/${caseId}/scenarios${query}`
    );
    if (!response.ok) throw new Error("Failed to list scenarios");
    const data = await response.json();
    return data.scenarios;
}

export async function fetchScenario(caseId: string, scenarioId: string) {
    const response = await fetch(
        `${API_BASE_URL}/simulations/education/${caseId}/scenarios/${scenarioId}`
    );
    if (!response.ok) {
        if (response.status === 404) throw new Error("Scenario not found");
        throw new Error("Failed to fetch the scenario");
    }
    return response.json();
}

/**
 * Simulate a what-if scenario. Returns the full §11 comparison, including the
 * outcome of every adjustment — a 201 does not mean every adjustment applied,
 * so callers must read `adjustment_outcomes`.
 */
export async function createScenario(
    caseId: string,
    body: {
        name?: string;
        description?: string;
        adjustments: AdjustmentRequest[];
        options?: {
            redistribution_objective?: "local_week" | "trajectory_peak";
            allow_past_week_changes?: boolean;
        };
    }
): Promise<ScenarioResult> {
    const response = await fetch(
        `${API_BASE_URL}/simulations/education/${caseId}/scenarios`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || "Failed to simulate the scenario");
    }
    return response.json();
}

/** Total workload hours for a v1 week. */
export function weekTotalHours(week: {
    lecture_hours: number;
    lab_hours: number;
    homework_hours: number;
    assignment_hours: number;
    exam_hours: number;
}): number {
    return (
        week.lecture_hours +
        week.lab_hours +
        week.homework_hours +
        week.assignment_hours +
        week.exam_hours
    );
}

/** Colour for a classification band (§2). */
export function classificationColor(band: StressClassification): string {
    switch (band) {
        case "High":
            return "text-red-600";
        case "Moderate":
            return "text-amber-600";
        default:
            return "text-green-600";
    }
}

export function classificationBadgeClass(band: StressClassification): string {
    switch (band) {
        case "High":
            return "bg-red-100 text-red-800 border-red-300";
        case "Moderate":
            return "bg-amber-100 text-amber-800 border-amber-300";
        default:
            return "bg-green-100 text-green-800 border-green-300";
    }
}

/** Badge styling for an adjustment outcome status. */
export function outcomeBadgeClass(status: string): string {
    switch (status) {
        case "applied":
            return "bg-green-100 text-green-800 border-green-300";
        case "partially_applied":
            return "bg-amber-100 text-amber-800 border-amber-300";
        default:
            return "bg-red-100 text-red-800 border-red-300";
    }
}

/** Human-readable label for an adjustment type. */
export function adjustmentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        cancel_lecture: "Cancel lecture",
        cancel_lab: "Cancel lab",
        reduce_homework: "Reduce homework",
        move_homework: "Move homework",
        move_assignment: "Move assignment",
        update_assignment: "Update assignment",
        extend_assignment: "Extend assignment",
        move_exam: "Move exam",
        cancel_exam: "Cancel exam",
    };
    return labels[type] || type;
}

/** One-line summary of an adjustment's parameters, for the audit list. */
export function describeAdjustment(a: AdjustmentRequest): string {
    switch (a.type) {
        case "cancel_lecture":
        case "cancel_lab":
            return `week ${(a.source_week_index ?? 0) + 1}`;
        case "reduce_homework":
            return `week ${(a.source_week_index ?? 0) + 1}, ${a.hours}h`;
        case "move_homework":
            return `week ${(a.source_week_index ?? 0) + 1} → week ${
                (a.target_week_index ?? 0) + 1
            }, ${a.hours}h`;
        case "move_assignment":
            return `${a.assignment_id}: ${formatDate(a.new_start_date)} → ${formatDate(
                a.new_end_date
            )}`;
        case "update_assignment": {
            const parts: string[] = [];
            if (a.new_start_date) parts.push(`start ${formatDate(a.new_start_date)}`);
            if (a.new_end_date) parts.push(`end ${formatDate(a.new_end_date)}`);
            if (a.new_estimated_hours !== undefined)
                parts.push(`${a.new_estimated_hours}h`);
            return `${a.assignment_id}: ${parts.join(", ")}`;
        }
        case "extend_assignment":
            return `${a.assignment_id} → ${formatDate(a.new_end_date)}`;
        case "move_exam":
            return `${a.exam_id} → ${formatDate(a.new_date)}`;
        case "cancel_exam":
            return `${a.exam_id}`;
        default:
            return "";
    }
}

function formatDate(value?: string): string {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10);
}

export { formatDate };

/**
 * A stored scenario row carries the same information as a fresh simulation
 * result, just split across columns. Reassemble it so the audit and chart
 * components can take one shape regardless of where the scenario came from.
 */
export function hydrateStoredScenario(
    row: any,
    fallbackModel: StressModelConfig
): ScenarioResult {
    // `comparison` is absent on rows written before the audit columns existed.
    const comparison = row.comparison ?? {};
    const outcomes = row.adjustment_outcomes ?? [];
    const byStatus = (status: string) =>
        outcomes.filter((o: any) => o.status === status).map((o: any) => o.adjustment_id);

    return {
        scenario_id: row.scenario_id,
        created_at: row.created_at,
        name: row.name ?? null,
        description: row.description ?? null,
        origin: row.origin ?? "generated",
        stress_model: fallbackModel,
        stress_model_version: row.stress_model_version ?? fallbackModel.version,
        redistribution_objective: comparison.redistribution_objective ?? "local_week",
        known_limitations: comparison.known_limitations ?? [],
        current_week_index: comparison.current_week_index ?? 0,
        current_week_number: (comparison.current_week_index ?? 0) + 1,
        baseline: {
            week_schedules: [],
            trajectory: [],
            summary: comparison.baseline,
        },
        simulation: {
            week_schedules: row.week_schedules ?? [],
            trajectory: [],
            summary: comparison.simulation,
            assignments: row.assignments ?? [],
            exams: [],
        },
        adjustments: row.adjustments ?? [],
        adjustment_outcomes: outcomes,
        applied_adjustment_ids: byStatus("applied"),
        partially_applied_adjustment_ids: byStatus("partially_applied"),
        rejected_adjustment_ids: byStatus("rejected"),
        redistribution_flows: row.redistribution_flows ?? [],
        extensions_applied: row.extensions_applied ?? [],
        objective: comparison.objective,
        warnings: row.warnings ?? [],
        weekly_results: comparison.weekly_results ?? [],
    };
}

/**
 * Collapse a comparison down to the baseline alone, for views that show the
 * untouched course rather than a scenario.
 */
export function baselineOnlyResults(
    weeklyResults: WeeklyResult[]
): WeeklyResult[] {
    return weeklyResults.map((w) => ({
        ...w,
        simulation: w.baseline,
        adjusted: false,
        adjustment_details: [],
        stress_delta: 0,
    }));
}
