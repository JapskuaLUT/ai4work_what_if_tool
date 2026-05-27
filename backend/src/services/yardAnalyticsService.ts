// backend/src/services/yardAnalyticsService.ts

import type {
    BottleneckEntry,
    OccupancyTimelinePoint,
    OrderMeasurement,
    SecondsStats,
    TimeEntry,
    YardDesignData,
    YardRunSummaryMetrics,
    YardSimulationExport
} from "../types/yard";

/**
 * Pure analytics over a simulator export. No DB access, no I/O.
 * Tested in yardAnalyticsService.test.ts against the three sample runs in
 * specifications/yard_logistics/Results/.
 *
 * Time convention (verified against samples): TimeEntry.Start/End are absolute
 * simulation time strings "HH:MM:SS". An order with offsetMinutes=20 has its
 * first TimeEntry at 00:20:00.
 */

export function parseHmsToSeconds(hms: string): number {
    const [h, m, s] = hms.split(":");
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function percentile(sortedAsc: number[], p: number): number {
    if (sortedAsc.length === 0) return 0;
    const rank = Math.ceil(p * sortedAsc.length) - 1;
    const idx = Math.max(0, Math.min(sortedAsc.length - 1, rank));
    return sortedAsc[idx];
}

function statsFor(values: number[]): SecondsStats {
    if (values.length === 0) {
        return { total: 0, avg: 0, max: 0, p95: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const total = values.reduce((s, v) => s + v, 0);
    return {
        total,
        avg: round1(total / values.length),
        max: sorted[sorted.length - 1],
        p95: percentile(sorted, 0.95)
    };
}

function round1(x: number): number {
    return Math.round(x * 10) / 10;
}

// ---------------------------------------------------------------------------
// Entity index — name -> (type, max occupancy for serving trucks)
// ---------------------------------------------------------------------------

type EntityType = BottleneckEntry["type"];

interface EntityIndexEntry {
    type: EntityType;
    maxOccupancy: number;
}

/**
 * Synthetic entity surfaced when the simulator emits a Waiting event with
 * an empty Location — i.e. a truck queued before any concrete entity
 * (typically pre-CheckIn). Single-server semantics: one waiting "slot"
 * means peak concurrency directly equals the queue depth.
 */
const OFF_YARD_WAIT_LABEL = "(off-yard waiting)";

function buildEntityIndex(yard: YardDesignData): Map<string, EntityIndexEntry> {
    const idx = new Map<string, EntityIndexEntry>();
    for (const e of yard.Entities.Crossings) {
        idx.set(e.Name, { type: "Crossing", maxOccupancy: e.MaxOccupancy || 1 });
    }
    for (const e of yard.Entities.ParkingAreas) {
        idx.set(e.Name, { type: "ParkingArea", maxOccupancy: e.Capacity || 1 });
    }
    for (const e of yard.Entities.Scales) {
        idx.set(e.Name, { type: "Scale", maxOccupancy: 1 });
    }
    for (const e of yard.Entities.Storages) {
        // Storage.Capacity describes material capacity (kg), not concurrent trucks.
        // A storage location serves one truck at a time.
        idx.set(e.Name, { type: "Storage", maxOccupancy: 1 });
    }
    for (const e of yard.Entities.Terminals) {
        idx.set(e.Name, { type: "Terminal", maxOccupancy: 1 });
    }
    for (const s of yard.Streets) {
        idx.set(s.Name, { type: "Street", maxOccupancy: s.MaxOccupancy || 1 });
    }
    return idx;
}

// ---------------------------------------------------------------------------
// Concurrent-occupancy sweep line
// ---------------------------------------------------------------------------

interface Interval {
    start: number;
    end: number;
}

function maxConcurrent(intervals: Interval[]): number {
    if (intervals.length === 0) return 0;
    type Event = { t: number; delta: number };
    const events: Event[] = [];
    for (const iv of intervals) {
        if (iv.end <= iv.start) continue; // ignore zero/negative spans
        events.push({ t: iv.start, delta: +1 });
        events.push({ t: iv.end, delta: -1 });
    }
    // Sort by time; on ties, exits before enters so an instantaneous handoff
    // does not over-count (count at moment of overlap is what we want).
    events.sort((a, b) => (a.t === b.t ? a.delta - b.delta : a.t - b.t));
    let cur = 0;
    let max = 0;
    for (const ev of events) {
        cur += ev.delta;
        if (cur > max) max = cur;
    }
    return max;
}

function intervalsByEntity(
    measurements: OrderMeasurement[]
): Map<string, Interval[]> {
    const m = new Map<string, Interval[]>();
    for (const om of measurements) {
        for (const te of om.TimeEntries) {
            const start = parseHmsToSeconds(te.Start);
            const end = parseHmsToSeconds(te.End);
            // Empty Location + Action="Waiting" is the simulator's way of
            // saying "queued outside the yard" (a required entity was
            // occupied). Bucket those under a synthetic name so the
            // bottleneck list surfaces them clearly instead of as ''/Unknown.
            const key =
                te.Location === "" ? OFF_YARD_WAIT_LABEL : te.Location;
            const list = m.get(key);
            if (list) list.push({ start, end });
            else m.set(key, [{ start, end }]);
        }
    }
    return m;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function summarizeRun(
    exp: YardSimulationExport,
    options: { topBottlenecks?: number } = {}
): YardRunSummaryMetrics {
    const meas = exp.Measurements.Measurements;

    const waiting = meas.map((m) =>
        parseHmsToSeconds(m.Summary.WaitingTime)
    );
    const driving = meas.map((m) =>
        parseHmsToSeconds(m.Summary.DrivingTime)
    );

    // Throughput: completion span across all completed orders.
    const completed = meas.filter(
        (m) => m.Summary.OrderState === "Completed"
    );
    let lastCompletionSec = 0;
    for (const om of completed) {
        const last = om.TimeEntries[om.TimeEntries.length - 1];
        if (last) {
            const e = parseHmsToSeconds(last.End);
            if (e > lastCompletionSec) lastCompletionSec = e;
        }
    }
    const firstOrderMin = exp.Orders.length
        ? Math.min(...exp.Orders.map((o) => o.offsetMinutes))
        : 0;
    const lastCompletionMin = round1(lastCompletionSec / 60);
    const spanHours = (lastCompletionMin - firstOrderMin) / 60;
    const ordersPerHour =
        spanHours > 0
            ? round1(exp.Measurements.Summary.OrdersCompleted / spanHours)
            : 0;

    return {
        orders: {
            overall: exp.Measurements.Summary.OrdersOverall,
            completed: exp.Measurements.Summary.OrdersCompleted,
            incomplete: exp.Measurements.Summary.OrdersIncomplete,
            unhandled: exp.Measurements.Summary.OrdersUnhandled
        },
        waiting_seconds: statsFor(waiting),
        driving_seconds: statsFor(driving),
        throughput: {
            orders_per_hour: ordersPerHour,
            first_order_min: firstOrderMin,
            last_completion_min: lastCompletionMin
        },
        bottlenecks: bottlenecks(exp, options.topBottlenecks ?? 5)
    };
}

export function bottlenecks(
    exp: YardSimulationExport,
    topN = 5
): BottleneckEntry[] {
    const idx = buildEntityIndex(exp.YardStructure);
    const intervals = intervalsByEntity(exp.Measurements.Measurements);

    const all: BottleneckEntry[] = [];
    for (const [entityName, ivs] of intervals) {
        let meta: EntityIndexEntry;
        if (entityName === OFF_YARD_WAIT_LABEL) {
            // Single waiting "slot" → peak concurrency == queue depth.
            meta = { type: "ExternalWait", maxOccupancy: 1 };
        } else {
            meta = idx.get(entityName) ?? {
                type: "Unknown",
                maxOccupancy: 1
            };
        }
        // Skip entities the model considers transient (Streets, Crossings):
        // they show high turnover but rarely tell the operator anything actionable.
        // Streets in particular generate hundreds of entries; surface only serving
        // entities (Terminals, ParkingAreas, Scales, Storages, ExternalWait).
        if (meta.type === "Street" || meta.type === "Crossing") continue;

        const peak = maxConcurrent(ivs);
        const occ = Math.max(1, meta.maxOccupancy);
        all.push({
            entity: entityName,
            type: meta.type,
            max_concurrent: peak,
            max_occupancy: occ,
            queue_score: round1(peak / occ)
        });
    }

    all.sort((a, b) => {
        if (b.queue_score !== a.queue_score) return b.queue_score - a.queue_score;
        return b.max_concurrent - a.max_concurrent;
    });
    return all.slice(0, topN);
}

export function entityOccupancyTimeline(
    exp: YardSimulationExport,
    entityName: string,
    sampleEverySec = 30
): OccupancyTimelinePoint[] {
    // Synthetic name matches the same Location-empty bucket the bottleneck
    // computation uses, so users can plot off-yard wait depth too.
    const matchEmptyLocation = entityName === OFF_YARD_WAIT_LABEL;
    const intervals: Interval[] = [];
    for (const om of exp.Measurements.Measurements) {
        for (const te of om.TimeEntries) {
            const matches = matchEmptyLocation
                ? te.Location === ""
                : te.Location === entityName;
            if (!matches) continue;
            intervals.push({
                start: parseHmsToSeconds(te.Start),
                end: parseHmsToSeconds(te.End)
            });
        }
    }
    if (intervals.length === 0) return [];

    const tMax = Math.max(...intervals.map((i) => i.end));
    const points: OccupancyTimelinePoint[] = [];
    for (let t = 0; t <= tMax; t += sampleEverySec) {
        let count = 0;
        for (const iv of intervals) {
            if (iv.start <= t && t < iv.end) count++;
        }
        points.push({ t_seconds: t, count });
    }
    return points;
}

export function truckGantt(
    exp: YardSimulationExport,
    licensePlate: string
): TimeEntry[] {
    const om = exp.Measurements.Measurements.find(
        (m) => m.OrderIdent === licensePlate
    );
    return om ? om.TimeEntries : [];
}
