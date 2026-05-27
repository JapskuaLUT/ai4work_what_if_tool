// ui/src/types/logisticLogs.ts
//
// Shapes for the LT 010 check-in terminal log dataset. Mirrored from
// backend/src/types/logisticLogs.ts.

export type ProcstepType = "PROCESS" | "DIALOG";
export type ProcstepAction = "Start" | "End";

/**
 * One raw row as the kiosk emits it. German labels are kept verbatim —
 * they're domain vocabulary, not UI strings. The UI translates them via
 * the glossary at render time.
 */
export interface LogRow {
    id: number;
    date: string;
    location: string;
    topic: string;
    process: number;                  // 0 = idle sentinel; otherwise session id
    proc: number;
    procstep: number;
    procsteptype: ProcstepType;
    procstepinfo: string;
    procstepaction: ProcstepAction;
    message: string;
    value: string;
}

/**
 * Per-session metadata returned by GET /api/logs/:caseId/sessions.
 * No raw rows — fetch one with /sessions/:processId when needed.
 */
export interface LogSessionMetadata {
    processId: number;
    startedAt: string;
    endedAt: string;
    durationSec: number;
    eventCount: number;
    stepCount: number;
    licensePlate: string | null;
    completed: boolean;
}

/**
 * Full session with raw rows, returned by
 * GET /api/logs/:caseId/sessions/:processId. Powers the detail
 * drill-in; `reconstructSteps()` pairs Start/End rows into
 * `SessionStep[]` on the client.
 */
export interface LogSessionDetail extends LogSessionMetadata {
    rows: LogRow[];
}

export interface SecondsStats {
    minSec: number;
    medianSec: number;
    p95Sec: number;
    maxSec: number;
}

export interface EventStats {
    min: number;
    median: number;
    p95: number;
    max: number;
}

export interface LogOverview {
    rowCount: number;
    sessionCount: number;
    earliestDate: string;
    latestDate: string;
    location: string;
    topic: string;
    durationStats: SecondsStats;
    eventStats: EventStats;
}

export interface StepAggregate {
    stepInfo: string;
    type: ProcstepType;
    count: number;
    totalSec: number;
    avgSec: number;
    p50Sec: number;
    p95Sec: number;
    maxSec: number;
}

/** What GET /api/logs/:caseId returns. */
export interface LogCaseOverviewResponse {
    case_id: string;
    name: string;
    description: string | null;
    location: string;
    topic: string;
    related_yard_case_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    overview: LogOverview;
    aggregates: StepAggregate[];
}
