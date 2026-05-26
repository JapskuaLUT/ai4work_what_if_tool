// backend/src/tests/integration/_helpers.ts
//
// Shared utilities for HTTP integration tests. These tests hit the running
// backend (via Traefik at https://backend.localhost, or a custom
// API_BASE_URL) and skip cleanly when the stack isn't up.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const API_URL =
    process.env.API_BASE_URL || "https://backend.localhost";
export const APP_URL =
    process.env.APP_BASE_URL || "https://app.localhost";

/**
 * Quick health probe. Returns true if the backend responds with 200 to
 * /api/health within the timeout, false otherwise. Used as the gate for
 * `describe.skipIf(!await backendReachable())`.
 */
export async function backendReachable(timeoutMs = 1500): Promise<boolean> {
    try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), timeoutMs);
        const res = await fetch(`${API_URL}/api/health`, {
            // mkcert-signed in dev — Bun's fetch needs this for self-signed
            // certs reachable through Traefik.
            tls: { rejectUnauthorized: false },
            signal: ctl.signal
        });
        clearTimeout(t);
        return res.ok;
    } catch {
        return false;
    }
}

/** Loads a JSON example from the repo's specifications/examples/ tree. */
export function loadExample(...segments: string[]): unknown {
    // tests live at backend/src/tests/integration/_helpers.ts → up 4 levels
    // to repo root.
    const repoRoot = join(__dirname, "..", "..", "..", "..");
    const path = join(repoRoot, "specifications", "examples", ...segments);
    return JSON.parse(readFileSync(path, "utf-8"));
}

/** Convenience wrapper that adds the dev-cert opt-out and JSON Content-Type. */
export async function apiFetch(
    pathAndQuery: string,
    init: RequestInit = {}
): Promise<Response> {
    return fetch(`${API_URL}${pathAndQuery}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init.headers as Record<string, string> | undefined)
        },
        tls: { rejectUnauthorized: false }
    } as any);
}
