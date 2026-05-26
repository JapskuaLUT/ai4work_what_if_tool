// ui/src/services/logisticLogsService.ts
//
// Thin API client for /api/logs/* plus a handful of pure helpers
// (PII masking, duration formatting, per-session step reconstruction)
// that the UI reuses across components. The heavy aggregation now
// happens server-side at ingest time.

import type {
    LogCaseOverviewResponse,
    LogRow,
    LogSessionDetail,
    LogSessionMetadata
} from "@/types/logisticLogs";

const API_BASE_URL =
    import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000";

/** PII heuristic — step info names that the kiosk knows carry personal data. */
const PII_STEPS = new Set([
    "AKTION FAHRERNAME ERFASST",
    "EINGABE FAHRERNAME",
    "EINGABE UNTERSCHRIFT",
    "AKTION UNTERSCHRIFT ERFASST"
]);

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export async function fetchLogCase(
    caseId: string
): Promise<LogCaseOverviewResponse> {
    const res = await fetch(`${API_BASE_URL}/logs/${caseId}`);
    if (!res.ok) {
        if (res.status === 404) throw new Error("Log case not found");
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch log case");
    }
    return res.json();
}

export async function fetchLogSessions(
    caseId: string
): Promise<LogSessionMetadata[]> {
    const res = await fetch(`${API_BASE_URL}/logs/${caseId}/sessions`);
    if (!res.ok) {
        if (res.status === 404) throw new Error("Log case not found");
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch sessions");
    }
    const body = (await res.json()) as { sessions: LogSessionMetadata[] };
    return body.sessions;
}

export async function fetchLogSession(
    caseId: string,
    processId: number
): Promise<LogSessionDetail> {
    const res = await fetch(
        `${API_BASE_URL}/logs/${caseId}/sessions/${processId}`
    );
    if (!res.ok) {
        if (res.status === 404) throw new Error("Session not found");
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch session");
    }
    const body = (await res.json()) as { session: LogSessionDetail };
    return body.session;
}

// ---------------------------------------------------------------------------
// Pure helpers used by components
// ---------------------------------------------------------------------------

/** Per-session step view reconstructed from raw rows on the client. */
export interface SessionStep {
    sequence: number;
    stepInfo: string;
    type: "PROCESS" | "DIALOG";
    startedAt: string;
    endedAt: string | null;
    durationSec: number | null;
    value: string;
    pii: boolean;
    /** Original Start row (always present). */
    startRow: LogRow;
    /** Original End row (null when the step is still open / truncated). */
    endRow: LogRow | null;
}

function parseTs(s: string): number {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
}

export function reconstructSteps(session: LogSessionDetail): SessionStep[] {
    const steps: SessionStep[] = [];
    const open = new Map<string, { startedAt: string; value: string }>();
    let seq = 0;
    for (const r of session.rows) {
        if (r.procstepaction === "Start") {
            open.set(r.procstepinfo, {
                startedAt: r.date,
                value: r.value ?? ""
            });
            seq++;
            steps.push({
                sequence: seq,
                stepInfo: r.procstepinfo,
                type: r.procsteptype,
                startedAt: r.date,
                endedAt: null,
                durationSec: null,
                value: r.value ?? "",
                pii: PII_STEPS.has(r.procstepinfo),
                startRow: r,
                endRow: null
            });
        } else if (r.procstepaction === "End") {
            const opened = open.get(r.procstepinfo);
            if (!opened) continue;
            const startedMs = parseTs(opened.startedAt);
            const endedMs = parseTs(r.date);
            for (let i = steps.length - 1; i >= 0; i--) {
                if (
                    steps[i].stepInfo === r.procstepinfo &&
                    steps[i].endedAt === null
                ) {
                    steps[i].endedAt = r.date;
                    steps[i].durationSec = Math.max(
                        0,
                        (endedMs - startedMs) / 1000
                    );
                    steps[i].endRow = r;
                    break;
                }
            }
            open.delete(r.procstepinfo);
        }
    }
    return steps;
}

export function formatDuration(sec: number): string {
    if (sec < 1) return `${(sec * 1000).toFixed(0)}ms`;
    if (sec < 60) return `${sec.toFixed(1)}s`;
    if (sec < 3600) {
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return `${m}m ${s}s`;
    }
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return `${h}h ${m}m`;
}

export function maskValue(value: string, pii: boolean): string {
    if (!pii) return value;
    if (value.length <= 4) return "•".repeat(value.length);
    return `${value.slice(0, 2)}${"•".repeat(value.length - 4)}${value.slice(-2)}`;
}
