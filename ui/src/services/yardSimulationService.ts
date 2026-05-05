// ui/src/services/yardSimulationService.ts

import type {
    OccupancyTimeline,
    YardRunDetail,
    YardSimulationOverview
} from "../types/yard";

const API_BASE_URL =
    import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000";

export async function fetchYardSimulation(
    caseId: string
): Promise<YardSimulationOverview> {
    const res = await fetch(`${API_BASE_URL}/simulations/yard/${caseId}`);
    if (!res.ok) {
        if (res.status === 404) throw new Error("Yard simulation not found");
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch yard simulation");
    }
    return res.json();
}

export async function fetchYardRun(
    caseId: string,
    runId: string
): Promise<YardRunDetail> {
    const res = await fetch(
        `${API_BASE_URL}/simulations/yard/${caseId}/${runId}`
    );
    if (!res.ok) {
        if (res.status === 404) throw new Error("Yard run not found");
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch yard run");
    }
    return res.json();
}

export async function fetchOccupancyTimeline(
    caseId: string,
    runId: string,
    entity: string
): Promise<OccupancyTimeline> {
    const url = new URL(
        `${API_BASE_URL}/simulations/yard/${caseId}/${runId}/timeline`
    );
    url.searchParams.set("entity", entity);
    const res = await fetch(url.toString());
    if (!res.ok) {
        if (res.status === 404) throw new Error("Yard run not found");
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch timeline");
    }
    return res.json();
}

export async function selectYardRun(
    caseId: string,
    runId: string
): Promise<{ success: boolean; selectedRunId: string; selectedAt: string }> {
    const res = await fetch(
        `${API_BASE_URL}/simulations/yard/${caseId}/select`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId })
        }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to select yard run");
    }
    return res.json();
}

export async function getSelectedYardRun(caseId: string): Promise<{
    hasSelection: boolean;
    caseId: string;
    selectedRunId: string | null;
    selectedAt: string | null;
}> {
    const res = await fetch(
        `${API_BASE_URL}/simulations/yard/${caseId}/selection`
    );
    if (!res.ok) {
        if (res.status === 404) throw new Error("Yard simulation not found");
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch selection");
    }
    return res.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatSeconds(s: number): string {
    if (s < 60) return `${Math.round(s)}s`;
    if (s < 3600) return `${Math.round(s / 60)}m ${Math.round(s % 60)}s`;
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return `${h}h ${m}m`;
}

export function parseHmsToSeconds(hms: string): number {
    const [h, m, s] = hms.split(":");
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
}
