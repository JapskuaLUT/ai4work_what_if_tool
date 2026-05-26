// backend/src/types/logisticLogs.ts
//
// Server-side shapes for the kiosk-log domain. Manually kept in sync
// with ui/src/types/logisticLogs.ts — if these drift in non-trivial
// ways, the integration tests will catch it (they assert the response
// shape).

export type ProcstepType = "PROCESS" | "DIALOG";
export type ProcstepAction = "Start" | "End";

/**
 * One raw log row in the shape the kiosk emits and persists. The DB
 * column `id` is a server-assigned bigserial; the kiosk's own row id
 * is preserved as `source_id`.
 */
export interface LogRow {
    id: number;                       // kiosk's own row id (maps to log_rows.source_id)
    date: string;                     // ISO 8601 timestamp (local time, no zone)
    location: string;
    topic: string;
    process: number;                  // 0 = idle sentinel; >0 = session id
    proc: number;
    procstep: number;
    procsteptype: ProcstepType;
    procstepinfo: string;
    procstepaction: ProcstepAction;
    message: string;
    value: string;
}

/** What the partner POSTs at /api/logs/. */
export interface LogCaseCreateInput {
    name: string;
    description?: string | null;
    location: string;
    topic: string;
    related_yard_case_id?: string | null;
    metadata?: Record<string, unknown>;
    rows: LogRow[];
}

/** Per-session metadata returned by GET /:caseId/sessions. */
export interface LogSessionMetadata {
    processId: number;
    startedAt: string;
    endedAt: string;
    durationSec: number;
    eventCount: number;
    stepCount: number;
    licensePlate: string | null;
    completed: boolean;               // reached ANZEIGE SCHLUSSBILD
}

/** Per-session full detail returned by GET /:caseId/sessions/:processId. */
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

/** What GET /:caseId returns (pre-computed at ingest, stored on log_cases). */
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

export interface SummaryMetrics {
    overview: LogOverview;
    aggregates: StepAggregate[];
}

export interface CreateLogCaseResult {
    case_id: string;
    row_count: number;
    session_count: number;
}
