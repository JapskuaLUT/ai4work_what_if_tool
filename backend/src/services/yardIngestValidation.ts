// backend/src/services/yardIngestValidation.ts
//
// Pre-flight validation for yard ingest payloads.
//
// The `export` field of a run is accepted opaquely at the API boundary
// (t.Any in yardRoutes.ts) because the simulator's SimulationExportData is
// partner-owned and may grow new fields. The flip side is that a malformed
// `export` — most commonly a double-serialized JSON *string* produced by
// serializing the object into a string property — used to sail through
// schema validation and blow up deep inside ingest with an opaque
// TypeError ("undefined is not an object (evaluating 'yard.Entities')").
//
// This module checks exactly the fields the ingest path dereferences and
// throws a YardIngestValidationError with a message that tells the API
// client what to fix. Lives in its own file (no db import) so it stays
// unit-testable without a database, like yardCompare.ts.

import type { YardRunIngestInput } from "../types/yard";

/**
 * Thrown when a run's `export` payload is not a usable SimulationExportData
 * object. The routes translate this into a 400 response.
 */
export class YardIngestValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "YardIngestValidationError";
    }
}

/**
 * Validate that `run.export` carries the fields the ingest path reads:
 * ComparisonInformation, YardStructure.Entities, Orders and
 * Measurements.Measurements. Throws YardIngestValidationError otherwise.
 *
 * `where` names the offending run in the message, e.g. "runs[0]" for the
 * create endpoint or "body" for the add-run endpoint.
 */
export function validateRunExport(
    run: YardRunIngestInput,
    where: string
): void {
    const exp: unknown = run.export;

    if (typeof exp === "string") {
        throw new YardIngestValidationError(
            `${where}.export is a JSON string, but must be the ` +
                `SimulationExportData JSON object itself. It looks ` +
                `double-serialized — embed the parsed object instead of ` +
                `a serialized string.`
        );
    }
    if (exp === null || exp === undefined) {
        throw new YardIngestValidationError(
            `${where}.export is missing. It must contain the simulator's ` +
                `SimulationExportData JSON object.`
        );
    }
    if (typeof exp !== "object" || Array.isArray(exp)) {
        throw new YardIngestValidationError(
            `${where}.export must be the SimulationExportData JSON object ` +
                `(got ${Array.isArray(exp) ? "an array" : typeof exp}).`
        );
    }

    const e = exp as Record<string, unknown>;
    const missing: string[] = [];

    if (!isObject(e.ComparisonInformation)) {
        missing.push("ComparisonInformation");
    }
    const yard = e.YardStructure as { Entities?: unknown } | undefined;
    if (!isObject(yard) || !isObject(yard.Entities)) {
        missing.push("YardStructure.Entities");
    }
    if (!Array.isArray(e.Orders)) {
        missing.push("Orders");
    }
    const meas = e.Measurements as { Measurements?: unknown } | undefined;
    if (!isObject(meas) || !Array.isArray(meas.Measurements)) {
        missing.push("Measurements.Measurements");
    }

    if (missing.length > 0) {
        throw new YardIngestValidationError(
            `${where}.export is missing or has malformed fields: ` +
                `${missing.join(", ")}. The export must be the simulator's ` +
                `SimulationExportData object with these keys at its top ` +
                `level — check that it is not nested one level deeper or ` +
                `renamed.`
        );
    }
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
