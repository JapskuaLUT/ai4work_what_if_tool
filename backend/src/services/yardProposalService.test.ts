// backend/src/services/yardProposalService.test.ts

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { validateProposal } from "./yardProposalService";
import type {
    YardDesignData,
    YardProposalCreateInput,
    YardSimulationExport
} from "../types/yard";

const SAMPLES_ROOT = join(
    __dirname,
    "..",
    "..",
    "..",
    "specifications",
    "yard_logistics",
    "Results"
);

const SMOOTH = JSON.parse(
    readFileSync(
        join(SAMPLES_ROOT, "01_Smooth", "SimResults_20260429-165003.complete.json"),
        "utf-8"
    )
) as YardSimulationExport;
const YARD: YardDesignData = SMOOTH.YardStructure;

function p(over: Partial<YardProposalCreateInput>): YardProposalCreateInput {
    return {
        title: "Add a second barrier",
        summary: "B010 saturates at WaitingProblem load",
        changes: [
            { kind: "add_entity", entity_type: "Terminal", terminal_typ: "Schrankenterminal", name: "B020" }
        ],
        ...over
    };
}

describe("validateProposal — required fields", () => {
    test("rejects empty title", () => {
        const v = validateProposal(YARD, p({ title: "" }));
        expect(v.valid).toBe(false);
        expect(v.errors).toContain("title is required");
    });
    test("rejects empty summary", () => {
        const v = validateProposal(YARD, p({ summary: "" }));
        expect(v.valid).toBe(false);
        expect(v.errors).toContain("summary is required");
    });
    test("rejects empty changes array", () => {
        const v = validateProposal(YARD, p({ changes: [] }));
        expect(v.valid).toBe(false);
    });
});

describe("validateProposal — capacity changes", () => {
    test("accepts known entity with valid capacity change", () => {
        const v = validateProposal(YARD, p({
            changes: [{ kind: "capacity", entity: "P010", from: 12, to: 18 }]
        }));
        expect(v.valid).toBe(true);
        expect(v.errors).toEqual([]);
    });
    test("rejects unknown entity name", () => {
        const v = validateProposal(YARD, p({
            changes: [{ kind: "capacity", entity: "GHOST", from: 1, to: 2 }]
        }));
        expect(v.valid).toBe(false);
        expect(v.errors.some((e) => e.includes("GHOST"))).toBe(true);
    });
    test("rejects non-positive target capacity", () => {
        const v = validateProposal(YARD, p({
            changes: [{ kind: "capacity", entity: "P010", from: 12, to: 0 }]
        }));
        expect(v.valid).toBe(false);
    });
    test("warns when capacity is unchanged", () => {
        const v = validateProposal(YARD, p({
            changes: [{ kind: "capacity", entity: "P010", from: 12, to: 12 }]
        }));
        expect(v.valid).toBe(true);
        expect(v.warnings.some((w) => w.includes("unchanged"))).toBe(true);
    });
});

describe("validateProposal — reroute", () => {
    test("accepts reroute between two real storages", () => {
        const v = validateProposal(YARD, p({
            changes: [{ kind: "reroute", material: "186", from_storage: "SL729", to_storage: "SL35" }]
        }));
        expect(v.valid).toBe(true);
    });
    test("rejects reroute to non-storage entity", () => {
        const v = validateProposal(YARD, p({
            changes: [{ kind: "reroute", material: "186", from_storage: "SL729", to_storage: "P010" }]
        }));
        expect(v.valid).toBe(false);
        expect(v.errors.some((e) => e.includes("P010"))).toBe(true);
    });
});

describe("validateProposal — add_entity", () => {
    test("accepts a new terminal name", () => {
        const v = validateProposal(YARD, p({
            changes: [{ kind: "add_entity", entity_type: "Terminal", terminal_typ: "Schrankenterminal", name: "B020" }]
        }));
        expect(v.valid).toBe(true);
    });
    test("rejects duplicate of an existing entity", () => {
        const v = validateProposal(YARD, p({
            changes: [{ kind: "add_entity", entity_type: "Terminal", terminal_typ: "Schrankenterminal", name: "B010" }]
        }));
        expect(v.valid).toBe(false);
        expect(v.errors.some((e) => e.includes("already exists"))).toBe(true);
    });
    test("warns when connect-to street is unknown", () => {
        const v = validateProposal(YARD, p({
            changes: [{
                kind: "add_entity",
                entity_type: "Terminal",
                terminal_typ: "Schrankenterminal",
                name: "B020",
                connects: ["SXX_NOT_A_STREET"]
            }]
        }));
        expect(v.valid).toBe(true);
        expect(v.warnings.some((w) => w.includes("SXX_NOT_A_STREET"))).toBe(true);
    });
});

describe("validateProposal — stagger_orders", () => {
    test("accepts a description-only stagger", () => {
        const v = validateProposal(YARD, p({
            changes: [{ kind: "stagger_orders", description: "Spread arrivals over 180 min" }]
        }));
        expect(v.valid).toBe(true);
    });
    test("rejects empty description", () => {
        const v = validateProposal(YARD, p({
            changes: [{ kind: "stagger_orders", description: "" }]
        }));
        expect(v.valid).toBe(false);
    });
});

describe("validateProposal — without yard reference", () => {
    test("still accepts well-formed proposals but warns", () => {
        const v = validateProposal(null, p({
            changes: [{ kind: "capacity", entity: "P010", from: 12, to: 18 }]
        }));
        expect(v.valid).toBe(true);
        expect(v.warnings.some((w) => w.includes("yard structure"))).toBe(true);
    });
});

describe("validateProposal — unknown kind", () => {
    test("rejects unrecognised change kind", () => {
        const v = validateProposal(YARD, p({
            // @ts-expect-error — exercising runtime validation against a future kind
            changes: [{ kind: "magic", entity: "P010" }]
        }));
        expect(v.valid).toBe(false);
        expect(v.errors.some((e) => e.includes("magic"))).toBe(true);
    });
});
