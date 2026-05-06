// ui/src/components/yard/yardProposalPrompt.ts
//
// Prompt builder + tolerant parser for AI-generated yard improvement
// proposals. The LLM is instructed to emit a JSON array; we strip code
// fences and parse, then re-shape into our internal types.

import type {
    ProposalChange,
    YardProposalCreateInput,
    YardRunSummary,
    YardSimulationOverview
} from "@/types/yard";
import { formatSeconds } from "@/services/yardSimulationService";

const SCHEMA_DOC = `Each proposal must be a JSON object with the following fields:
{
  "title": "string, short headline",
  "summary": "string, 1-3 sentences explaining what this changes and why",
  "target_bottleneck": "string|null, the entity name this addresses (e.g. \\"B010\\", \\"P010\\") or null",
  "changes": [ <one or more change objects, see below> ],
  "expected_impact": "string|null, a concrete prediction of the effect (e.g. 'halves max wait at B010')",
  "risks": "string|null, honest caveats (e.g. 'requires new road segment, cost not modelled')"
}

Each change must be one of these typed objects:

  { "kind": "capacity",
    "entity": "<existing entity name, e.g. P010>",
    "from": <current capacity, integer>,
    "to":   <new capacity, integer>,
    "note": "optional one-line rationale" }

  { "kind": "stagger_orders",
    "description": "what to change about order arrival timing",
    "target_arrivals_per_min": <optional positive number>,
    "spread_window_min":       <optional positive number>,
    "note": "optional one-line rationale" }

  { "kind": "reroute",
    "material": "<material id, e.g. 186>",
    "from_storage": "<existing Storage entity name, e.g. SL729>",
    "to_storage":   "<existing Storage entity name>",
    "note": "optional one-line rationale" }

  { "kind": "add_entity",
    "entity_type": "Terminal" | "ParkingArea" | "Scale" | "Storage" | "Crossing",
    "terminal_typ": "CheckIn" | "CheckOut" | "Waagenterminal" | "Schrankenterminal"  (only for Terminal),
    "name": "<new unique name, e.g. B020>",
    "connects": [ "<existing street name>", ... ]  (optional),
    "note": "optional one-line rationale" }
`;

export interface BuildPromptArgs {
    overview: YardSimulationOverview;
    targetRun: YardRunSummary;
    /** How many proposals to ask for (model may emit fewer). */
    count?: number;
}

export function buildSystemPrompt(): string {
    return `You are a yard logistics planner reviewing simulator results to suggest practical layout and scheduling improvements.

OUTPUT CONTRACT
- Reply with VALID JSON only — a single JSON object with one key "proposals" whose value is an array of proposal objects:
    { "proposals": [ { ... }, { ... } ] }
- No prose, no Markdown, no code fences. The first character of your reply must be "{".
- Use the exact field names and "kind" literals defined below.
- All strings must use double quotes and escape any internal double quotes as \\".
- Reference only entity names that actually exist in the supplied data. Do NOT invent names except for "add_entity" where you are creating something new.
- Be concrete. Each proposal must address an observable problem in the data (e.g. a saturated entity with queue_score > 1).
- Be conservative. Suggest the smallest change that plausibly fixes the bottleneck. Prefer one or two changes per proposal.
- If a run already runs smoothly, return { "proposals": [] }.

${SCHEMA_DOC}`;
}

export function buildUserPrompt(args: BuildPromptArgs): string {
    const { overview, targetRun, count = 3 } = args;
    const m = targetRun.summary_metrics;
    const lines: string[] = [];

    lines.push(
        `Produce up to ${count} improvement proposals targeting the "${targetRun.label}" run (run_id: ${targetRun.run_id}).`
    );
    lines.push("");
    lines.push(`Case: "${overview.name}" — ${overview.runs.length} runs total.`);
    lines.push("");

    // Target run KPIs
    lines.push("TARGET RUN KPIs:");
    lines.push(
        `  orders: ${m.orders.completed}/${m.orders.overall} completed (${m.orders.incomplete} incomplete, ${m.orders.unhandled} unhandled)`
    );
    lines.push(
        `  waiting: total=${formatSeconds(m.waiting_seconds.total)}, avg=${formatSeconds(m.waiting_seconds.avg)}, max=${formatSeconds(m.waiting_seconds.max)}, p95=${formatSeconds(m.waiting_seconds.p95)}`
    );
    lines.push(
        `  driving: total=${formatSeconds(m.driving_seconds.total)}, avg=${formatSeconds(m.driving_seconds.avg)}`
    );
    lines.push(
        `  throughput: ${m.throughput.orders_per_hour.toFixed(1)} orders/hour over ${Math.round(m.throughput.last_completion_min - m.throughput.first_order_min)} min`
    );
    lines.push("");

    // Bottlenecks
    lines.push("TOP BOTTLENECKS (entity, type, max_concurrent / max_occupancy, queue_score):");
    if (m.bottlenecks.length === 0) {
        lines.push("  (none surfaced — all serving entities ran below their capacity)");
    } else {
        for (const b of m.bottlenecks) {
            const saturated = b.queue_score > 1.0 ? " [SATURATED]" : "";
            lines.push(
                `  ${b.entity} (${b.type}, ${b.max_concurrent}/${b.max_occupancy}, score ${b.queue_score.toFixed(2)})${saturated}`
            );
        }
    }
    lines.push("");

    // Layout summary
    const e = overview.yard_structure?.Entities;
    if (e) {
        lines.push("YARD LAYOUT (existing entities you may reference):");
        const t = e.Terminals.map((x) => `${x.Name}[${x.Typ}]`).join(", ");
        if (t) lines.push(`  Terminals: ${t}`);
        if (e.ParkingAreas.length) {
            lines.push(
                `  ParkingAreas: ${e.ParkingAreas.map((x) => `${x.Name}(cap ${x.Capacity})`).join(", ")}`
            );
        }
        if (e.Scales.length) {
            lines.push(`  Scales: ${e.Scales.map((x) => x.Name).join(", ")}`);
        }
        if (e.Storages.length) {
            const stRows = e.Storages.map(
                (x) =>
                    `${x.Name}(material=${x.MaterialId}, stock=${x.Stock}/${x.Capacity})`
            );
            // Storage list can be long; only include if asked-target referenced storages,
            // but for now include all — token budget on yard simulator is small.
            lines.push(`  Storages: ${stRows.join(", ")}`);
        }
    } else {
        lines.push(
            "YARD LAYOUT: not available — base recommendations on bottlenecks alone, do not invent entity names."
        );
    }

    // Comparison context across runs
    lines.push("");
    lines.push("OTHER RUNS FOR COMPARISON (these show the same yard under different load):");
    for (const r of overview.runs) {
        const rm = r.summary_metrics;
        const top = rm.bottlenecks[0];
        lines.push(
            `  ${r.label}: ${rm.orders.overall} orders, max wait ${formatSeconds(rm.waiting_seconds.max)}, top bottleneck ${top ? `${top.entity}(${top.max_concurrent}/${top.max_occupancy})` : "—"}`
        );
    }

    lines.push("");
    lines.push(
        'Reply now with the JSON object: { "proposals": [ ... ] }. No commentary.'
    );
    return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const VALID_KINDS: Array<ProposalChange["kind"]> = [
    "capacity",
    "stagger_orders",
    "reroute",
    "add_entity"
];

/**
 * Tolerantly extracts proposal objects from the LLM response. Accepts:
 *   - { "proposals": [ ... ] }            (preferred shape, JSON mode)
 *   - { "items"|"results"|"data": [...] } (common variants)
 *   - [ ... ]                             (top-level array, older prompt)
 *   - a single proposal object            (degenerate but well-shaped)
 * If JSON.parse on the whole string fails, falls back to walking braces and
 * parsing each top-level object individually so a single malformed proposal
 * doesn't kill the rest.
 */
export function parseProposalResponse(
    raw: string
): YardProposalCreateInput[] {
    if (!raw) throw new ProposalParseError("Empty response from model");

    // Strip <think>...</think> blocks (some reasoning models emit them)
    let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    // Strip ```json or ``` fences if present
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence) cleaned = fence[1].trim();

    const entries = extractEntries(cleaned, raw);
    const result = shapeEntries(entries);
    if (result.length === 0) {
        throw new ProposalParseError(
            `Model returned ${entries.length} candidate object(s) but none were well-formed (need title, summary, and changes). First 300 chars of response: ${truncate(raw, 300)}`
        );
    }
    return result;
}

/**
 * Find an array of candidate proposal entries. Tries whole-document parse
 * first; falls back to brace-walking the document for top-level {...}.
 */
function extractEntries(cleaned: string, raw: string): unknown[] {
    // 1) Whole-document parse
    try {
        const parsed = JSON.parse(cleaned);
        const fromParsed = entriesFromParsed(parsed);
        if (fromParsed) return fromParsed;
    } catch {
        /* fall through */
    }

    // 2) Slice between first array bracket and last — covers prompt variants
    //    where the model returns a bare array.
    const arrStart = cleaned.indexOf("[");
    const arrEnd = cleaned.lastIndexOf("]");
    if (arrStart !== -1 && arrEnd > arrStart) {
        try {
            const parsed = JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
            const fromParsed = entriesFromParsed(parsed);
            if (fromParsed) return fromParsed;
        } catch {
            /* fall through */
        }
    }

    // 3) Brace-walk: find every top-level {...} substring and try to parse
    //    each individually. Skips malformed objects quietly. Useful when a
    //    single proposal's string contains an unescaped quote.
    const objects = extractTopLevelObjects(cleaned);
    if (objects.length > 0) {
        const parsed: unknown[] = [];
        for (const obj of objects) {
            try {
                parsed.push(JSON.parse(obj));
            } catch {
                /* skip malformed */
            }
        }
        if (parsed.length > 0) return parsed;
    }

    throw new ProposalParseError(
        `Model output was not valid JSON. First 300 chars: ${truncate(raw, 300)}`
    );
}

/**
 * Coerce a JSON-parsed value into an array of candidate entries.
 * Returns null if the shape isn't recognised.
 */
function entriesFromParsed(parsed: unknown): unknown[] | null {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        for (const key of ["proposals", "items", "results", "data"]) {
            if (Array.isArray(obj[key])) return obj[key] as unknown[];
        }
        // Single proposal object
        if ("title" in obj && "summary" in obj && "changes" in obj) {
            return [obj];
        }
    }
    return null;
}

/**
 * Walks `text` and returns substrings that look like top-level JSON
 * objects (skipping ones nested inside other objects/arrays). Quote-aware
 * so braces inside strings don't confuse depth tracking.
 */
function extractTopLevelObjects(text: string): string[] {
    const out: string[] = [];
    let depthObj = 0;
    let depthArr = 0;
    let inStr = false;
    let esc = false;
    let startIdx = -1;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inStr) {
            if (esc) {
                esc = false;
            } else if (ch === "\\") {
                esc = true;
            } else if (ch === '"') {
                inStr = false;
            }
            continue;
        }
        if (ch === '"') {
            inStr = true;
            continue;
        }
        if (ch === "[") {
            depthArr++;
            continue;
        }
        if (ch === "]") {
            depthArr--;
            continue;
        }
        if (ch === "{") {
            // Capture only objects whose containing depth (objects only) is 0.
            // We allow them to live inside an outer array (depthArr ≥ 1).
            if (depthObj === 0) startIdx = i;
            depthObj++;
            continue;
        }
        if (ch === "}") {
            depthObj--;
            if (depthObj === 0 && startIdx !== -1) {
                out.push(text.slice(startIdx, i + 1));
                startIdx = -1;
            }
        }
    }
    return out;
}

function shapeEntries(entries: unknown[]): YardProposalCreateInput[] {
    const result: YardProposalCreateInput[] = [];
    for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue;
        const e = entry as Record<string, unknown>;
        const title = typeof e.title === "string" ? e.title.trim() : "";
        const summary =
            typeof e.summary === "string" ? e.summary.trim() : "";
        const changesRaw = Array.isArray(e.changes) ? e.changes : [];
        const changes: ProposalChange[] = (changesRaw as unknown[])
            .filter(
                (c): c is ProposalChange =>
                    !!c &&
                    typeof c === "object" &&
                    VALID_KINDS.includes(
                        (c as { kind: ProposalChange["kind"] }).kind
                    )
            );
        if (!title || !summary || changes.length === 0) continue;
        result.push({
            title,
            summary,
            target_bottleneck:
                typeof e.target_bottleneck === "string"
                    ? e.target_bottleneck
                    : null,
            changes,
            expected_impact:
                typeof e.expected_impact === "string"
                    ? e.expected_impact
                    : null,
            risks: typeof e.risks === "string" ? e.risks : null,
            source: "ai"
        });
    }
    return result;
}

function truncate(s: string, n: number): string {
    return s.length <= n ? s : s.slice(0, n) + "…";
}

export class ProposalParseError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = "ProposalParseError";
    }
}
