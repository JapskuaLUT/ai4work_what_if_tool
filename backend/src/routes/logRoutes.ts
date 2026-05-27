// backend/src/routes/logRoutes.ts

import Elysia, { t } from "elysia";
import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { log_cases, log_rows } from "../db/schema";
import { LogIngestService, toLogRow } from "../services/logIngestService";
import {
    buildSessionDetail,
    buildSessionMetadata
} from "../services/logAnalyticsService";
import type {
    LogCaseOverviewResponse,
    SummaryMetrics
} from "../types/logisticLogs";

const ingest = new LogIngestService();

/**
 * Wire body shape — kept loose at the boundary (`t.Any()` for `rows`) so a
 * partner that adds new fields to the kiosk JSON doesn't get rejected.
 * The ingest service does the real validation.
 */
const CreateLogCaseSchema = t.Object({
    name: t.String({ examples: ["LT 010 — 2025-04 → 2026-04"] }),
    description: t.Optional(t.String()),
    location: t.String({ examples: ["LT 010"] }),
    topic: t.String({ examples: ["Check-In"] }),
    related_yard_case_id: t.Optional(t.String()),
    metadata: t.Optional(t.Any()),
    rows: t.Array(t.Any(), { minItems: 1 })
});

export const logRoutes = new Elysia({ prefix: "/logs" })

    /**
     * POST /api/logs/
     * Ingest a batch of kiosk log rows. Computes summary_metrics
     * server-side and writes everything in one transaction.
     */
    .post(
        "/",
        async ({ body, set }) => {
            try {
                const result = await ingest.createCase(body as any);
                set.status = 201;
                return {
                    caseId: result.case_id,
                    rowCount: result.row_count,
                    sessionCount: result.session_count,
                    resultsUrl: `${
                        process.env.APP_BASE_URL || "http://localhost"
                    }/logs/${result.case_id}`
                };
            } catch (error: any) {
                console.error("Failed to create log case:", error);
                set.status = 500;
                return {
                    error: "An error occurred while saving the log case.",
                    message: error.message
                };
            }
        },
        {
            body: CreateLogCaseSchema,
            detail: {
                summary: "Ingest a kiosk-log batch",
                tags: ["Logistic Logs"]
            }
        }
    )

    /**
     * GET /api/logs/:caseId
     * Overview + step aggregates. No raw rows.
     */
    .get(
        "/:caseId",
        async ({ params, set }) => {
            try {
                const row = await db.query.log_cases.findFirst({
                    where: eq(log_cases.case_id, params.caseId)
                });
                if (!row) {
                    set.status = 404;
                    return { error: "Log case not found" };
                }
                const summary = row.summary_metrics as SummaryMetrics;
                const response: LogCaseOverviewResponse = {
                    case_id: row.case_id,
                    name: row.name,
                    description: row.description,
                    location: row.location,
                    topic: row.topic,
                    related_yard_case_id: row.related_yard_case_id,
                    metadata: (row.metadata as any) ?? {},
                    created_at: row.created_at.toISOString(),
                    updated_at: row.updated_at.toISOString(),
                    overview: summary.overview,
                    aggregates: summary.aggregates
                };
                return response;
            } catch (error: any) {
                console.error("Failed to read log case:", error);
                set.status = 500;
                return {
                    error: "An error occurred while reading the log case.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            detail: {
                summary: "Get log case overview + step aggregates",
                tags: ["Logistic Logs"]
            }
        }
    )

    /**
     * GET /api/logs/:caseId/aggregates
     * Step aggregates only (alias for `.aggregates` on the overview).
     */
    .get(
        "/:caseId/aggregates",
        async ({ params, set }) => {
            try {
                const row = await db.query.log_cases.findFirst({
                    where: eq(log_cases.case_id, params.caseId)
                });
                if (!row) {
                    set.status = 404;
                    return { error: "Log case not found" };
                }
                const summary = row.summary_metrics as SummaryMetrics;
                return {
                    case_id: row.case_id,
                    aggregates: summary.aggregates
                };
            } catch (error: any) {
                console.error("Failed to read aggregates:", error);
                set.status = 500;
                return {
                    error: "An error occurred while reading aggregates.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            detail: {
                summary: "Get per-step duration aggregates",
                tags: ["Logistic Logs"]
            }
        }
    )

    /**
     * GET /api/logs/:caseId/sessions
     * Reconstructed session metadata for the table view. Excludes raw
     * rows; use /:processId for those.
     */
    .get(
        "/:caseId/sessions",
        async ({ params, set }) => {
            try {
                const parent = await db.query.log_cases.findFirst({
                    where: eq(log_cases.case_id, params.caseId)
                });
                if (!parent) {
                    set.status = 404;
                    return { error: "Log case not found" };
                }
                const rows = await db.query.log_rows.findMany({
                    where: eq(log_rows.case_id, params.caseId),
                    orderBy: [asc(log_rows.date), asc(log_rows.id)]
                });
                const sessions = buildSessionMetadata(rows.map(toLogRow));
                return { case_id: params.caseId, sessions };
            } catch (error: any) {
                console.error("Failed to list sessions:", error);
                set.status = 500;
                return {
                    error: "An error occurred while listing sessions.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            detail: {
                summary: "List driver sessions for this case",
                tags: ["Logistic Logs"]
            }
        }
    )

    /**
     * GET /api/logs/:caseId/sessions/:processId
     * Full row list for one session. Powers the per-session detail
     * drill-in; the UI's reconstructSteps() consumes this.
     */
    .get(
        "/:caseId/sessions/:processId",
        async ({ params, set }) => {
            const processId = Number(params.processId);
            if (!Number.isFinite(processId)) {
                set.status = 400;
                return { error: "processId must be numeric" };
            }
            try {
                const parent = await db.query.log_cases.findFirst({
                    where: eq(log_cases.case_id, params.caseId)
                });
                if (!parent) {
                    set.status = 404;
                    return { error: "Log case not found" };
                }
                const rows = await db.query.log_rows.findMany({
                    where: eq(log_rows.case_id, params.caseId),
                    orderBy: [asc(log_rows.date), asc(log_rows.id)]
                });
                const session = buildSessionDetail(
                    rows.map(toLogRow),
                    processId
                );
                if (!session) {
                    set.status = 404;
                    return { error: "Session not found in this case" };
                }
                return { case_id: params.caseId, session };
            } catch (error: any) {
                console.error("Failed to read session:", error);
                set.status = 500;
                return {
                    error: "An error occurred while reading the session.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({
                caseId: t.String(),
                processId: t.String()
            }),
            detail: {
                summary: "Get full rows of one driver session",
                tags: ["Logistic Logs"]
            }
        }
    )

    /**
     * POST /api/logs/:caseId/recompute
     * Re-runs the analytics over stored rows and updates summary_metrics.
     */
    .post(
        "/:caseId/recompute",
        async ({ params, set }) => {
            try {
                const { rowCount } = await ingest.recompute(params.caseId);
                return { ok: true, rowCount };
            } catch (error: any) {
                if (error.message?.includes("not found")) {
                    set.status = 404;
                    return { error: error.message };
                }
                console.error("Failed to recompute summary:", error);
                set.status = 500;
                return {
                    error: "An error occurred while recomputing.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            detail: {
                summary: "Recompute summary_metrics from stored rows",
                tags: ["Logistic Logs"]
            }
        }
    )

    /**
     * DELETE /api/logs/:caseId
     */
    .delete(
        "/:caseId",
        async ({ params, set }) => {
            try {
                const deleted = await db
                    .delete(log_cases)
                    .where(eq(log_cases.case_id, params.caseId))
                    .returning();
                if (deleted.length === 0) {
                    set.status = 404;
                    return { error: "Log case not found" };
                }
                return { ok: true, caseId: params.caseId };
            } catch (error: any) {
                console.error("Failed to delete log case:", error);
                set.status = 500;
                return {
                    error: "An error occurred while deleting the log case.",
                    message: error.message
                };
            }
        },
        {
            params: t.Object({ caseId: t.String() }),
            detail: {
                summary: "Delete a log case (cascades to rows)",
                tags: ["Logistic Logs"]
            }
        }
    );
