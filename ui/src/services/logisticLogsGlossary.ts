// ui/src/services/logisticLogsGlossary.ts
//
// Translates and categorises the German step names that the LT 010
// check-in kiosk emits. Pure data — no React, no I/O. Used by the page,
// the session-detail timeline, the duration chart, and the LLM prompt.

export type LogPhase =
    | "setup"
    | "identification"
    | "routing"
    | "vehicle_driver"
    | "safety_loads"
    | "cleaning"
    | "documents"
    | "internal"
    | "completion"
    | "unknown";

export interface PhaseStyle {
    label: string;
    /** Short colour token used as the chart series colour. */
    hex: string;
    /** Tailwind classes for pills/tags rendered in the UI. */
    pill: string;
}

/**
 * Visual palette per phase. Ordered as the kiosk flow proceeds, so the
 * narrative card and the legend read naturally.
 */
export const PHASE_STYLES: Record<LogPhase, PhaseStyle> = {
    setup: {
        label: "Setup",
        hex: "#9ca3af",
        pill: "bg-gray-100 text-gray-700 border border-gray-300"
    },
    identification: {
        label: "Identification",
        hex: "#3b82f6",
        pill: "bg-blue-50 text-blue-800 border border-blue-300"
    },
    routing: {
        label: "Routing",
        hex: "#a855f7",
        pill: "bg-purple-50 text-purple-800 border border-purple-300"
    },
    vehicle_driver: {
        label: "Vehicle & driver",
        hex: "#10b981",
        pill: "bg-emerald-50 text-emerald-800 border border-emerald-300"
    },
    safety_loads: {
        label: "Safety & loads",
        hex: "#f59e0b",
        pill: "bg-amber-50 text-amber-800 border border-amber-300"
    },
    cleaning: {
        label: "Cleaning",
        hex: "#06b6d4",
        pill: "bg-cyan-50 text-cyan-800 border border-cyan-300"
    },
    documents: {
        label: "Documents",
        hex: "#e11d48",
        pill: "bg-rose-50 text-rose-800 border border-rose-300"
    },
    internal: {
        label: "Internal",
        hex: "#64748b",
        pill: "bg-slate-50 text-slate-700 border border-slate-300"
    },
    completion: {
        label: "Completion",
        hex: "#16a34a",
        pill: "bg-green-50 text-green-800 border border-green-300"
    },
    unknown: {
        label: "Other",
        hex: "#6b7280",
        pill: "bg-gray-100 text-gray-700 border border-gray-300"
    }
};

export const PHASE_ORDER: LogPhase[] = [
    "setup",
    "identification",
    "routing",
    "vehicle_driver",
    "safety_loads",
    "cleaning",
    "documents",
    "internal",
    "completion",
    "unknown"
];

interface GlossaryEntry {
    en: string;
    phase: LogPhase;
}

/**
 * Exact-match dictionary. Kept lower-cased for case-insensitive lookups
 * because the kiosk has small typos (`EFASST` vs `ERFASST`, mixed
 * capitalisation on `2` suffixes, etc.).
 */
const EXACT: Record<string, GlossaryEntry> = {
    // Setup
    "initialisierung": { en: "Initialisation", phase: "setup" },
    "sprachauswahl": { en: "Language selection", phase: "setup" },
    "aktion sprache ausgewaehlt": {
        en: "Language selected",
        phase: "setup"
    },

    // Identification
    "ident warten auf identcode": {
        en: "Waiting for ident code",
        phase: "identification"
    },
    "eingabe identcode anmeldung": {
        en: "Enter ident code",
        phase: "identification"
    },
    "aktion identcode anmeldung manuell erfasst": {
        en: "Ident code entered manually",
        phase: "identification"
    },
    "aktion identcode anmeldung auswerten": {
        en: "Evaluating ident code",
        phase: "identification"
    },
    "aktion vorgang laden": {
        en: "Loading record",
        phase: "identification"
    },
    "aktion verzweigen nach identcode": {
        en: "Branch on ident code",
        phase: "identification"
    },

    // Routing decisions
    "entscheidung warenrichtung": {
        en: "Decide goods direction",
        phase: "routing"
    },
    "entscheidung food-feed": {
        en: "Decide food/feed category",
        phase: "routing"
    },
    "aktion verzweige zu beladeprozess je vorgangsart": {
        en: "Branch to loading process",
        phase: "routing"
    },
    "aktion verzweige zu teilprozess je vorgangsart": {
        en: "Branch to sub-process",
        phase: "routing"
    },
    "aktion verzweigen nach anmeldung": {
        en: "Branch after login",
        phase: "routing"
    },

    // Confirmation / data persistence (internal)
    "quittierung vorgangsdaten": {
        en: "Confirm order data",
        phase: "internal"
    },
    "aktion vorgangsdaten wurden quittiert": {
        en: "Order data confirmed",
        phase: "internal"
    },
    "aktion vorgang speichern": { en: "Save record", phase: "internal" },
    "aktion vorgang gespeichert": { en: "Record saved", phase: "internal" },
    "aktion vorgang status setzen": {
        en: "Set record status",
        phase: "internal"
    },
    "aktion vorgang speichern2": {
        en: "Save record (2nd pass)",
        phase: "internal"
    },
    "aktion vorgang status setzen2": {
        en: "Set status (2nd pass)",
        phase: "internal"
    },
    "aktion weiter mit nächstem teilprozess": {
        en: "Continue to next sub-process",
        phase: "internal"
    },

    // Vehicle & driver
    "eingabe kennzeichen": {
        en: "Enter truck plate",
        phase: "vehicle_driver"
    },
    "aktion kennzeichen erfasst": {
        en: "Truck plate recorded",
        phase: "vehicle_driver"
    },
    "eingabe kennzeichen anhänger": {
        en: "Enter trailer plate",
        phase: "vehicle_driver"
    },
    "aktion kennzeichen anhaenger erfasst": {
        en: "Trailer plate recorded",
        phase: "vehicle_driver"
    },
    "eingabe fahrername": {
        en: "Enter driver name",
        phase: "vehicle_driver"
    },
    "aktion fahrername erfasst": {
        en: "Driver name recorded",
        phase: "vehicle_driver"
    },

    // Safety & site rules
    "quittierung psa": {
        en: "Acknowledge PPE rules",
        phase: "safety_loads"
    },
    "quittierung werksvorschriften": {
        en: "Acknowledge site rules",
        phase: "safety_loads"
    },
    "ai4work call safety-instructions": {
        en: "AI4Work safety briefing",
        phase: "safety_loads"
    },

    // Prior loads (history of last 3 cargos)
    "eingabe erste vorbeladung": {
        en: "Enter previous load #1",
        phase: "safety_loads"
    },
    "aktion erste vorbeladung erfasst": {
        en: "Previous load #1 recorded",
        phase: "safety_loads"
    },
    "eingabe zweite vorbeladung": {
        en: "Enter previous load #2",
        phase: "safety_loads"
    },
    "aktion zweite vorbeladung erfasst": {
        en: "Previous load #2 recorded",
        phase: "safety_loads"
    },
    "eingabe dritte vorbeladung": {
        en: "Enter previous load #3",
        phase: "safety_loads"
    },
    "aktion dritte vorbeladung erfasst": {
        en: "Previous load #3 recorded",
        phase: "safety_loads"
    },

    // Cleaning history
    "entscheidung art letzte reinigung": {
        en: "Type of last cleaning?",
        phase: "cleaning"
    },
    "aktion art letzte reinigung erfasst": {
        en: "Cleaning type recorded",
        phase: "cleaning"
    },
    "eingabe datum letzte reinigung": {
        en: "Enter last cleaning date",
        phase: "cleaning"
    },
    "aktion datum letzte reinigung efasst": {
        en: "Cleaning date recorded",
        phase: "cleaning"
    },
    "entscheidung reinigungszertifikat vorhanden": {
        en: "Cleaning certificate available?",
        phase: "cleaning"
    },
    "aktion entscheidung reinigungszertifikat vorhanden erfasst": {
        en: "Certificate decision recorded",
        phase: "cleaning"
    },

    // Documents
    "dokumente scannen": { en: "Scan documents", phase: "documents" },
    "dokumente scannen work": {
        en: "Scan documents (work)",
        phase: "documents"
    },
    "eingabe unterschrift": {
        en: "Sign on screen",
        phase: "documents"
    },
    "aktion unterschrift erfasst": {
        en: "Signature recorded",
        phase: "documents"
    },

    // Completion
    "entscheidung bedienungsanleitung": {
        en: "Operating manual needed?",
        phase: "completion"
    },
    "aktion bedienungsanleitung erfasst": {
        en: "Manual decision recorded",
        phase: "completion"
    },
    "aktion pager spenden": { en: "Hand out pager", phase: "completion" },
    "aktion identcode nach spende erfasst": {
        en: "Ident code after pager recorded",
        phase: "completion"
    },
    "aktion schlussmeldungsoptionen setzen": {
        en: "Set closing message",
        phase: "completion"
    },
    "anzeige schlussbild": {
        en: "Show closing screen",
        phase: "completion"
    },

    // Sentinel
    "-": { en: "(idle)", phase: "unknown" }
};

/**
 * Heuristic fallback for steps we haven't curated explicitly. Lets new
 * dialog labels still surface a reasonable English gloss + phase.
 */
function heuristic(step: string): GlossaryEntry {
    const u = step.toUpperCase();
    if (u.startsWith("EINGABE ")) {
        return { en: `Enter: ${friendly(u.slice("EINGABE ".length))}`, phase: bestPhaseFor(u) };
    }
    if (u.startsWith("AKTION ")) {
        return { en: `Action: ${friendly(u.slice("AKTION ".length))}`, phase: bestPhaseFor(u) };
    }
    if (u.startsWith("ENTSCHEIDUNG ")) {
        return {
            en: `Decision: ${friendly(u.slice("ENTSCHEIDUNG ".length))}`,
            phase: "routing"
        };
    }
    if (u.startsWith("QUITTIERUNG ")) {
        return {
            en: `Acknowledge: ${friendly(u.slice("QUITTIERUNG ".length))}`,
            phase: "safety_loads"
        };
    }
    return { en: friendly(step), phase: "unknown" };
}

function friendly(s: string): string {
    return s
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^./, (c) => c.toUpperCase());
}

function bestPhaseFor(u: string): LogPhase {
    if (u.includes("KENNZEICHEN") || u.includes("FAHRER")) return "vehicle_driver";
    if (u.includes("VORBELADUNG") || u.includes("PSA") || u.includes("WERKS"))
        return "safety_loads";
    if (u.includes("REINIGUNG") || u.includes("ZERTIFIKAT")) return "cleaning";
    if (u.includes("UNTERSCHRIFT") || u.includes("DOKUMENTE"))
        return "documents";
    if (u.includes("IDENTCODE") || u.includes("IDENT")) return "identification";
    if (
        u.includes("VERZWEIG") ||
        u.includes("FOOD-FEED") ||
        u.includes("WARENRICHTUNG")
    )
        return "routing";
    if (
        u.includes("SPEICHER") ||
        u.includes("STATUS") ||
        u.includes("TEILPROZESS")
    )
        return "internal";
    if (u.includes("SCHLUSSBILD") || u.includes("PAGER") || u.includes("BEDIEN"))
        return "completion";
    if (u.includes("SPRACHE") || u.includes("INITIAL")) return "setup";
    return "unknown";
}

export function describeStep(step: string): GlossaryEntry {
    const key = step.toLowerCase().trim();
    return EXACT[key] ?? heuristic(step);
}

export function phaseStyle(phase: LogPhase): PhaseStyle {
    return PHASE_STYLES[phase] ?? PHASE_STYLES.unknown;
}
