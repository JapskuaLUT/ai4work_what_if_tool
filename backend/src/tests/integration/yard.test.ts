// backend/src/tests/integration/yard.test.ts
//
// End-to-end happy-path coverage for /api/simulations/yard/*. Mirrors the
// education suite. Uses specifications/examples/yard_logistics/*.json so
// the docs and the tests can't drift apart.
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

describe.skipIf(!reachable)("yard logistics API — happy path", () => {
    let caseId = "";
    let proposalId: number | null = null;

    beforeAll(async () => {
        const body = loadExample(
            "yard_logistics",
            "01_create_simulation.minimal.json"
        );
        const res = await apiFetch("/api/simulations/yard/", {
            method: "POST",
            body: JSON.stringify(body)
        });
        expect(res.status).toBe(201);
        const data = (await res.json()) as {
            caseId: string;
            runCount: number;
            resultsUrl: string;
        };
        expect(data.caseId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
        expect(data.runCount).toBe(1);
        expect(data.resultsUrl).toBe(`${APP_URL}/yard/${data.caseId}`);
        caseId = data.caseId;
    });

    afterAll(async () => {
        // Best-effort cleanup of the proposal; the case itself is orphaned
        // until we add a DELETE /:caseId endpoint. UUIDs guarantee no
        // collisions across test runs.
        if (proposalId !== null) {
            await apiFetch(
                `/api/simulations/yard/${caseId}/proposals/${proposalId}`,
                { method: "DELETE" }
            );
        }
    });

    test("GET /:caseId returns the seeded run with summary metrics", async () => {
        const res = await apiFetch(`/api/simulations/yard/${caseId}`);
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            runs: Array<{
                run_id: string;
                label: string;
                summary_metrics: {
                    orders: { overall: number; completed: number };
                    waiting_seconds: { max: number };
                };
            }>;
            yard_structure: any;
        };
        expect(data.runs).toHaveLength(1);
        const run = data.runs[0];
        expect(run.run_id).toBe("minimal_smooth");
        expect(run.label).toBe("Minimal");
        expect(run.summary_metrics.orders.overall).toBe(1);
        expect(run.summary_metrics.orders.completed).toBe(1);
        expect(run.summary_metrics.waiting_seconds.max).toBe(0);
        // Yard structure should be present (parent-level, since only one run).
        expect(data.yard_structure).toBeTruthy();
    });

    test("POST /:caseId/runs appends a second run", async () => {
        const body = loadExample("yard_logistics", "02_add_run.json");
        const res = await apiFetch(`/api/simulations/yard/${caseId}/runs`, {
            method: "POST",
            body: JSON.stringify(body)
        });
        expect(res.status).toBe(201);
        const ack = (await res.json()) as { caseId: string; runId: string };
        expect(ack.runId).toBe("minimal_second_run");

        // Confirm via the overview
        const ov = await (
            await apiFetch(`/api/simulations/yard/${caseId}`)
        ).json();
        expect(ov.runs).toHaveLength(2);
    });

    test("GET /:caseId/:runId returns full payload with measurements", async () => {
        const res = await apiFetch(
            `/api/simulations/yard/${caseId}/minimal_smooth`
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            run_id: string;
            orders: any[];
            measurements: { Measurements: any[] };
        };
        expect(data.run_id).toBe("minimal_smooth");
        expect(data.orders).toHaveLength(1);
        expect(data.measurements.Measurements).toHaveLength(1);
    });

    test("GET timeline returns sampled occupancy points for a known entity", async () => {
        const res = await apiFetch(
            `/api/simulations/yard/${caseId}/minimal_smooth/timeline?entity=P010`
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            entity: string;
            max_occupancy: number;
            points: Array<{ t_seconds: number; count: number }>;
        };
        expect(data.entity).toBe("P010");
        expect(data.max_occupancy).toBe(4); // matches the minimal yard's P010 Capacity
        expect(data.points.length).toBeGreaterThan(0);
        // At least one sample point during the parking interval should
        // record a present truck.
        expect(data.points.some((p) => p.count > 0)).toBe(true);
    });

    test("GET timeline without `entity` returns 4xx", async () => {
        // Elysia's schema validator returns 422 for missing required query
        // params before the handler can apply its own 400. Either is a
        // reasonable contract for "bad input"; the test accepts both.
        const res = await apiFetch(
            `/api/simulations/yard/${caseId}/minimal_smooth/timeline`
        );
        expect([400, 422]).toContain(res.status);
    });

    test("PUT /:caseId/select stores a selection; GET /selection mirrors it", async () => {
        const body = loadExample("yard_logistics", "04_select_run.json");
        const sel = await apiFetch(
            `/api/simulations/yard/${caseId}/select`,
            { method: "PUT", body: JSON.stringify(body) }
        );
        expect(sel.status).toBe(200);

        const get = await (
            await apiFetch(`/api/simulations/yard/${caseId}/selection`)
        ).json();
        expect(get.hasSelection).toBe(true);
        expect(get.selectedRunId).toBe("minimal_smooth");
    });

    test("POST a valid proposal returns 201 and persists it", async () => {
        const body = loadExample(
            "yard_logistics",
            "03_create_proposal.json"
        );
        const res = await apiFetch(
            `/api/simulations/yard/${caseId}/proposals`,
            { method: "POST", body: JSON.stringify(body) }
        );
        expect(res.status).toBe(201);
        const data = (await res.json()) as {
            proposal: { id: number; title: string; source: string };
            validation: { valid: boolean; errors: string[] };
        };
        expect(data.validation.valid).toBe(true);
        expect(data.proposal.source).toBe("manual");
        proposalId = data.proposal.id;

        // List proposals should include it
        const list = (await (
            await apiFetch(`/api/simulations/yard/${caseId}/proposals`)
        ).json()) as { proposals: Array<{ id: number }> };
        expect(list.proposals.some((p) => p.id === proposalId)).toBe(true);
    });

    test("POST an invalid proposal returns 400 with structured validation", async () => {
        const badBody = {
            title: "References ghost entity",
            summary: "Should be rejected by the validator.",
            changes: [
                {
                    kind: "capacity",
                    entity: "DOES_NOT_EXIST",
                    from: 1,
                    to: 2
                }
            ],
            source: "manual"
        };
        const res = await apiFetch(
            `/api/simulations/yard/${caseId}/proposals`,
            { method: "POST", body: JSON.stringify(badBody) }
        );
        expect(res.status).toBe(400);
        const data = (await res.json()) as {
            error: string;
            validation: { valid: boolean; errors: string[] };
        };
        expect(data.validation.valid).toBe(false);
        expect(
            data.validation.errors.some((e) => e.includes("DOES_NOT_EXIST"))
        ).toBe(true);
    });

    test("DELETE proposal then re-list returns 200 minus the deleted one", async () => {
        // skip if the create test didn't run / failed
        if (proposalId === null) return;
        const del = await apiFetch(
            `/api/simulations/yard/${caseId}/proposals/${proposalId}`,
            { method: "DELETE" }
        );
        expect(del.status).toBe(200);

        const list = (await (
            await apiFetch(`/api/simulations/yard/${caseId}/proposals`)
        ).json()) as { proposals: Array<{ id: number }> };
        expect(list.proposals.some((p) => p.id === proposalId)).toBe(false);
        proposalId = null; // afterAll won't try to re-delete
    });

    test("GET unknown caseId returns 404", async () => {
        const res = await apiFetch(
            "/api/simulations/yard/no-such-case-uuid"
        );
        expect(res.status).toBe(404);
    });

    test("Forward-to-simulator stub responds (current expectation: 503/501/404 — defined endpoint, not implemented)", async () => {
        if (proposalId === null) return; // depends on a saved proposal
        const res = await apiFetch(
            `/api/simulations/yard/${caseId}/proposals/${proposalId}/run`,
            { method: "POST" }
        );
        // The forward endpoint is documented in the OpenAPI but not wired
        // up server-side yet. When implemented this assertion should
        // tighten to expect(res.status).toBe(202).
        expect([404, 501, 503]).toContain(res.status);
    });
});
