// backend/src/services/yardCompare.ts
//
// Helpers for deciding when two yard exports describe the same yard.
//
// The simulator includes Storage.Stock (current silo fill levels) inside
// YardStructure. Stock changes per run as trucks load/unload, so the
// simulator's YardStructure hash diverges between runs over the same
// physical yard. When deciding whether a yard is shared at parent level
// in our schema we want topology-equivalence, not byte-equivalence —
// strip the volatile state and compare what's left.

import type { YardDesignData } from "../types/yard";

const VOLATILE_STORAGE_FIELDS = ["Stock"] as const;

/**
 * Returns a stable JSON string of the yard's *topology* — entities,
 * streets, capacities, costs, processes — with mutable runtime state
 * (currently `Storage.Stock`) stripped. Equal strings ⇒ same yard.
 */
export function yardTopologyFingerprint(yard: YardDesignData): string {
    const stripped: YardDesignData = {
        Entities: {
            Crossings: yard.Entities.Crossings,
            ParkingAreas: yard.Entities.ParkingAreas,
            Scales: yard.Entities.Scales,
            Storages: yard.Entities.Storages.map((s) => {
                const out: Record<string, unknown> = { ...s };
                for (const f of VOLATILE_STORAGE_FIELDS) delete out[f];
                return out as unknown as (typeof yard.Entities.Storages)[number];
            }),
            Terminals: yard.Entities.Terminals
        },
        Streets: yard.Streets
    };
    return JSON.stringify(stripped, Object.keys(stripped).sort());
}

export function yardTopologyEqual(
    a: YardDesignData,
    b: YardDesignData
): boolean {
    return yardTopologyFingerprint(a) === yardTopologyFingerprint(b);
}
