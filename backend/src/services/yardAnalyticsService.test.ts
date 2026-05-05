// backend/src/services/yardAnalyticsService.test.ts

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
    bottlenecks,
    entityOccupancyTimeline,
    parseHmsToSeconds,
    summarizeRun,
    truckGantt
} from "./yardAnalyticsService";
import type { YardSimulationExport } from "../types/yard";

// Tests run against the three real simulator outputs in
// specifications/yard_logistics/Results/.
const SAMPLES_ROOT = join(
    __dirname,
    "..",
    "..",
    "..",
    "specifications",
    "yard_logistics",
    "Results"
);

function loadSample(folder: string, file: string): YardSimulationExport {
    const p = join(SAMPLES_ROOT, folder, file);
    return JSON.parse(readFileSync(p, "utf-8")) as YardSimulationExport;
}

const SMOOTH = loadSample(
    "01_Smooth",
    "SimResults_20260429-165003.complete.json"
);
const SEQUENCED = loadSample(
    "02_SequencedOk",
    "SimResults_20260429-165451.complete.json"
);
const WAITING = loadSample(
    "03_WaitingProblem",
    "SimResults_20260429-171753.complete.json"
);

describe("parseHmsToSeconds", () => {
    test("parses HH:MM:SS strings", () => {
        expect(parseHmsToSeconds("00:00:00")).toBe(0);
        expect(parseHmsToSeconds("00:00:30")).toBe(30);
        expect(parseHmsToSeconds("00:01:30")).toBe(90);
        expect(parseHmsToSeconds("01:02:03")).toBe(3723);
        expect(parseHmsToSeconds("03:36:28")).toBe(12988);
    });
});

describe("summarizeRun — Smooth (no waiting)", () => {
    const s = summarizeRun(SMOOTH);

    test("counts orders correctly", () => {
        expect(s.orders.overall).toBe(30);
        expect(s.orders.completed).toBe(30);
        expect(s.orders.incomplete).toBe(0);
        expect(s.orders.unhandled).toBe(0);
    });

    test("waiting time is zero across all orders", () => {
        expect(s.waiting_seconds.total).toBe(0);
        expect(s.waiting_seconds.max).toBe(0);
        expect(s.waiting_seconds.avg).toBe(0);
    });

    test("driving time is non-zero and stable", () => {
        // Verified against raw aggregation: total=8624, max=300, avg≈287.5
        expect(s.driving_seconds.total).toBe(8624);
        expect(s.driving_seconds.max).toBe(300);
        expect(s.driving_seconds.avg).toBeCloseTo(287.5, 1);
    });

    test("throughput is reported", () => {
        expect(s.throughput.first_order_min).toBe(0);
        expect(s.throughput.last_completion_min).toBeGreaterThan(0);
        expect(s.throughput.orders_per_hour).toBeGreaterThan(0);
    });
});

describe("summarizeRun — SequencedOk (light queueing)", () => {
    const s = summarizeRun(SEQUENCED);

    test("orders all completed", () => {
        expect(s.orders.overall).toBe(52);
        expect(s.orders.completed).toBe(52);
    });

    test("waiting present but moderate", () => {
        // Verified: total=3043s (~51min), max=360s (6min), avg≈58.5s
        expect(s.waiting_seconds.total).toBe(3043);
        expect(s.waiting_seconds.max).toBe(360);
        expect(s.waiting_seconds.avg).toBeCloseTo(58.5, 1);
    });
});

describe("summarizeRun — WaitingProblem (heavy queueing)", () => {
    const s = summarizeRun(WAITING);

    test("orders all completed", () => {
        expect(s.orders.overall).toBe(71);
        expect(s.orders.completed).toBe(71);
    });

    test("waiting blows up", () => {
        // Verified: total=47420s (~13h), max=12988s (3.6h), avg≈667.9s
        expect(s.waiting_seconds.total).toBe(47420);
        expect(s.waiting_seconds.max).toBe(12988);
        expect(s.waiting_seconds.avg).toBeCloseTo(667.9, 1);
    });

    test("max waiting >> sequenced run", () => {
        // 12988s in WaitingProblem vs 360s in SequencedOk = 36x worse.
        const seq = summarizeRun(SEQUENCED);
        expect(s.waiting_seconds.max).toBeGreaterThan(
            seq.waiting_seconds.max * 10
        );
    });
});

describe("waiting strictly orders the three scenarios", () => {
    test("Smooth < SequencedOk < WaitingProblem on total wait", () => {
        const s1 = summarizeRun(SMOOTH).waiting_seconds.total;
        const s2 = summarizeRun(SEQUENCED).waiting_seconds.total;
        const s3 = summarizeRun(WAITING).waiting_seconds.total;
        expect(s1).toBeLessThan(s2);
        expect(s2).toBeLessThan(s3);
    });

    test("Smooth < SequencedOk < WaitingProblem on max wait", () => {
        const s1 = summarizeRun(SMOOTH).waiting_seconds.max;
        const s2 = summarizeRun(SEQUENCED).waiting_seconds.max;
        const s3 = summarizeRun(WAITING).waiting_seconds.max;
        expect(s1).toBeLessThan(s2);
        expect(s2).toBeLessThan(s3);
    });
});

describe("bottlenecks", () => {
    test("Smooth surfaces no saturated entity (queue_score ≤ 1.0)", () => {
        const top = bottlenecks(SMOOTH, 5);
        expect(top.length).toBeGreaterThan(0);
        for (const b of top) {
            expect(b.queue_score).toBeLessThanOrEqual(1.0);
        }
    });

    test("WaitingProblem surfaces a saturated entity (queue_score > 1.0)", () => {
        const top = bottlenecks(WAITING, 5);
        const saturated = top.find((b) => b.queue_score > 1.0);
        expect(saturated).toBeDefined();
    });

    test("excludes Streets and Crossings from rankings", () => {
        const top = bottlenecks(WAITING, 20);
        for (const b of top) {
            expect(b.type).not.toBe("Street");
            expect(b.type).not.toBe("Crossing");
        }
    });

    test("results are sorted by queue_score descending", () => {
        const top = bottlenecks(WAITING, 10);
        for (let i = 1; i < top.length; i++) {
            expect(top[i - 1].queue_score).toBeGreaterThanOrEqual(
                top[i].queue_score
            );
        }
    });
});

describe("entityOccupancyTimeline", () => {
    test("returns empty when entity is never visited", () => {
        const points = entityOccupancyTimeline(SMOOTH, "DOES_NOT_EXIST");
        expect(points).toEqual([]);
    });

    test("returns sampled points for a visited entity", () => {
        const points = entityOccupancyTimeline(SMOOTH, "P010", 60);
        expect(points.length).toBeGreaterThan(0);
        for (const p of points) {
            expect(p.count).toBeGreaterThanOrEqual(0);
        }
        // At least one point in P010 should show >0 occupancy in Smooth.
        expect(points.some((p) => p.count > 0)).toBe(true);
    });
});

describe("truckGantt", () => {
    test("returns the TimeEntries for a known order", () => {
        const entries = truckGantt(SMOOTH, "OAS-L 186-1");
        expect(entries.length).toBeGreaterThan(0);
        expect(entries[0].Location).toBe("LT010");
        expect(entries[0].Action).toBe("CheckIn");
    });

    test("returns [] for an unknown licence plate", () => {
        expect(truckGantt(SMOOTH, "NO-SUCH-PLATE")).toEqual([]);
    });
});
