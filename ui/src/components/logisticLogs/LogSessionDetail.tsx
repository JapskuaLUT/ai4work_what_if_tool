// ui/src/components/logisticLogs/LogSessionDetail.tsx

import { useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import type { LogSession } from "@/types/logisticLogs";
import {
    formatDuration,
    maskValue,
    reconstructSteps
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

export function LogSessionDetail({ session }: Props) {
    const [revealPii, setRevealPii] = useState(false);
    const steps = useMemo(
        () => (session ? reconstructSteps(session) : []),
        [session]
    );
    const enriched = useMemo(
        () =>
            steps.map((s) => ({
                ...s,
                gloss: describeStep(s.stepInfo)
            })),
        [steps]
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
                        translated and grouped by workflow phase.
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
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevealPii((v) => !v)}
                        title="Driver name and signature are masked by default."
                    >
                        {revealPii ? (
                            <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Hide PII
                            </>
                        ) : (
                            <>
                                <Eye className="h-3 w-3 mr-1" />
                                Reveal PII
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
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

                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1 pt-1 border-t">
                    Step-by-step
                </div>
                <div
                    className="overflow-y-auto pr-1 border rounded"
                    style={{ maxHeight: 420 }}
                >
                    <ul className="divide-y">
                        {enriched.map((s) => {
                            const widthPct =
                                s.durationSec === null
                                    ? 0
                                    : Math.max(
                                          1,
                                          (s.durationSec / maxDur) * 100
                                      );
                            const style = phaseStyle(s.gloss.phase);
                            return (
                                <li
                                    key={s.sequence}
                                    className="py-1.5 px-2 text-xs flex items-center gap-2"
                                >
                                    <span className="w-6 text-gray-400 tabular-nums shrink-0">
                                        {s.sequence}
                                    </span>
                                    <span
                                        className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded shrink-0 ${style.pill}`}
                                        title={s.gloss.phase}
                                    >
                                        {style.label}
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span
                                            className="block truncate font-medium"
                                            title={s.stepInfo}
                                        >
                                            {s.gloss.en}
                                        </span>
                                        <span className="block truncate text-[10px] font-mono text-gray-400">
                                            {s.stepInfo}
                                            {s.type === "DIALOG" && (
                                                <span className="ml-1 inline-block text-blue-600">
                                                    [dialog]
                                                </span>
                                            )}
                                        </span>
                                        {s.value && (
                                            <span
                                                className={`block text-[11px] font-mono ${
                                                    s.pii
                                                        ? "text-amber-700"
                                                        : "text-gray-500"
                                                }`}
                                            >
                                                ↳{" "}
                                                {maskValue(
                                                    s.value,
                                                    s.pii && !revealPii
                                                )}
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
                                        {s.durationSec === null
                                            ? "—"
                                            : formatDuration(s.durationSec)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
