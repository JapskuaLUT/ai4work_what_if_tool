// ui/src/services/logisticLogsService.ts
//
// Loads and aggregates the LT 010 check-in terminal logs. Everything is
// client-side for the prototype: data is fetched from /logistic_logs/logdata.json
// (a Vite static asset) and reduced in the browser. ~1.9 MB / 5764 rows —
// well within an in-memory budget for the kind of analytics we run here.

import type {
    LogOverview,
    LogRow,
    LogSession,
    StepAggregate
} from "@/types/logisticLogs";

const DATA_URL = "/logistic_logs/logdata.json";

/** PII heuristic — step info names that the kiosk knows carry personal data. */
const PII_STEPS = new Set([
    "AKTION FAHRERNAME ERFASST",
    "EINGABE FAHRERNAME",
    "EINGABE UNTERSCHRIFT",
    "AKTION UNTERSCHRIFT ERFASST"
]);

let cache: { rows: LogRow[]; sessions: LogSession[] } | null = null;

async function loadRaw(): Promise<LogRow[]> {
    const res = await fetch(DATA_URL);
    if (!res.ok) {
        throw new Error(
            `Failed to load ${DATA_URL}: ${res.status} ${res.statusText}`
        );
    }
    const body = (await res.json()) as { data: LogRow[] };
    return body.data;
}

export async function loadLogs(): Promise<{
    rows: LogRow[];
    sessions: LogSession[];
}> {
    if (cache) return cache;
    const rows = await loadRaw();
    const sessions = buildSessions(rows);
    cache = { rows, sessions };
    return cache;
}

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

function parseTs(s: string): number {
    // ISO 8601 without zone — treat as local time. Date.parse handles it.
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
}

function buildSessions(rows: LogRow[]): LogSession[] {
    const byProc = new Map<number, LogRow[]>();
    for (const r of rows) {
        if (r.process === 0) continue;       // sentinel idle state
        const arr = byProc.get(r.process);
        if (arr) arr.push(r);
        else byProc.set(r.process, [r]);
    }

    const sessions: LogSession[] = [];
    for (const [processId, items] of byProc) {
        items.sort((a, b) => parseTs(a.date) - parseTs(b.date));
        const startedAt = items[0].date;
        const endedAt = items[items.length - 1].date;
        const durationSec = Math.max(
            0,
            (parseTs(endedAt) - parseTs(startedAt)) / 1000
        );
        const stepSet = new Set<string>();
        const captured: LogSession["capturedValues"] = [];
        let licensePlate: string | null = null;

        for (const r of items) {
            stepSet.add(r.procstepinfo);
            if (r.value && r.procstepaction === "Start") {
                captured.push({
                    stepInfo: r.procstepinfo,
                    value: r.value,
                    pii: PII_STEPS.has(r.procstepinfo)
                });
                if (r.procstepinfo === "AKTION KENNZEICHEN ERFASST") {
                    licensePlate = r.value;
                }
            }
        }

        sessions.push({
            processId,
            rows: items,
            startedAt,
            endedAt,
            durationSec,
            eventCount: items.length,
            stepCount: stepSet.size,
            capturedValues: captured,
            licensePlate
        });
    }
    sessions.sort(
        (a, b) => parseTs(a.startedAt) - parseTs(b.startedAt)
    );
    return sessions;
}

export function computeOverview(
    rows: LogRow[],
    sessions: LogSession[]
): LogOverview {
    const dates = rows.map((r) => r.date).sort();
    const durations = sessions.map((s) => s.durationSec).sort((a, b) => a - b);
    const events = sessions.map((s) => s.eventCount).sort((a, b) => a - b);
    const pick = (arr: number[], p: number) =>
        arr.length === 0
            ? 0
            : arr[Math.max(0, Math.ceil(arr.length * p) - 1)];
    return {
        rowCount: rows.length,
        sessionCount: sessions.length,
        earliestDate: dates[0] ?? "",
        latestDate: dates[dates.length - 1] ?? "",
        location: rows[0]?.location ?? "—",
        topic: rows[0]?.topic ?? "—",
        durationStats: {
            minSec: durations[0] ?? 0,
            medianSec: pick(durations, 0.5),
            p95Sec: pick(durations, 0.95),
            maxSec: durations[durations.length - 1] ?? 0
        },
        eventStats: {
            min: events[0] ?? 0,
            median: pick(events, 0.5),
            p95: pick(events, 0.95),
            max: events[events.length - 1] ?? 0
        }
    };
}

/**
 * Reduce rows to per-step duration stats by pairing each Start with the
 * next matching End for the same (process, procstepinfo). A few steps
 * never close cleanly (the dataset has truncated sessions); those rows
 * are skipped, not counted.
 */
export function computeStepAggregates(rows: LogRow[]): StepAggregate[] {
    interface PendingKey {
        process: number;
        info: string;
    }
    const pending = new Map<string, number>(); // serialized key → start ms
    const durations = new Map<
        string,
        { type: "PROCESS" | "DIALOG"; values: number[] }
    >();

    const k = (p: PendingKey) => `${p.process}|${p.info}`;

    for (const r of rows) {
        if (r.process === 0) continue;
        const key = k({ process: r.process, info: r.procstepinfo });
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
                        type: r.procsteptype,
                        values: []
                    })
                    .get(r.procstepinfo) as {
                    type: "PROCESS" | "DIALOG";
                    values: number[];
                });
            bucket.values.push(dur);
            pending.delete(key);
        }
    }

    const out: StepAggregate[] = [];
    for (const [stepInfo, { type, values }] of durations) {
        if (values.length === 0) continue;
        values.sort((a, b) => a - b);
        const total = values.reduce((s, v) => s + v, 0);
        const pick = (p: number) =>
            values[Math.max(0, Math.ceil(values.length * p) - 1)];
        out.push({
            stepInfo,
            type,
            count: values.length,
            totalSec: total,
            avgSec: total / values.length,
            p50Sec: pick(0.5),
            p95Sec: pick(0.95),
            maxSec: values[values.length - 1]
        });
    }
    out.sort((a, b) => b.totalSec - a.totalSec);
    return out;
}

/**
 * Per-session step-by-step view: a sequence of `(stepInfo, startedAt,
 * durationSec, type, value)` rows reconstructed from Start/End pairs.
 */
export interface SessionStep {
    sequence: number;
    stepInfo: string;
    type: "PROCESS" | "DIALOG";
    startedAt: string;
    endedAt: string | null;
    durationSec: number | null;
    value: string;
    pii: boolean;
}

export function reconstructSteps(session: LogSession): SessionStep[] {
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
                pii: PII_STEPS.has(r.procstepinfo)
            });
        } else if (r.procstepaction === "End") {
            const opened = open.get(r.procstepinfo);
            if (!opened) continue;
            const startedMs = parseTs(opened.startedAt);
            const endedMs = parseTs(r.date);
            // Locate the most-recent step entry that's still open
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
