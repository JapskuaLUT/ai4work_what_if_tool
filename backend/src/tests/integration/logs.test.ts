// backend/src/tests/integration/logs.test.ts
//
// End-to-end happy-path coverage for /api/logs/*. Uses the minimal
// example body shipped under specifications/examples/logistic_logs/ so
// the documentation and tests can't drift apart.
//
// The whole block is skipped if the backend isn't reachable.

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
    APP_URL,
    apiFetch,
    backendReachable,
    loadExample
} from "./_helpers";

const reachable = await backendReachable();

describe.skipIf(!reachable)("logistic logs API — happy path", () => {
    let caseId = "";

    beforeAll(async () => {
        const body = loadExample("logistic_logs", "01_create_case.json");
        const res = await apiFetch("/api/logs/", {
            method: "POST",
            body: JSON.stringify(body)
        });
        expect(res.status).toBe(201);
        const data = (await res.json()) as {
            caseId: string;
            rowCount: number;
            sessionCount: number;
            resultsUrl: string;
        };
        expect(data.caseId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
        expect(data.rowCount).toBe(9);
        expect(data.sessionCount).toBe(1);
        expect(data.resultsUrl).toBe(`${APP_URL}/logs/${data.caseId}`);
        caseId = data.caseId;
    });

    afterAll(async () => {
        if (caseId) {
            await apiFetch(`/api/logs/${caseId}`, { method: "DELETE" });
        }
    });

    test("GET /:caseId returns overview + aggregates with the example numbers", async () => {
        const res = await apiFetch(`/api/logs/${caseId}`);
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            name: string;
            location: string;
            topic: string;
            overview: {
                rowCount: number;
                sessionCount: number;
                location: string;
                topic: string;
                durationStats: { medianSec: number };
            };
            aggregates: Array<{ stepInfo: string; type: string; p50Sec: number }>;
        };
        expect(data.location).toBe("LT 010");
        expect(data.topic).toBe("Check-In");
        expect(data.overview.rowCount).toBe(9);
        expect(data.overview.sessionCount).toBe(1);
        // The synthetic session takes 30s start to finish
        expect(data.overview.durationStats.medianSec).toBe(30);
        // SPRACHAUSWAHL is present in the example and the aggregator
        // should record an 8-second duration.
        const sprach = data.aggregates.find((a) => a.stepInfo === "SPRACHAUSWAHL");
        expect(sprach).toBeDefined();
        expect(sprach!.type).toBe("DIALOG");
        expect(sprach!.p50Sec).toBe(8);
    });

    test("GET /:caseId/sessions reconstructs one completed session", async () => {
        const res = await apiFetch(`/api/logs/${caseId}/sessions`);
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            sessions: Array<{
                processId: number;
                eventCount: number;
                completed: boolean;
                licensePlate: string | null;
            }>;
        };
        expect(data.sessions).toHaveLength(1);
        const [s] = data.sessions;
        expect(s.processId).toBe(9001);
        // 9 raw rows total, one is the process=0 sentinel → 8 in session
        expect(s.eventCount).toBe(8);
        expect(s.completed).toBe(true);
        expect(s.licensePlate).toBe("HB-EX 001");
    });

    test("GET /:caseId/sessions/:processId returns full row list", async () => {
        const res = await apiFetch(`/api/logs/${caseId}/sessions/9001`);
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            session: { rows: any[]; durationSec: number };
        };
        expect(data.session.rows).toHaveLength(8);
        expect(data.session.durationSec).toBe(30);
    });

    test("GET /:caseId/aggregates aliases the overview's aggregates", async () => {
        const res = await apiFetch(`/api/logs/${caseId}/aggregates`);
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            aggregates: Array<{ stepInfo: string }>;
        };
        expect(data.aggregates.length).toBeGreaterThan(0);
        expect(
            data.aggregates.some((a) => a.stepInfo === "EINGABE KENNZEICHEN")
        ).toBe(true);
    });

    test("POST /:caseId/recompute returns ok with the current row count", async () => {
        const res = await apiFetch(`/api/logs/${caseId}/recompute`, {
            method: "POST"
        });
        expect(res.status).toBe(200);
        const data = (await res.json()) as { ok: boolean; rowCount: number };
        expect(data.ok).toBe(true);
        expect(data.rowCount).toBe(9);
    });

    test("GET unknown caseId returns 404", async () => {
        const res = await apiFetch("/api/logs/no-such-case-uuid");
        expect(res.status).toBe(404);
    });

    test("GET unknown session in valid caseId returns 404", async () => {
        const res = await apiFetch(`/api/logs/${caseId}/sessions/999999`);
        expect(res.status).toBe(404);
    });

    test("GET non-numeric processId returns 400", async () => {
        const res = await apiFetch(`/api/logs/${caseId}/sessions/not-a-number`);
        expect(res.status).toBe(400);
    });
});
