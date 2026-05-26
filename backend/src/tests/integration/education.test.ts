// backend/src/tests/integration/education.test.ts
//
// End-to-end happy-path coverage for /api/simulations/education/*. Uses
// specifications/examples/education/01_create_simulation.json as the
// request body so the same fixture serves as both API documentation and
// regression data.
//
// The whole block is skipped if the backend isn't reachable; this keeps
// `bun test` green when the dev stack isn't running.

import { describe, test, expect, beforeAll } from "bun:test";
import {
    APP_URL,
    apiFetch,
    backendReachable,
    loadExample
} from "./_helpers";

const reachable = await backendReachable();

describe.skipIf(!reachable)("education API — happy path", () => {
    let caseId = "";

    beforeAll(async () => {
        const body = loadExample("education", "01_create_simulation.json");
        const res = await apiFetch("/api/simulations/education/", {
            method: "POST",
            body: JSON.stringify(body)
        });
        expect(res.status).toBe(201);
        const data = (await res.json()) as {
            caseId: string;
            resultsUrl: string;
        };
        expect(data.caseId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
        expect(data.resultsUrl).toBe(`${APP_URL}/education/${data.caseId}`);
        caseId = data.caseId;
    });

    test("GET /:caseId returns four generated adjustments", async () => {
        const res = await apiFetch(`/api/simulations/education/${caseId}`);
        expect(res.status).toBe(200);
        const data = (await res.json()) as { week_schedules: any[] };
        const ids = data.week_schedules.map((s) => s.adjustment_id).sort();
        // adjustment_4 only appears when extensions are allowed (they are in
        // the example body), so we always expect four.
        expect(ids).toEqual([
            "adjustment_1",
            "adjustment_2",
            "adjustment_3",
            "adjustment_4"
        ]);
    });

    test("GET /:caseId/:adjustmentId returns scenario detail with score", async () => {
        const res = await apiFetch(
            `/api/simulations/education/${caseId}/adjustment_2`
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            adjustment_id: string;
            feasibility_score: number;
            key_changes: string;
            week_schedules: any[];
        };
        expect(data.adjustment_id).toBe("adjustment_2");
        expect(typeof data.feasibility_score).toBe("number");
        expect(typeof data.key_changes).toBe("string");
        expect(data.week_schedules.length).toBeGreaterThan(0);
    });

    test("PUT /:caseId/select stores a selection", async () => {
        const sel = loadExample("education", "02_select_adjustment.json");
        const res = await apiFetch(
            `/api/simulations/education/${caseId}/select`,
            { method: "PUT", body: JSON.stringify(sel) }
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            success: boolean;
            selectedAdjustmentId: string;
        };
        expect(data.success).toBe(true);
        expect(data.selectedAdjustmentId).toBe("adjustment_2");
    });

    test("GET /:caseId/selection mirrors the stored selection", async () => {
        const res = await apiFetch(
            `/api/simulations/education/${caseId}/selection`
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            hasSelection: boolean;
            selectedAdjustmentId: string | null;
        };
        expect(data.hasSelection).toBe(true);
        expect(data.selectedAdjustmentId).toBe("adjustment_2");
    });

    test("GET unknown caseId returns 404", async () => {
        const res = await apiFetch(
            "/api/simulations/education/no-such-case-uuid"
        );
        expect(res.status).toBe(404);
    });
});
