// ui/src/types/logisticLogs.ts
//
// Shapes for the LT 010 check-in terminal log dataset.

/**
 * One raw row as stored in logdata_aggregated.data.json. The simulator's
 * terminal emits one row for each Start and End of a dialog or process
 * step. German labels are kept verbatim — they're domain vocabulary, not
 * UI strings.
 */
export interface LogRow {
    id: number;
    date: string;                  // ISO 8601 local time, no zone
    location: string;              // always "LT 010" in current dataset
    topic: string;                 // always "Check-In" in current dataset
    process: number;               // 0 = idle sentinel; otherwise session id
    proc: number;
    procstep: number;
    procsteptype: "PROCESS" | "DIALOG";
    procstepinfo: string;          // step name, e.g. "EINGABE KENNZEICHEN"
    procstepaction: "Start" | "End";
    message: string;
    value: string;                 // captured input (may contain PII)
}

/**
 * A driver's full visit at the kiosk, reconstructed by grouping rows by
 * `process` id. Excludes the sentinel `process == 0` events.
 */
export interface LogSession {
    processId: number;
    rows: LogRow[];                 // ordered by date
    startedAt: string;
    endedAt: string;
    durationSec: number;
    eventCount: number;             // total rows (Start + End)
    stepCount: number;              // distinct procstepinfo
    /** Captured driver-facing values, sanitized: PII labelled, not removed. */
    capturedValues: Array<{ stepInfo: string; value: string; pii: boolean }>;
    /** Best-effort license plate (from "AKTION KENNZEICHEN ERFASST"). */
    licensePlate: string | null;
}

/**
 * Per-step roll-up across the whole dataset: how many times the step
 * appeared and how much total / median time drivers spent in it.
 * Useful for spotting where the kiosk eats most of the driver's time.
 */
export interface StepAggregate {
    stepInfo: string;
    type: "PROCESS" | "DIALOG";
    count: number;                  // number of (Start, End) pairs seen
    totalSec: number;
    avgSec: number;
    p50Sec: number;
    p95Sec: number;
    maxSec: number;
}

/** Pre-computed overall stats. */
export interface LogOverview {
    rowCount: number;
    sessionCount: number;
    earliestDate: string;
    latestDate: string;
    location: string;
    topic: string;
    durationStats: {
        minSec: number;
        medianSec: number;
        p95Sec: number;
        maxSec: number;
    };
    eventStats: {
        min: number;
        median: number;
        p95: number;
        max: number;
    };
}
