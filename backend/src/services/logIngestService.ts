// backend/src/services/logIngestService.ts
//
// Ingest service for kiosk-log batches. Chunks the bulk insert to stay
// well under Postgres' 65535-parameter-per-statement cap (log_rows has
// 13 columns we insert, so 1000 rows per chunk uses 13K parameters).

import { eq } from "drizzle-orm";
import { db } from "../db";
import { log_cases, log_rows } from "../db/schema";
import { buildSummaryMetrics } from "./logAnalyticsService";
import type {
    CreateLogCaseResult,
    LogCaseCreateInput,
    LogRow
} from "../types/logisticLogs";

const ROW_CHUNK = 1000;

export class LogIngestService {
    /**
     * Persist a fresh case + all its rows in one transaction.
     * `options.caseId` lets the seed script pin a stable id; `options.replace`
     * deletes any prior case with that id first.
     */
    async createCase(
        input: LogCaseCreateInput,
        options: { caseId?: string; replace?: boolean } = {}
    ): Promise<CreateLogCaseResult> {
        if (!Array.isArray(input.rows) || input.rows.length === 0) {
            throw new Error("createCase requires at least one row");
        }
        if (!input.name?.trim()) throw new Error("name is required");
        if (!input.location?.trim()) throw new Error("location is required");
        if (!input.topic?.trim()) throw new Error("topic is required");

        const caseId = options.caseId ?? crypto.randomUUID();

        if (options.replace) {
            await db.delete(log_cases).where(eq(log_cases.case_id, caseId));
        }

        const summary = buildSummaryMetrics(input.rows);

        await db.transaction(async (tx) => {
            await tx.insert(log_cases).values({
                case_id: caseId,
                name: input.name,
                description: input.description ?? null,
                location: input.location,
                topic: input.topic,
                summary_metrics: summary,
                related_yard_case_id: input.related_yard_case_id ?? null,
                metadata: input.metadata ?? {}
            });

            for (const chunk of chunkArray(input.rows, ROW_CHUNK)) {
                await tx
                    .insert(log_rows)
                    .values(chunk.map((r) => toRowInsert(caseId, r)));
            }
        });

        return {
            case_id: caseId,
            row_count: input.rows.length,
            session_count: summary.overview.sessionCount
        };
    }

    /**
     * Recompute summary_metrics from the rows currently stored for a case.
     * Used after analytics code changes.
     */
    async recompute(caseId: string): Promise<{ rowCount: number }> {
        const existing = await db.query.log_cases.findFirst({
            where: eq(log_cases.case_id, caseId)
        });
        if (!existing) {
            throw new Error(`log case ${caseId} not found`);
        }
        const rows = await db.query.log_rows.findMany({
            where: eq(log_rows.case_id, caseId)
        });
        const mapped = rows.map(toLogRow);
        const summary = buildSummaryMetrics(mapped);
        await db
            .update(log_cases)
            .set({ summary_metrics: summary })
            .where(eq(log_cases.case_id, caseId));
        return { rowCount: rows.length };
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toRowInsert(caseId: string, r: LogRow) {
    return {
        case_id: caseId,
        source_id: r.id,
        date: new Date(r.date),
        location: r.location,
        topic: r.topic,
        process: r.process,
        proc: r.proc,
        procstep: r.procstep,
        procsteptype: r.procsteptype,
        procstepinfo: r.procstepinfo,
        procstepaction: r.procstepaction,
        message: r.message ?? null,
        value: r.value ?? null
    };
}

/** Convert a DB row back into the wire LogRow shape used by analytics. */
export function toLogRow(r: any): LogRow {
    return {
        id: r.source_id,
        date:
            r.date instanceof Date
                ? r.date.toISOString().replace("Z", "").replace(/\.\d+$/, "")
                : String(r.date),
        location: r.location,
        topic: r.topic,
        process: r.process,
        proc: r.proc,
        procstep: r.procstep,
        procsteptype: r.procsteptype,
        procstepinfo: r.procstepinfo,
        procstepaction: r.procstepaction,
        message: r.message ?? "",
        value: r.value ?? ""
    };
}

function* chunkArray<T>(arr: T[], size: number): Generator<T[]> {
    for (let i = 0; i < arr.length; i += size) {
        yield arr.slice(i, i + size);
    }
}
