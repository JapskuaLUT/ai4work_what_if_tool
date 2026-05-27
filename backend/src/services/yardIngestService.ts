// backend/src/services/yardIngestService.ts

import { eq } from "drizzle-orm";
import { db } from "../db";
import { yard_simulations, yard_runs } from "../db/schema";
import { summarizeRun } from "./yardAnalyticsService";
import { yardTopologyEqual } from "./yardCompare";
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
     * Create a new yard simulation set with one or more runs. The
     * `caseId` is auto-generated unless `options.caseId` is supplied
     * (the seed script uses a fixed id so the MainPage button can link
     * to it). Pass `options.replace = true` to delete an existing case
     * with the same id first.
     */
    async createSimulation(
        input: YardSimulationIngestInput,
        options: { caseId?: string; replace?: boolean } = {}
    ): Promise<CreateSimulationResult> {
        if (input.runs.length === 0) {
            throw new Error("createSimulation requires at least one run");
        }

        const caseId = options.caseId ?? crypto.randomUUID();

        if (options.replace) {
            await db
                .delete(yard_simulations)
                .where(eq(yard_simulations.case_id, caseId));
        }

        // Decide whether yard + processes are shareable across all runs.
        // For the yard we compare *topology* not the raw simulator hash:
        // Storage.Stock changes per run, which makes the hashes diverge
        // even when the layout is identical. See yardCompare.ts.
        const firstRun = input.runs[0];
        const firstHash = firstRun.export.ComparisonInformation;
        const allYardSame = input.runs.every((r) =>
            yardTopologyEqual(
                r.export.YardStructure,
                firstRun.export.YardStructure
            )
        );
        const allProcSame = input.runs.every(
            (r) =>
                r.export.ComparisonInformation.Processes ===
                firstHash.Processes
        );

        const parentYard = allYardSame ? firstRun.export.YardStructure : null;
        const parentProcesses = allProcSame ? firstRun.export.Processes : null;
        // The hash columns still carry the simulator's original hashes —
        // they are user-facing identifiers for "is this the same input?"
        // and we don't want to re-mint them.
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
                        parentYard,
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
                parentYard: parent.yard_structure as any,
                parentProcessesHash: parent.processes_hash
            })
        );
    }

    private buildRunRow(
        caseId: string,
        run: YardRunIngestInput,
        ctx: {
            parentYard: import("../types/yard").YardDesignData | null;
            parentProcessesHash: string | null;
        }
    ) {
        const cmp = run.export.ComparisonInformation;
        // Topology-equivalent yards don't need a per-run override; the
        // parent copy is fine for display. We discard the run's stock
        // levels here, which is acceptable because per-run stock is
        // already represented inside the run's own measurements.
        const yardOverride =
            ctx.parentYard &&
            yardTopologyEqual(ctx.parentYard, run.export.YardStructure)
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
