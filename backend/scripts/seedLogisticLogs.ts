// backend/scripts/seedLogisticLogs.ts
//
// Bulk-imports the LT 010 kiosk log dataset in
// specifications/logistic_logs/ as a single log_cases case. Mirrors
// seedYardSamples.ts. Idempotent — re-runs replace the same case.
//
// Run with:   bun run seed:logs

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LogIngestService } from "../src/services/logIngestService";
import type { LogRow } from "../src/types/logisticLogs";

const REPO_ROOT = join(__dirname, "..", "..");
const SOURCE = join(
    REPO_ROOT,
    "specifications",
    "logistic_logs",
    "logdata_aggregated.data.json"
);

const SAMPLE_CASE_ID = "lt010-2025-2026";
const SAMPLE_NAME = "LT 010 — Check-In kiosk logs";

function loadRowsBomAware(path: string): LogRow[] {
    let text = readFileSync(path, "utf-8");
    // Vendor file is UTF-8 with BOM.
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const parsed = JSON.parse(text) as { data: LogRow[] };
    if (!Array.isArray(parsed.data)) {
        throw new Error(
            `Expected { data: [...] } in ${path}, got ${typeof parsed.data}`
        );
    }
    return parsed.data;
}

async function main() {
    console.log(`Loading rows from ${SOURCE}`);
    const rows = loadRowsBomAware(SOURCE);
    console.log(`Loaded ${rows.length} rows`);

    const ingest = new LogIngestService();
    const result = await ingest.createCase(
        {
            name: SAMPLE_NAME,
            description:
                "Raw check-in kiosk events from LT 010 spanning roughly one year. " +
                "Vendor-supplied dataset under specifications/logistic_logs/.",
            location: rows[0]?.location ?? "LT 010",
            topic: rows[0]?.topic ?? "Check-In",
            metadata: {
                source: "specifications/logistic_logs/logdata_aggregated.data.json",
                seeded_by: "seedLogisticLogs.ts"
            },
            rows
        },
        { caseId: SAMPLE_CASE_ID, replace: true }
    );

    console.log("");
    console.log(`Seeded log case:`);
    console.log(`   case_id  : ${result.case_id}`);
    console.log(`   rows     : ${result.row_count}`);
    console.log(`   sessions : ${result.session_count}`);
    console.log(`   url      : /logs/${result.case_id}`);
    process.exit(0);
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
