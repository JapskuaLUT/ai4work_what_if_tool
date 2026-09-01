// backend/src/routes/yardRoutes.ts

import Elysia, { t } from "elysia";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db";
import {
    yard_simulations,
    yard_runs,
    yard_proposals
} from "../db/schema";
import { YardIngestService } from "../services/yardIngestService";
import { YardIngestValidationError } from "../services/yardIngestValidation";
import { entityOccupancyTimeline } from "../services/yardAnalyticsService";
import { validateProposal } from "../services/yardProposalService";
import {
    deleteYardImage,
    mimeToExt,
    publicUrlForImage,
    writeYardImage
} from "../services/yardImageService";
import type {
    OccupancyTimelineResponse,
    YardDesignData,
    YardProposal,
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
                // Malformed export payloads (e.g. a double-serialized JSON
                // string) get a 400 with the actionable message, not a 500.
                if (error instanceof YardIngestValidationError) {
                    set.status = 400;
                    return {
                        error: "Invalid simulation payload.",
                        message: error.message
                    };
                }
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
                if (error instanceof YardIngestValidationError) {
                    set.status = 400;
                    return {
                        error: "Invalid run payload.",
                        message: error.message
                    };
                }
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

                // The parent's yard_structure / processes are only populated
                // when all runs hash-match. Storage.Stock changes per run, so
                // hashes commonly diverge while topology stays identical —
                // fall back to the first run's copy for display.
                const firstRunWithYard = sim.runs.find(
                    (r) => r.yard_structure !== null
                );
                const firstRunWithProcesses = sim.runs.find(
                    (r) => r.processes !== null
                );

                const response: YardSimulationOverviewResponse = {
                    case_id: sim.case_id,
                    name: sim.name,
                    description: sim.description,
                    yard_image_path: sim.yard_image_path,
                    yard_structure:
                        (sim.yard_structure as any) ??
                        (firstRunWithYard?.yard_structure as any) ??
                        null,
                    processes:
                        (sim.processes as any) ??
                        (firstRunWithProcesses?.processes as any) ??
                        null,
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
    )

    // -----------------------------------------------------------------
    // Yard map image upload / removal
    // -----------------------------------------------------------------

    /**
     * POST /api/simulations/yard/:caseId/image
     * Upload (or replace) the yard layout image for this case.
     * Multipart body: `image` field. Allowed types: png/jpeg/webp/svg.
     * The file is written to backend/uploads/yard_images/{caseId}.{ext}
     * and served via the /uploads/* static handler; the public URL is
     * stored on `yard_simulations.yard_image_path` so subsequent GETs
     * pick it up automatically.
     */
    .post(
        "/:caseId/image",
        async ({ params, body, set }) => {
            const file = (body as { image: File }).image;
            const ext = mimeToExt(file.type);
            if (!ext) {
                set.status = 400;
                return {
                    error: "Unsupported image type",
                    message: `mime ${file.type} is not in [png, jpeg, webp, svg]`
                };
            }
            try {
                const sim = await db.query.yard_simulations.findFirst({
                    where: eq(yard_simulations.case_id, params.caseId)
                });
                if (!sim) {
                    set.status = 404;
                    return { error: "Yard simulation not found" };
                }
                const bytes = await file.arrayBuffer();
                await writeYardImage(params.caseId, ext, bytes);
                const url = publicUrlForImage(params.caseId, ext);
                await db
                    .update(yard_simulations)
                    .set({ yard_image_path: url })
                    .where(eq(yard_simulations.case_id, params.caseId));
                set.status = 201;
                return {
                    caseId: params.caseId,
                    yard_image_path: url,
                    bytes: file.size,
                    mimeType: file.type
                };
            } catch (error: any) {
                console.error("Failed to upload yard image:", error);
                set.status = 500;
                return {
                    error: "An error occurred while uploading the image.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            body: t.Object({
                image: t.File({
                    type: [
                        "image/png",
                        "image/jpeg",
                        "image/webp",
                        "image/svg+xml"
                    ],
                    maxSize: "5m"
                })
            }),
            type: "multipart/form-data",
            detail: {
                summary: "Upload (or replace) the yard layout image",
                tags: ["Yard Logistics"]
            }
        }
    )

    /**
     * DELETE /api/simulations/yard/:caseId/image
     * Remove the stored yard image file(s) and clear yard_image_path.
     */
    .delete(
        "/:caseId/image",
        async ({ params, set }) => {
            try {
                const sim = await db.query.yard_simulations.findFirst({
                    where: eq(yard_simulations.case_id, params.caseId)
                });
                if (!sim) {
                    set.status = 404;
                    return { error: "Yard simulation not found" };
                }
                const removed = await deleteYardImage(params.caseId);
                await db
                    .update(yard_simulations)
                    .set({ yard_image_path: null })
                    .where(eq(yard_simulations.case_id, params.caseId));
                return { ok: true, removedFiles: removed };
            } catch (error: any) {
                console.error("Failed to delete yard image:", error);
                set.status = 500;
                return {
                    error: "An error occurred while deleting the image.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            detail: {
                summary: "Remove the yard layout image",
                tags: ["Yard Logistics"]
            }
        }
    )

    // -----------------------------------------------------------------
    // Improvement proposals (AI-generated or manual)
    // -----------------------------------------------------------------

    /**
     * GET /api/simulations/yard/:caseId/proposals
     * List all proposals for a case (newest first).
     */
    .get(
        "/:caseId/proposals",
        async ({ params, set }) => {
            try {
                const sim = await db.query.yard_simulations.findFirst({
                    where: eq(yard_simulations.case_id, params.caseId)
                });
                if (!sim) {
                    set.status = 404;
                    return { error: "Yard simulation not found" };
                }
                const rows = await db
                    .select()
                    .from(yard_proposals)
                    .where(eq(yard_proposals.case_id, params.caseId))
                    .orderBy(desc(yard_proposals.created_at));
                return {
                    case_id: params.caseId,
                    proposals: rows.map(rowToProposal)
                };
            } catch (error: any) {
                console.error("Failed to list proposals:", error);
                set.status = 500;
                return {
                    error: "An error occurred while listing proposals.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            detail: {
                summary: "List improvement proposals for a yard simulation",
                tags: ["Yard Logistics"]
            }
        }
    )

    /**
     * POST /api/simulations/yard/:caseId/proposals
     * Persist a new proposal. Validates references against the parent
     * yard structure (or the first run's, if parent yard is null).
     */
    .post(
        "/:caseId/proposals",
        async ({ params, body, set }) => {
            try {
                const sim = await db.query.yard_simulations.findFirst({
                    where: eq(yard_simulations.case_id, params.caseId),
                    with: { runs: true }
                });
                if (!sim) {
                    set.status = 404;
                    return { error: "Yard simulation not found" };
                }
                const yard: YardDesignData | null =
                    (sim.yard_structure as any) ??
                    (sim.runs.find((r) => r.yard_structure)?.yard_structure as any) ??
                    null;

                const input = body as any;
                const validation = validateProposal(yard, input);
                if (!validation.valid) {
                    set.status = 400;
                    return {
                        error: "Proposal failed validation",
                        validation
                    };
                }

                const inserted = await db
                    .insert(yard_proposals)
                    .values({
                        case_id: params.caseId,
                        target_run_id: input.target_run_id ?? null,
                        title: input.title,
                        summary: input.summary,
                        target_bottleneck: input.target_bottleneck ?? null,
                        changes: input.changes,
                        expected_impact: input.expected_impact ?? null,
                        risks: input.risks ?? null,
                        source: input.source ?? "ai"
                    })
                    .returning();

                set.status = 201;
                return {
                    proposal: rowToProposal(inserted[0]),
                    validation
                };
            } catch (error: any) {
                console.error("Failed to create proposal:", error);
                set.status = 500;
                return {
                    error: "An error occurred while saving the proposal.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            // Accept opaquely; validateProposal does the real check.
            body: t.Any(),
            detail: {
                summary: "Save a yard improvement proposal",
                tags: ["Yard Logistics"]
            }
        }
    )

    /**
     * DELETE /api/simulations/yard/:caseId/proposals/:id
     */
    .delete(
        "/:caseId/proposals/:id",
        async ({ params, set }) => {
            const id = Number(params.id);
            if (!Number.isFinite(id)) {
                set.status = 400;
                return { error: "Proposal id must be numeric" };
            }
            try {
                const deleted = await db
                    .delete(yard_proposals)
                    .where(
                        and(
                            eq(yard_proposals.case_id, params.caseId),
                            eq(yard_proposals.id, id)
                        )
                    )
                    .returning();
                if (deleted.length === 0) {
                    set.status = 404;
                    return { error: "Proposal not found" };
                }
                return { ok: true, deletedId: id };
            } catch (error: any) {
                console.error("Failed to delete proposal:", error);
                set.status = 500;
                return {
                    error: "An error occurred while deleting the proposal.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String(), id: t.String() }),
            detail: {
                summary: "Delete an improvement proposal",
                tags: ["Yard Logistics"]
            }
        }
    );

function rowToProposal(r: any): YardProposal {
    return {
        id: r.id,
        case_id: r.case_id,
        target_run_id: r.target_run_id ?? null,
        title: r.title,
        summary: r.summary,
        target_bottleneck: r.target_bottleneck ?? null,
        changes: r.changes ?? [],
        expected_impact: r.expected_impact ?? null,
        risks: r.risks ?? null,
        source: r.source,
        sent_to_simulator_at: r.sent_to_simulator_at?.toISOString?.() ?? null,
        created_at: r.created_at?.toISOString?.() ?? r.created_at,
        updated_at: r.updated_at?.toISOString?.() ?? r.updated_at
    };
}

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
