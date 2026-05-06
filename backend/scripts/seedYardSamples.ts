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

import { YardIngestService } from "../src/services/yardIngestService";
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
    console.log(`Loading ${SAMPLES.length} sample runs from ${RESULTS_ROOT}`);
    const runs = SAMPLES.map(loadRun);

    const ingest = new YardIngestService();
    const result = await ingest.createSimulation(
        {
            name: SAMPLE_NAME,
            description:
                "Three reference runs over the same yard with progressively heavier order load.",
            yard_image_path: YARD_IMAGE_PATH,
            metadata: {
                source: "specifications/yard_logistics/Results/",
                seeded_by: "seedYardSamples.ts"
            },
            runs
        },
        { caseId: SAMPLE_CASE_ID, replace: true }
    );

    console.log("");
    console.log(`Seeded yard simulation:`);
    console.log(`   case_id : ${result.case_id}`);
    console.log(`   runs    : ${result.run_count}`);
    console.log(`   url     : /yard/${result.case_id}`);
    process.exit(0);
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
