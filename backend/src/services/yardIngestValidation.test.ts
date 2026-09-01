// backend/src/services/yardIngestValidation.test.ts

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
    validateRunExport,
    YardIngestValidationError
} from "./yardIngestValidation";
import type {
    YardRunIngestInput,
    YardSimulationExport
} from "../types/yard";

const SMOOTH = JSON.parse(
    readFileSync(
        join(
            __dirname,
            "..",
            "..",
            "..",
            "specifications",
            "yard_logistics",
            "Results",
            "01_Smooth",
            "SimResults_20260429-165003.complete.json"
        ),
        "utf-8"
    )
) as YardSimulationExport;

function run(exp: unknown): YardRunIngestInput {
    return {
        run_id: "test_run",
        label: "Test run",
        export: exp as YardSimulationExport
    };
}

describe("validateRunExport", () => {
    test("accepts a real simulator export", () => {
        expect(() => validateRunExport(run(SMOOTH), "runs[0]")).not.toThrow();
    });

    test("rejects a double-serialized export string with a hint", () => {
        expect(() =>
            validateRunExport(run(JSON.stringify(SMOOTH)), "runs[0]")
        ).toThrow(YardIngestValidationError);
        expect(() =>
            validateRunExport(run(JSON.stringify(SMOOTH)), "runs[0]")
        ).toThrow(/double-serialized/);
    });

    test("rejects a missing export", () => {
        expect(() => validateRunExport(run(undefined), "runs[0]")).toThrow(
            /runs\[0\]\.export is missing/
        );
        expect(() => validateRunExport(run(null), "runs[0]")).toThrow(
            YardIngestValidationError
        );
    });

    test("rejects non-object exports", () => {
        expect(() => validateRunExport(run(42), "runs[0]")).toThrow(
            /got number/
        );
        expect(() => validateRunExport(run([SMOOTH]), "runs[0]")).toThrow(
            /got an array/
        );
    });

    test("rejects an export nested one level too deep", () => {
        expect(() =>
            validateRunExport(run({ SimulationResult: SMOOTH }), "runs[0]")
        ).toThrow(/YardStructure\.Entities/);
    });

    test("names every missing field, using the caller's location label", () => {
        const partial = { ...SMOOTH, YardStructure: {}, Orders: undefined };
        expect(() => validateRunExport(run(partial), "body")).toThrow(
            /body\.export .*YardStructure\.Entities, Orders/
        );
    });
});
