// backend/src/services/yardIngestService.ts

import { eq } from "drizzle-orm";
import { db } from "../db";
import { yard_simulations, yard_runs } from "../db/schema";
import { summarizeRun } from "./yardAnalyticsService";
import type {
    YardRunIngestInput,
    YardSimulationIngestInput
} from "../types/yard";

/**
 * Ingest service for yard logistics simulator outputs.
 *
 * Today's flow: a JSON drop is POSTed to /api/simulations/yard/ as a
 * YardSimulationIngestInput (one parent + N runs). The same shape will
 * receive simulator-API webhooks later — POST /:caseId/runs adds runs to
 * an existing case with addRun().
 *
 * Storage rule: the yard graph + processes are stored once on the parent
 * when every run shares the same hash. A run that diverges keeps its own
 * copy in yard_runs.{yard_structure, processes}.
 */

export interface CreateSimulationResult {
    case_id: string;
    run_count: number;
}

export class YardIngestService {
    /**
     * Create a new yard simulation set with one or more runs.
     * Returns the newly-allocated case_id.
     */
    async createSimulation(
        input: YardSimulationIngestInput
    ): Promise<CreateSimulationResult> {
        if (input.runs.length === 0) {
            throw new Error("createSimulation requires at least one run");
        }

        const caseId = crypto.randomUUID();

        // Decide whether yard + processes are shareable across all runs.
        const firstHash = input.runs[0].export.ComparisonInformation;
        const allYardSame = input.runs.every(
            (r) =>
                r.export.ComparisonInformation.YardStructure ===
                firstHash.YardStructure
        );
        const allProcSame = input.runs.every(
            (r) =>
                r.export.ComparisonInformation.Processes ===
                firstHash.Processes
        );

        const parentYard = allYardSame ? input.runs[0].export.YardStructure : null;
        const parentProcesses = allProcSame ? input.runs[0].export.Processes : null;
        const parentYardHash = allYardSame ? firstHash.YardStructure : null;
        const parentProcessesHash = allProcSame ? firstHash.Processes : null;

        await db.transaction(async (tx) => {
            await tx.insert(yard_simulations).values({
                case_id: caseId,
                name: input.name,
                description: input.description ?? null,
                yard_structure: parentYard,
                processes: parentProcesses,
                yard_hash: parentYardHash,
                processes_hash: parentProcessesHash,
                yard_image_path: input.yard_image_path ?? null,
                metadata: input.metadata ?? {}
            });

            for (const run of input.runs) {
                await tx.insert(yard_runs).values(
                    this.buildRunRow(caseId, run, {
                        parentYardHash,
                        parentProcessesHash
                    })
                );
            }
        });

        return { case_id: caseId, run_count: input.runs.length };
    }

    /**
     * Add a single run to an existing simulation. Used by the future
     * simulator-webhook path (POST /:caseId/runs).
     *
     * The run's yard / processes are stored at run level only when their
     * hashes differ from what the parent has on file.
     */
    async addRun(caseId: string, run: YardRunIngestInput): Promise<void> {
        const parent = await db.query.yard_simulations.findFirst({
            where: eq(yard_simulations.case_id, caseId)
        });
        if (!parent) {
            throw new Error(`yard simulation ${caseId} not found`);
        }

        await db.insert(yard_runs).values(
            this.buildRunRow(caseId, run, {
                parentYardHash: parent.yard_hash,
                parentProcessesHash: parent.processes_hash
            })
        );
    }

    private buildRunRow(
        caseId: string,
        run: YardRunIngestInput,
        ctx: { parentYardHash: string | null; parentProcessesHash: string | null }
    ) {
        const cmp = run.export.ComparisonInformation;
        const yardOverride =
            ctx.parentYardHash && cmp.YardStructure === ctx.parentYardHash
                ? null
                : run.export.YardStructure;
        const procOverride =
            ctx.parentProcessesHash && cmp.Processes === ctx.parentProcessesHash
                ? null
                : run.export.Processes;

        const summary = summarizeRun(run.export);

        return {
            case_id: caseId,
            run_id: run.run_id,
            label: run.label,
            description: run.description ?? null,
            orders: run.export.Orders,
            measurements: run.export.Measurements,
            yard_structure: yardOverride,
            processes: procOverride,
            yard_hash: cmp.YardStructure,
            processes_hash: cmp.Processes,
            orders_hash: cmp.Orders,
            summary_metrics: summary,
            simulated_at: run.simulated_at ? new Date(run.simulated_at) : null
        };
    }
}
