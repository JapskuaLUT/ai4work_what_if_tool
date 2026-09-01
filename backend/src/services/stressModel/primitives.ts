// backend/src/services/stressModel/primitives.ts
//
// The four scalar helpers the model is built from (§4.1, §4.2, §4.5).
// Kept separate so the parity fixtures can exercise them directly.

/**
 * §4.1 — missing / NaN / infinite becomes 0, negatives are floored at 0.
 * Every workload value passes through this before it is used.
 */
export function safe(x: number | null | undefined): number {
    if (x === null || x === undefined) return 0;
    if (typeof x !== "number") return 0;
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, x);
}

/** Clamp into [lo, hi]. NaN collapses to `lo`. */
export function clip(x: number, lo: number, hi: number): number {
    if (!Number.isFinite(x)) return lo;
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}

/**
 * §4.2 — BL(x; s, e, m): zero below the activation point `s`, `m` at and
 * above the saturation point `e`, linear in between.
 */
export function boundedLinear(
    x: number,
    start: number,
    end: number,
    max: number
): number {
    if (x <= start) return 0;
    if (x >= end) return max;
    return (max * (x - start)) / (end - start);
}

/**
 * §4.5 — SoftCap(R; c, sigma) = c (1 - exp(-sigma R / c)).
 * Compresses unbounded raw stress into the [0, c) range.
 */
export function softCap(raw: number, ceiling: number, softness: number): number {
    return ceiling * (1 - Math.exp((-softness * raw) / ceiling));
}

/**
 * Normalised right-skewed weights q_i = ((i+1)/n)^p, g_i = q_i / sum(q).
 * Shared by homework (§3.3) and assignment (§3.4) distribution.
 * Returns an empty array for n <= 0.
 */
export function skewWeights(n: number, exponent: number): number[] {
    if (n <= 0) return [];
    const q: number[] = [];
    let total = 0;
    for (let i = 0; i < n; i++) {
        const v = Math.pow((i + 1) / n, exponent);
        q.push(v);
        total += v;
    }
    if (total === 0) return q.map(() => 1 / n);
    return q.map((v) => v / total);
}
