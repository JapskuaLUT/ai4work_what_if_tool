// backend/src/services/logAnalyticsService.ts
//
// Pure analytics over raw kiosk log rows. Ported from
// ui/src/services/logisticLogsService.ts so the same numbers render
// whether we compute server-side at ingest or client-side ad-hoc.
//
// No DB access, no I/O — testable in isolation. Used by the ingest
// service to populate summary_metrics, and by the read endpoints when
// the caller asks for derived data per session.

import type {
    EventStats,
    LogOverview,
    LogRow,
    LogSessionDetail,
    LogSessionMetadata,
    SecondsStats,
    StepAggregate
} from "../types/logisticLogs";

const COMPLETION_STEP = "ANZEIGE SCHLUSSBILD";

function parseTs(s: string): number {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
}

function pickPercentile(sortedAsc: number[], p: number): number {
    if (sortedAsc.length === 0) return 0;
    const idx = Math.max(0, Math.ceil(sortedAsc.length * p) - 1);
    return sortedAsc[Math.min(idx, sortedAsc.length - 1)];
}

// ---------------------------------------------------------------------------
// Session reconstruction
// ---------------------------------------------------------------------------

interface MutableSession {
    processId: number;
    rows: LogRow[];
}

export function groupSessions(rows: LogRow[]): MutableSession[] {
    const byProc = new Map<number, LogRow[]>();
    for (const r of rows) {
        if (r.process === 0) continue;
        const arr = byProc.get(r.process);
        if (arr) arr.push(r);
        else byProc.set(r.process, [r]);
    }
    const out: MutableSession[] = [];
    for (const [processId, items] of byProc) {
        items.sort((a, b) => parseTs(a.date) - parseTs(b.date));
        out.push({ processId, rows: items });
    }
    out.sort(
        (a, b) => parseTs(a.rows[0].date) - parseTs(b.rows[0].date)
    );
    return out;
}

export function buildSessionMetadata(
    rows: LogRow[]
): LogSessionMetadata[] {
    return groupSessions(rows).map(toMetadata);
}

function toMetadata(s: MutableSession): LogSessionMetadata {
    const startedAt = s.rows[0].date;
    const endedAt = s.rows[s.rows.length - 1].date;
    const durationSec = Math.max(
        0,
        (parseTs(endedAt) - parseTs(startedAt)) / 1000
    );
    const stepSet = new Set<string>();
    let licensePlate: string | null = null;
    let completed = false;
    for (const r of s.rows) {
        stepSet.add(r.procstepinfo);
        if (
            r.procstepinfo === "AKTION KENNZEICHEN ERFASST" &&
            r.value &&
            r.procstepaction === "Start"
        ) {
            licensePlate = r.value;
        }
        if (r.procstepinfo === COMPLETION_STEP) completed = true;
    }
    return {
        processId: s.processId,
        startedAt,
        endedAt,
        durationSec,
        eventCount: s.rows.length,
        stepCount: stepSet.size,
        licensePlate,
        completed
    };
}

export function buildSessionDetail(
    rows: LogRow[],
    processId: number
): LogSessionDetail | null {
    const session = groupSessions(rows).find(
        (s) => s.processId === processId
    );
    if (!session) return null;
    return { ...toMetadata(session), rows: session.rows };
}

// ---------------------------------------------------------------------------
// Overview + aggregates
// ---------------------------------------------------------------------------

export function computeOverview(
    rows: LogRow[],
    sessions: LogSessionMetadata[]
): LogOverview {
    const dates = rows.map((r) => r.date).sort();
    const durations = sessions
        .map((s) => s.durationSec)
        .sort((a, b) => a - b);
    const events = sessions
        .map((s) => s.eventCount)
        .sort((a, b) => a - b);
    const durationStats: SecondsStats = {
        minSec: durations[0] ?? 0,
        medianSec: pickPercentile(durations, 0.5),
        p95Sec: pickPercentile(durations, 0.95),
        maxSec: durations[durations.length - 1] ?? 0
    };
    const eventStats: EventStats = {
        min: events[0] ?? 0,
        median: pickPercentile(events, 0.5),
        p95: pickPercentile(events, 0.95),
        max: events[events.length - 1] ?? 0
    };
    return {
        rowCount: rows.length,
        sessionCount: sessions.length,
        earliestDate: dates[0] ?? "",
        latestDate: dates[dates.length - 1] ?? "",
        location: rows[0]?.location ?? "—",
        topic: rows[0]?.topic ?? "—",
        durationStats,
        eventStats
    };
}

/**
 * Pair each Start with the next matching End for the same
 * (process, procstepinfo) and roll up per-step duration stats. Pending
 * Start events (no End in the dataset) are skipped — happens at session
 * boundaries that the export truncated.
 */
export function computeStepAggregates(rows: LogRow[]): StepAggregate[] {
    interface Bucket {
        type: "PROCESS" | "DIALOG";
        values: number[];
    }
    const pending = new Map<string, number>();
    const durations = new Map<string, Bucket>();
    const k = (process: number, info: string) => `${process}|${info}`;

    for (const r of rows) {
        if (r.process === 0) continue;
        const key = k(r.process, r.procstepinfo);
        if (r.procstepaction === "Start") {
            pending.set(key, parseTs(r.date));
        } else if (r.procstepaction === "End") {
            const startedAt = pending.get(key);
            if (startedAt === undefined) continue;
            const dur = Math.max(0, (parseTs(r.date) - startedAt) / 1000);
            const bucket =
                durations.get(r.procstepinfo) ??
                (durations
                    .set(r.procstepinfo, {
                        type: r.procsteptype as "PROCESS" | "DIALOG",
                        values: []
                    })
                    .get(r.procstepinfo) as Bucket);
            bucket.values.push(dur);
            pending.delete(key);
        }
    }

    const out: StepAggregate[] = [];
    for (const [stepInfo, { type, values }] of durations) {
        if (values.length === 0) continue;
        values.sort((a, b) => a - b);
        const total = values.reduce((s, v) => s + v, 0);
        out.push({
            stepInfo,
            type,
            count: values.length,
            totalSec: total,
            avgSec: total / values.length,
            p50Sec: pickPercentile(values, 0.5),
            p95Sec: pickPercentile(values, 0.95),
            maxSec: values[values.length - 1]
        });
    }
    out.sort((a, b) => b.totalSec - a.totalSec);
    return out;
}

/** Full digest computed at ingest and stored on log_cases.summary_metrics. */
export function buildSummaryMetrics(rows: LogRow[]): {
    overview: LogOverview;
    aggregates: StepAggregate[];
} {
    const sessions = buildSessionMetadata(rows);
    return {
        overview: computeOverview(rows, sessions),
        aggregates: computeStepAggregates(rows)
    };
}
