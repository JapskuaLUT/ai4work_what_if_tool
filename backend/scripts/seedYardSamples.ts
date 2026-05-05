// backend/scripts/seedYardSamples.ts
//
// Bulk-imports the three sample simulator runs in
// specifications/yard_logistics/Results/ as a single yard_simulations case.
// Calls the ingest service directly — does not need the HTTP server running.
//
// Run with:   bun run seed:yard
//
// Always uses the fixed case_id SAMPLE_CASE_ID; re-running deletes the prior
// seed and re-creates it with current data. The MainPage button links to
// /yard/<SAMPLE_CASE_ID> which is why the id must be stable.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { db } from "../src/db";
import { yard_simulations, yard_runs } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { summarizeRun } from "../src/services/yardAnalyticsService";
import type {
    YardRunIngestInput,
    YardSimulationExport
} from "../src/types/yard";

const REPO_ROOT = join(__dirname, "..", "..");
const RESULTS_ROOT = join(
    REPO_ROOT,
    "specifications",
    "yard_logistics",
    "Results"
);

// Fixed case_id for the seeded sample so MainPage can link to it.
// Re-running with --replace regenerates the runs under the same id.
const SAMPLE_CASE_ID = "yard-sample-001";
const SAMPLE_NAME = "Yard AI4Work — sample comparison";
// Path is resolved by the UI; the asset is copied into ui/public/ at the
// same name during initial setup.
const YARD_IMAGE_PATH = "/yard_AI4Work.png";

interface SampleSpec {
    folder: string;
    file: string;
    run_id: string;
    label: string;
    description: string;
}

const SAMPLES: SampleSpec[] = [
    {
        folder: "01_Smooth",
        file: "SimResults_20260429-165003.complete.json",
        run_id: "01_smooth",
        label: "Smooth",
        description: "No problems, no waiting times."
    },
    {
        folder: "02_SequencedOk",
        file: "SimResults_20260429-165451.complete.json",
        run_id: "02_sequenced_ok",
        label: "SequencedOk",
        description: "Some small delays, but ok."
    },
    {
        folder: "03_WaitingProblem",
        file: "SimResults_20260429-171753.complete.json",
        run_id: "03_waiting_problem",
        label: "WaitingProblem",
        description: "More delays in case of occupied locations."
    }
];

function loadRun(spec: SampleSpec): YardRunIngestInput {
    const path = join(RESULTS_ROOT, spec.folder, spec.file);
    const exp = JSON.parse(
        readFileSync(path, "utf-8")
    ) as YardSimulationExport;

    // Filename stem encodes a timestamp like "20260429-165003".
    const stem = spec.file.replace(/^SimResults_/, "").replace(/\.complete\.json$/, "");
    const m = stem.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/);
    const simulated_at = m
        ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`
        : undefined;

    return {
        run_id: spec.run_id,
        label: spec.label,
        description: spec.description,
        simulated_at,
        export: exp
    };
}

async function main() {
    // Always re-seed the fixed case so the script is idempotent.
    const existing = await db.query.yard_simulations.findFirst({
        where: eq(yard_simulations.case_id, SAMPLE_CASE_ID)
    });
    if (existing) {
        console.log(`Deleting previous seed case ${SAMPLE_CASE_ID}`);
        await db
            .delete(yard_simulations)
            .where(eq(yard_simulations.case_id, SAMPLE_CASE_ID));
    }

    console.log(`Loading ${SAMPLES.length} sample runs from ${RESULTS_ROOT}`);
    const runs = SAMPLES.map(loadRun);

    // Decide whether yard + processes are shareable across all runs
    // (mirrors YardIngestService.createSimulation, but uses the fixed case_id).
    const firstHash = runs[0].export.ComparisonInformation;
    const allYardSame = runs.every(
        (r) =>
            r.export.ComparisonInformation.YardStructure === firstHash.YardStructure
    );
    const allProcSame = runs.every(
        (r) => r.export.ComparisonInformation.Processes === firstHash.Processes
    );
    const parentYard = allYardSame ? runs[0].export.YardStructure : null;
    const parentProcesses = allProcSame ? runs[0].export.Processes : null;
    const parentYardHash = allYardSame ? firstHash.YardStructure : null;
    const parentProcessesHash = allProcSame ? firstHash.Processes : null;

    await db.transaction(async (tx) => {
        await tx.insert(yard_simulations).values({
            case_id: SAMPLE_CASE_ID,
            name: SAMPLE_NAME,
            description:
                "Three reference runs over the same yard with progressively heavier order load.",
            yard_structure: parentYard,
            processes: parentProcesses,
            yard_hash: parentYardHash,
            processes_hash: parentProcessesHash,
            yard_image_path: YARD_IMAGE_PATH,
            metadata: {
                source: "specifications/yard_logistics/Results/",
                seeded_by: "seedYardSamples.ts"
            }
        });
        for (const run of runs) {
            const cmp = run.export.ComparisonInformation;
            const yardOverride =
                parentYardHash && cmp.YardStructure === parentYardHash
                    ? null
                    : run.export.YardStructure;
            const procOverride =
                parentProcessesHash && cmp.Processes === parentProcessesHash
                    ? null
                    : run.export.Processes;
            await tx.insert(yard_runs).values({
                case_id: SAMPLE_CASE_ID,
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
                summary_metrics: summarizeRun(run.export),
                simulated_at: run.simulated_at
                    ? new Date(run.simulated_at)
                    : null
            });
        }
    });

    console.log("");
    console.log(`Seeded yard simulation:`);
    console.log(`   case_id : ${SAMPLE_CASE_ID}`);
    console.log(`   runs    : ${runs.length}`);
    console.log(`   url     : /yard/${SAMPLE_CASE_ID}`);
    process.exit(0);
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
