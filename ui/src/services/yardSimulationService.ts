// ui/src/services/yardSimulationService.ts

import type {
    OccupancyTimeline,
    ProposalValidation,
    YardProposal,
    YardProposalCreateInput,
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

// ---------------------------------------------------------------------------
// Proposals API
// ---------------------------------------------------------------------------

export async function listYardProposals(
    caseId: string
): Promise<YardProposal[]> {
    const res = await fetch(
        `${API_BASE_URL}/simulations/yard/${caseId}/proposals`
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to list proposals");
    }
    const body = await res.json();
    return body.proposals ?? [];
}

export interface SaveProposalResult {
    proposal: YardProposal;
    validation: ProposalValidation;
}

export async function saveYardProposal(
    caseId: string,
    input: YardProposalCreateInput
): Promise<SaveProposalResult> {
    const res = await fetch(
        `${API_BASE_URL}/simulations/yard/${caseId}/proposals`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input)
        }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        // 400 carries a structured `validation` payload — surface it so the
        // UI can show what went wrong.
        const err = new Error(
            body.error || body.message || "Failed to save proposal"
        ) as Error & { validation?: ProposalValidation };
        if (body.validation) err.validation = body.validation;
        throw err;
    }
    return body as SaveProposalResult;
}

export async function deleteYardProposal(
    caseId: string,
    id: number
): Promise<void> {
    const res = await fetch(
        `${API_BASE_URL}/simulations/yard/${caseId}/proposals/${id}`,
        { method: "DELETE" }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete proposal");
    }
}
