// backend/src/routes/yardRoutes.ts

import Elysia, { t } from "elysia";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { yard_simulations, yard_runs } from "../db/schema";
import { YardIngestService } from "../services/yardIngestService";
import { entityOccupancyTimeline } from "../services/yardAnalyticsService";
import type {
    OccupancyTimelineResponse,
    YardRunDetailResponse,
    YardRunSummaryResponse,
    YardSimulationOverviewResponse,
    YardSimulationExport
} from "../types/yard";

const ingest = new YardIngestService();

/**
 * The simulator's `SimulationExportData` is partner-owned and may grow new
 * fields. We accept it as opaque JSON at the API boundary and rely on the
 * TypeScript types in src/types/yard.ts inside the services. This avoids
 * blocking ingest when the simulator emits a new optional field.
 */
const RunIngestSchema = t.Object({
    run_id: t.String({ examples: ["01_smooth"] }),
    label: t.String({ examples: ["Smooth"] }),
    description: t.Optional(t.String()),
    simulated_at: t.Optional(t.String({ description: "ISO 8601 timestamp" })),
    export: t.Any({
        description: "SimulationExportData payload from the yard simulator"
    })
});

const CreateSchema = t.Object({
    name: t.String({ examples: ["Yard AI4Work — sample comparison"] }),
    description: t.Optional(t.String()),
    yard_image_path: t.Optional(t.String()),
    metadata: t.Optional(t.Any()),
    runs: t.Array(RunIngestSchema, { minItems: 1 })
});

export const yardRoutes = new Elysia({ prefix: "/simulations/yard" })

    /**
     * POST /api/simulations/yard/
     * Create a new yard simulation set with one or more simulator runs.
     */
    .post(
        "/",
        async ({ body, set }) => {
            try {
                const result = await ingest.createSimulation(body as any);
                set.status = 201;
                return {
                    caseId: result.case_id,
                    runCount: result.run_count,
                    resultsUrl: `${
                        process.env.APP_BASE_URL || "http://localhost"
                    }/yard/${result.case_id}`
                };
            } catch (error: any) {
                console.error("Failed to create yard simulation:", error);
                set.status = 500;
                return {
                    error: "An error occurred while saving the simulation.",
                    message: error.message
                };
            }
        },
        {
            body: CreateSchema,
            detail: {
                summary: "Create a new yard logistics simulation set",
                description:
                    "Ingests one or more simulator runs sharing the same yard. The yard graph and processes are stored once when all runs share their hashes; otherwise each run keeps its own copy.",
                tags: ["Yard Logistics"]
            }
        }
    )

    /**
     * POST /api/simulations/yard/:caseId/runs
     * Add a single run to an existing simulation. Will receive simulator
     * webhooks once the partner API is live.
     */
    .post(
        "/:caseId/runs",
        async ({ params, body, set }) => {
            try {
                await ingest.addRun(params.caseId, body as any);
                set.status = 201;
                return { caseId: params.caseId, runId: (body as any).run_id };
            } catch (error: any) {
                console.error("Failed to add yard run:", error);
                if (
                    error.message?.includes("not found") ||
                    error.message?.includes("yard simulation")
                ) {
                    set.status = 404;
                    return { error: error.message };
                }
                set.status = 500;
                return {
                    error: "An error occurred while adding the run.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            body: RunIngestSchema,
            detail: {
                summary: "Add a simulator run to an existing yard simulation",
                tags: ["Yard Logistics"]
            }
        }
    )

    /**
     * GET /api/simulations/yard/:caseId
     * Overview: parent metadata + every run's summary_metrics. Powers the
     * comparison view in the UI.
     */
    .get(
        "/:caseId",
        async ({ params, set }) => {
            try {
                const sim = await db.query.yard_simulations.findFirst({
                    where: eq(yard_simulations.case_id, params.caseId),
                    with: { runs: true }
                });
                if (!sim) {
                    set.status = 404;
                    return { error: "Yard simulation not found" };
                }

                const runs: YardRunSummaryResponse[] = sim.runs.map((r) => ({
                    run_id: r.run_id,
                    label: r.label,
                    description: r.description,
                    simulated_at: r.simulated_at?.toISOString() ?? null,
                    yard_hash: r.yard_hash,
                    processes_hash: r.processes_hash,
                    orders_hash: r.orders_hash,
                    summary_metrics: r.summary_metrics as any
                }));

                const response: YardSimulationOverviewResponse = {
                    case_id: sim.case_id,
                    name: sim.name,
                    description: sim.description,
                    yard_image_path: sim.yard_image_path,
                    yard_structure: sim.yard_structure as any,
                    processes: sim.processes as any,
                    yard_hash: sim.yard_hash,
                    processes_hash: sim.processes_hash,
                    selected_run_id: sim.selected_run_id,
                    selected_at: sim.selected_at?.toISOString() ?? null,
                    metadata: (sim.metadata as any) ?? {},
                    runs
                };
                return response;
            } catch (error: any) {
                console.error("Failed to retrieve yard simulation:", error);
                set.status = 500;
                return {
                    error: "An error occurred while retrieving the simulation.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            detail: {
                summary: "Get yard simulation overview with all runs",
                tags: ["Yard Logistics"]
            }
        }
    )

    /**
     * GET /api/simulations/yard/:caseId/:runId
     * Full detail of one run: orders + measurements + summary_metrics. The
     * yard structure / processes are inherited from the parent unless this
     * specific run carries an override.
     */
    .get(
        "/:caseId/:runId",
        async ({ params, set }) => {
            try {
                const run = await db.query.yard_runs.findFirst({
                    where: and(
                        eq(yard_runs.case_id, params.caseId),
                        eq(yard_runs.run_id, params.runId)
                    )
                });
                if (!run) {
                    set.status = 404;
                    return { error: "Yard run not found" };
                }

                const response: YardRunDetailResponse = {
                    case_id: run.case_id,
                    run_id: run.run_id,
                    label: run.label,
                    description: run.description,
                    simulated_at: run.simulated_at?.toISOString() ?? null,
                    yard_hash: run.yard_hash,
                    processes_hash: run.processes_hash,
                    orders_hash: run.orders_hash,
                    summary_metrics: run.summary_metrics as any,
                    orders: run.orders as any,
                    measurements: run.measurements as any,
                    yard_structure: run.yard_structure as any,
                    processes: run.processes as any
                };
                return response;
            } catch (error: any) {
                console.error("Failed to retrieve yard run:", error);
                set.status = 500;
                return {
                    error: "An error occurred while retrieving the run.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({
                caseId: t.String(),
                runId: t.String()
            }),
            detail: {
                summary: "Get a single yard simulator run with full payload",
                tags: ["Yard Logistics"]
            }
        }
    )

    /**
     * GET /api/simulations/yard/:caseId/:runId/timeline?entity=B010
     * On-demand per-entity occupancy timeline. Computed from raw measurements,
     * not stored.
     */
    .get(
        "/:caseId/:runId/timeline",
        async ({ params, query, set }) => {
            const entity = query.entity;
            if (!entity) {
                set.status = 400;
                return { error: "Missing required query parameter: entity" };
            }
            try {
                const run = await db.query.yard_runs.findFirst({
                    where: and(
                        eq(yard_runs.case_id, params.caseId),
                        eq(yard_runs.run_id, params.runId)
                    )
                });
                if (!run) {
                    set.status = 404;
                    return { error: "Yard run not found" };
                }
                const parent = await db.query.yard_simulations.findFirst({
                    where: eq(yard_simulations.case_id, params.caseId)
                });
                if (!parent) {
                    set.status = 404;
                    return { error: "Yard simulation not found" };
                }

                // Reconstruct a YardSimulationExport view for analytics
                const yardStructure =
                    (run.yard_structure as any) ?? (parent.yard_structure as any);
                const processes =
                    (run.processes as any) ?? (parent.processes as any) ?? [];
                const exp: YardSimulationExport = {
                    ComparisonInformation: {
                        YardStructure: run.yard_hash ?? "",
                        Processes: run.processes_hash ?? "",
                        Orders: run.orders_hash ?? ""
                    },
                    YardStructure: yardStructure,
                    Processes: processes,
                    Orders: run.orders as any,
                    Measurements: run.measurements as any
                };

                const points = entityOccupancyTimeline(exp, entity, 30);

                // Look up MaxOccupancy of the requested entity for the chart.
                const maxOcc = lookupMaxOccupancy(yardStructure, entity);

                const response: OccupancyTimelineResponse = {
                    case_id: run.case_id,
                    run_id: run.run_id,
                    entity,
                    max_occupancy: maxOcc,
                    points
                };
                return response;
            } catch (error: any) {
                console.error("Failed to compute timeline:", error);
                set.status = 500;
                return {
                    error: "An error occurred while computing the timeline.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String(), runId: t.String() }),
            query: t.Object({
                entity: t.String({
                    description:
                        "Entity name to plot (e.g. 'B010', 'P010', 'SL729')"
                })
            }),
            detail: {
                summary: "Per-entity occupancy timeline for a yard run",
                tags: ["Yard Logistics"]
            }
        }
    )

    /**
     * PUT /api/simulations/yard/:caseId/select
     * Mark a run as the preferred one.
     */
    .put(
        "/:caseId/select",
        async ({ params, body, set }) => {
            const { runId } = body as { runId: string };
            try {
                const sim = await db.query.yard_simulations.findFirst({
                    where: eq(yard_simulations.case_id, params.caseId)
                });
                if (!sim) {
                    set.status = 404;
                    return { error: "Yard simulation not found" };
                }
                const run = await db.query.yard_runs.findFirst({
                    where: and(
                        eq(yard_runs.case_id, params.caseId),
                        eq(yard_runs.run_id, runId)
                    )
                });
                if (!run) {
                    set.status = 404;
                    return { error: "Yard run not found" };
                }
                await db
                    .update(yard_simulations)
                    .set({ selected_run_id: runId, selected_at: new Date() })
                    .where(eq(yard_simulations.case_id, params.caseId));
                return {
                    success: true,
                    caseId: params.caseId,
                    selectedRunId: runId,
                    selectedAt: new Date().toISOString()
                };
            } catch (error: any) {
                console.error("Failed to select yard run:", error);
                set.status = 500;
                return {
                    error: "An error occurred while updating the selection.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            body: t.Object({ runId: t.String() }),
            detail: {
                summary: "Select a preferred yard run",
                tags: ["Yard Logistics"]
            }
        }
    )

    /**
     * GET /api/simulations/yard/:caseId/selection
     */
    .get(
        "/:caseId/selection",
        async ({ params, set }) => {
            try {
                const sim = await db.query.yard_simulations.findFirst({
                    where: eq(yard_simulations.case_id, params.caseId)
                });
                if (!sim) {
                    set.status = 404;
                    return { error: "Yard simulation not found" };
                }
                if (!sim.selected_run_id) {
                    return {
                        hasSelection: false,
                        caseId: params.caseId,
                        selectedRunId: null,
                        selectedAt: null
                    };
                }
                const run = await db.query.yard_runs.findFirst({
                    where: and(
                        eq(yard_runs.case_id, params.caseId),
                        eq(yard_runs.run_id, sim.selected_run_id)
                    )
                });
                return {
                    hasSelection: true,
                    caseId: params.caseId,
                    selectedRunId: sim.selected_run_id,
                    selectedAt: sim.selected_at?.toISOString() ?? null,
                    run: run
                        ? {
                              run_id: run.run_id,
                              label: run.label,
                              summary_metrics: run.summary_metrics
                          }
                        : null
                };
            } catch (error: any) {
                console.error("Failed to retrieve selection:", error);
                set.status = 500;
                return {
                    error: "An error occurred while retrieving the selection.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            detail: {
                summary: "Get the selected yard run",
                tags: ["Yard Logistics"]
            }
        }
    );

function lookupMaxOccupancy(yard: any, entityName: string): number {
    if (!yard) return 1;
    const e = yard.Entities ?? {};
    for (const c of e.Crossings ?? []) {
        if (c.Name === entityName) return c.MaxOccupancy ?? 1;
    }
    for (const p of e.ParkingAreas ?? []) {
        if (p.Name === entityName) return p.Capacity ?? 1;
    }
    for (const s of yard.Streets ?? []) {
        if (s.Name === entityName) return s.MaxOccupancy ?? 1;
    }
    // Scales/Storages/Terminals serve one truck at a time.
    return 1;
}
