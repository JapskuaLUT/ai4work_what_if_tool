// backend/src/services/yardProposalService.ts
//
// Pure validation for yard improvement proposals. Run on save so we don't
// persist proposals that reference entities the yard doesn't have, or
// describe nonsensical changes. Validation errors are returned to the UI;
// the row is rejected when `valid === false`.

import type {
    ProposalChange,
    ProposalValidation,
    YardDesignData,
    YardProposalCreateInput
} from "../types/yard";

const KNOWN_KINDS: Array<ProposalChange["kind"]> = [
    "capacity",
    "stagger_orders",
    "reroute",
    "add_entity"
];

/**
 * Walks a proposal's `changes` against a yard structure. Hard errors
 * mean the proposal can't be persisted; warnings are advisory and the
 * UI can surface them to the user without blocking save.
 */
export function validateProposal(
    yard: YardDesignData | null,
    input: YardProposalCreateInput
): ProposalValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.title?.trim()) errors.push("title is required");
    if (!input.summary?.trim()) errors.push("summary is required");
    if (!Array.isArray(input.changes) || input.changes.length === 0) {
        errors.push("at least one change is required");
    }

    // Build a name lookup once (skip if we have no yard reference; we still
    // accept the proposal but note the missing layout in warnings).
    const known = yard ? collectEntityNames(yard) : null;
    const knownStorages = yard
        ? new Set(yard.Entities.Storages.map((s) => s.Name))
        : null;
    const knownStreets = yard ? new Set(yard.Streets.map((s) => s.Name)) : null;

    if (!yard) {
        warnings.push(
            "yard structure not available — entity references could not be checked"
        );
    }

    (input.changes ?? []).forEach((c, i) => {
        const where = `changes[${i}]`;
        if (!c || typeof c !== "object") {
            errors.push(`${where}: not an object`);
            return;
        }
        if (!KNOWN_KINDS.includes(c.kind as ProposalChange["kind"])) {
            errors.push(`${where}: unknown kind "${(c as any).kind}"`);
            return;
        }
        switch (c.kind) {
            case "capacity": {
                if (!c.entity) {
                    errors.push(`${where}: capacity change missing entity`);
                    break;
                }
                if (known && !known.has(c.entity)) {
                    errors.push(
                        `${where}: entity "${c.entity}" does not exist in the yard`
                    );
                }
                if (typeof c.from !== "number" || typeof c.to !== "number") {
                    errors.push(`${where}: from/to must be numbers`);
                }
                if (typeof c.to === "number" && c.to <= 0) {
                    errors.push(`${where}: target capacity must be > 0`);
                }
                if (
                    typeof c.from === "number" &&
                    typeof c.to === "number" &&
                    c.from === c.to
                ) {
                    warnings.push(`${where}: capacity unchanged`);
                }
                break;
            }
            case "reroute": {
                if (!c.material) {
                    errors.push(`${where}: reroute missing material`);
                }
                if (!c.from_storage || !c.to_storage) {
                    errors.push(
                        `${where}: reroute requires from_storage and to_storage`
                    );
                    break;
                }
                if (knownStorages) {
                    if (!knownStorages.has(c.from_storage)) {
                        errors.push(
                            `${where}: from_storage "${c.from_storage}" is not a Storage entity`
                        );
                    }
                    if (!knownStorages.has(c.to_storage)) {
                        errors.push(
                            `${where}: to_storage "${c.to_storage}" is not a Storage entity`
                        );
                    }
                }
                if (c.from_storage === c.to_storage) {
                    warnings.push(`${where}: from_storage == to_storage`);
                }
                break;
            }
            case "add_entity": {
                if (!c.name) {
                    errors.push(`${where}: add_entity missing name`);
                }
                if (known && c.name && known.has(c.name)) {
                    errors.push(
                        `${where}: entity "${c.name}" already exists`
                    );
                }
                if (knownStreets && c.connects) {
                    for (const s of c.connects) {
                        if (!knownStreets.has(s)) {
                            warnings.push(
                                `${where}: street "${s}" not found — simulator may need extra wiring`
                            );
                        }
                    }
                }
                if (
                    c.entity_type === "Terminal" &&
                    !c.terminal_typ
                ) {
                    warnings.push(
                        `${where}: Terminal added without terminal_typ — simulator default will apply`
                    );
                }
                break;
            }
            case "stagger_orders": {
                if (!c.description?.trim()) {
                    errors.push(`${where}: stagger_orders missing description`);
                }
                if (
                    typeof c.target_arrivals_per_min === "number" &&
                    c.target_arrivals_per_min <= 0
                ) {
                    errors.push(
                        `${where}: target_arrivals_per_min must be > 0`
                    );
                }
                break;
            }
        }
    });

    return { valid: errors.length === 0, errors, warnings };
}

function collectEntityNames(yard: YardDesignData): Set<string> {
    const out = new Set<string>();
    for (const list of [
        yard.Entities.Crossings,
        yard.Entities.ParkingAreas,
        yard.Entities.Scales,
        yard.Entities.Storages,
        yard.Entities.Terminals
    ]) {
        for (const e of list) out.add(e.Name);
    }
    return out;
}
