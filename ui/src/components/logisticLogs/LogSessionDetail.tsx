// ui/src/components/logisticLogs/LogSessionDetail.tsx

import { useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Eye, EyeOff, Info } from "lucide-react";
import type { LogSession } from "@/types/logisticLogs";
import {
    formatDuration,
    maskValue,
    reconstructSteps,
    type SessionStep
} from "@/services/logisticLogsService";
import {
    describeStep,
    PHASE_ORDER,
    phaseStyle,
    type LogPhase
} from "@/services/logisticLogsGlossary";

interface Props {
    session: LogSession | null;
}

interface EnrichedStep extends SessionStep {
    gloss: ReturnType<typeof describeStep>;
}

export function LogSessionDetail({ session }: Props) {
    const [revealPii, setRevealPii] = useState(false);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const steps = useMemo(
        () => (session ? reconstructSteps(session) : []),
        [session]
    );
    const enriched: EnrichedStep[] = useMemo(
        () =>
            steps.map((s) => ({
                ...s,
                gloss: describeStep(s.stepInfo)
            })),
        [steps]
    );
    const piiCount = useMemo(
        () => enriched.filter((s) => s.pii && s.value).length,
        [enriched]
    );
    const maxDur = useMemo(
        () =>
            enriched.reduce(
                (m, s) =>
                    s.durationSec !== null && s.durationSec > m
                        ? s.durationSec
                        : m,
                0
            ) || 1,
        [enriched]
    );

    // Phase totals — "where did the time go?"
    const phaseTotals = useMemo(() => {
        const buckets = new Map<LogPhase, number>();
        for (const s of enriched) {
            if (s.durationSec === null) continue;
            const cur = buckets.get(s.gloss.phase) ?? 0;
            buckets.set(s.gloss.phase, cur + s.durationSec);
        }
        const total =
            [...buckets.values()].reduce((a, b) => a + b, 0) || 1;
        return PHASE_ORDER.filter((p) => buckets.has(p)).map((phase) => {
            const seconds = buckets.get(phase) ?? 0;
            return {
                phase,
                seconds,
                pct: (seconds / total) * 100,
                style: phaseStyle(phase)
            };
        });
    }, [enriched]);

    function toggle(seq: number) {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(seq)) next.delete(seq);
            else next.add(seq);
            return next;
        });
    }

    if (!session) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Session detail
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">
                        Pick a session on the left to see its
                        step-by-step timeline, with each kiosk dialog
                        translated and grouped by workflow phase. Click
                        any row to see full timestamps and the raw log
                        message.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-base">
                            Process #{session.processId}
                        </CardTitle>
                        <div className="text-xs text-gray-500 mt-1">
                            {new Date(session.startedAt).toLocaleString()} ·{" "}
                            {formatDuration(session.durationSec)} ·{" "}
                            {session.eventCount} events ·{" "}
                            {session.stepCount} distinct steps
                        </div>
                    </div>
                    <PiiButton
                        revealed={revealPii}
                        piiCount={piiCount}
                        onToggle={() => setRevealPii((v) => !v)}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* PII banner — explicit feedback so the toggle's effect is visible */}
                {piiCount > 0 && (
                    <div
                        className={`text-[11px] rounded px-2 py-1 flex items-center gap-1.5 ${
                            revealPii
                                ? "bg-rose-50 text-rose-800 border border-rose-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                    >
                        <Info className="h-3 w-3 shrink-0" />
                        {revealPii ? (
                            <>
                                Showing {piiCount} field(s) containing
                                personal data (driver name, signature).
                                Be mindful of what's on your screen.
                            </>
                        ) : (
                            <>
                                {piiCount} field(s) hidden — driver name
                                and signature appear later in this
                                session. Click <em>Reveal PII</em> to
                                show them.
                            </>
                        )}
                    </div>
                )}

                {/* Where did the time go? */}
                {phaseTotals.length > 0 && (
                    <div>
                        <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                            Where did the time go?
                        </div>
                        <div className="flex h-3 w-full rounded overflow-hidden border">
                            {phaseTotals.map((p) => (
                                <div
                                    key={p.phase}
                                    style={{
                                        width: `${p.pct}%`,
                                        backgroundColor: p.style.hex
                                    }}
                                    title={`${p.style.label}: ${formatDuration(
                                        p.seconds
                                    )} (${p.pct.toFixed(1)}%)`}
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {phaseTotals.map((p) => (
                                <div
                                    key={p.phase}
                                    className="text-[11px] flex items-center gap-1"
                                >
                                    <span
                                        className="inline-block w-2.5 h-2.5 rounded"
                                        style={{
                                            backgroundColor: p.style.hex
                                        }}
                                    />
                                    <span className="font-medium">
                                        {p.style.label}
                                    </span>
                                    <span className="text-gray-500">
                                        {formatDuration(p.seconds)} ·{" "}
                                        {p.pct.toFixed(0)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1 pt-1 border-t flex items-center gap-2">
                    Step-by-step
                    <span className="font-normal normal-case text-gray-400">
                        — click any row for full detail
                    </span>
                </div>
                <div
                    className="overflow-y-auto pr-1 border rounded"
                    style={{ maxHeight: 480 }}
                >
                    <ul className="divide-y">
                        {enriched.map((s) => (
                            <StepRow
                                key={s.sequence}
                                step={s}
                                maxDur={maxDur}
                                expanded={expanded.has(s.sequence)}
                                onToggle={() => toggle(s.sequence)}
                                revealPii={revealPii}
                            />
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PiiButton({
    revealed,
    piiCount,
    onToggle
}: {
    revealed: boolean;
    piiCount: number;
    onToggle: () => void;
}) {
    const disabled = piiCount === 0;
    return (
        <Button
            size="sm"
            variant={revealed ? "default" : "outline"}
            onClick={onToggle}
            disabled={disabled}
            title={
                disabled
                    ? "No PII fields captured in this session."
                    : revealed
                      ? "Click to mask driver name and signature again."
                      : "Click to reveal driver name and signature values."
            }
            className={revealed ? "bg-rose-600 hover:bg-rose-700" : ""}
        >
            {revealed ? (
                <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide PII ({piiCount})
                </>
            ) : (
                <>
                    <Eye className="h-3 w-3 mr-1" />
                    Reveal PII ({piiCount})
                </>
            )}
        </Button>
    );
}

function StepRow({
    step,
    maxDur,
    expanded,
    onToggle,
    revealPii
}: {
    step: EnrichedStep;
    maxDur: number;
    expanded: boolean;
    onToggle: () => void;
    revealPii: boolean;
}) {
    const widthPct =
        step.durationSec === null
            ? 0
            : Math.max(1, (step.durationSec / maxDur) * 100);
    const style = phaseStyle(step.gloss.phase);

    return (
        <li className="text-xs">
            <button
                type="button"
                onClick={onToggle}
                className={`w-full py-1.5 px-2 flex items-center gap-2 text-left transition-colors ${
                    expanded ? "bg-gray-50" : "hover:bg-gray-50"
                }`}
                aria-expanded={expanded}
                aria-controls={`step-detail-${step.sequence}`}
            >
                <span className="w-4 text-gray-400 shrink-0 flex items-center justify-center">
                    {expanded ? (
                        <ChevronDown className="h-3 w-3" />
                    ) : (
                        <ChevronRight className="h-3 w-3" />
                    )}
                </span>
                <span className="w-6 text-gray-400 tabular-nums shrink-0">
                    {step.sequence}
                </span>
                <span
                    className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded shrink-0 ${style.pill}`}
                    title={step.gloss.phase}
                >
                    {style.label}
                </span>
                <span className="flex-1 min-w-0">
                    <span
                        className="block truncate font-medium"
                        title={step.stepInfo}
                    >
                        {step.gloss.en}
                    </span>
                    <span className="block truncate text-[10px] font-mono text-gray-400">
                        {step.stepInfo}
                        {step.type === "DIALOG" && (
                            <span className="ml-1 inline-block text-blue-600">
                                [dialog]
                            </span>
                        )}
                    </span>
                    {step.value && (
                        <span
                            className={`block text-[11px] font-mono ${
                                step.pii ? "text-amber-700" : "text-gray-500"
                            }`}
                        >
                            ↳ {maskValue(step.value, step.pii && !revealPii)}
                        </span>
                    )}
                </span>
                <div className="w-28 shrink-0">
                    <div className="h-2 bg-gray-100 rounded relative">
                        <div
                            className="absolute inset-y-0 left-0 rounded"
                            style={{
                                width: `${widthPct}%`,
                                backgroundColor: style.hex
                            }}
                        />
                    </div>
                </div>
                <span className="w-14 text-right tabular-nums text-gray-700 shrink-0">
                    {step.durationSec === null
                        ? "—"
                        : formatDuration(step.durationSec)}
                </span>
            </button>

            {expanded && (
                <StepDetailPanel
                    id={`step-detail-${step.sequence}`}
                    step={step}
                    revealPii={revealPii}
                />
            )}
        </li>
    );
}

function StepDetailPanel({
    id,
    step,
    revealPii
}: {
    id: string;
    step: EnrichedStep;
    revealPii: boolean;
}) {
    const style = phaseStyle(step.gloss.phase);
    return (
        <div
            id={id}
            className="px-3 pb-3 pt-1 bg-gray-50 border-t text-[11px] space-y-2"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                <DetailKv label="English">{step.gloss.en}</DetailKv>
                <DetailKv label="Phase">
                    <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${style.pill}`}
                    >
                        {style.label}
                    </span>
                </DetailKv>
                <DetailKv label="German (raw)">
                    <span className="font-mono">{step.stepInfo}</span>
                </DetailKv>
                <DetailKv label="Type">
                    {step.type === "DIALOG"
                        ? "DIALOG (driver-facing input)"
                        : "PROCESS (internal state)"}
                </DetailKv>
                <DetailKv label="Started">
                    <span className="font-mono">{step.startedAt}</span>
                </DetailKv>
                <DetailKv label="Ended">
                    <span className="font-mono">
                        {step.endedAt ?? "— (not closed in the log)"}
                    </span>
                </DetailKv>
                <DetailKv label="Duration">
                    {step.durationSec === null
                        ? "—"
                        : `${formatDuration(step.durationSec)} (${step.durationSec.toFixed(3)}s)`}
                </DetailKv>
                {step.value && (
                    <DetailKv label="Captured value">
                        <span
                            className={`font-mono ${
                                step.pii ? "text-amber-700" : "text-gray-700"
                            }`}
                        >
                            {maskValue(step.value, step.pii && !revealPii)}
                        </span>
                        {step.pii && (
                            <span className="ml-1 text-[10px] text-amber-700">
                                (PII)
                            </span>
                        )}
                    </DetailKv>
                )}
            </div>

            {/* Raw messages from the log */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 border-t pt-2">
                {step.startRow.message && (
                    <DetailKv label="Start message" className="sm:col-span-2">
                        <span className="font-mono text-gray-700 whitespace-pre-wrap break-words">
                            {step.startRow.message}
                        </span>
                    </DetailKv>
                )}
                {step.endRow?.message &&
                    step.endRow.message !== step.startRow.message && (
                        <DetailKv label="End message" className="sm:col-span-2">
                            <span className="font-mono text-gray-700 whitespace-pre-wrap break-words">
                                {step.endRow.message}
                            </span>
                        </DetailKv>
                    )}
            </div>

            {/* Raw log identifiers — debug-level */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 border-t pt-2 text-gray-500">
                <DetailKv label="process">{step.startRow.process}</DetailKv>
                <DetailKv label="proc">{step.startRow.proc}</DetailKv>
                <DetailKv label="procstep">{step.startRow.procstep}</DetailKv>
                <DetailKv label="row id (start)">
                    {step.startRow.id}
                    {step.endRow ? ` / ${step.endRow.id}` : ""}
                </DetailKv>
            </div>
        </div>
    );
}

function DetailKv({
    label,
    children,
    className = ""
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                {label}
            </div>
            <div className="text-[11px] text-gray-800">{children}</div>
        </div>
    );
}
