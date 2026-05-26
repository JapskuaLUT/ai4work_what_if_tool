// ui/src/components/logisticLogs/LogNarrativeCard.tsx
//
// Frames the raw KPIs in plain English so a non-domain user can make
// sense of what they're looking at without firing up the AI chat.

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import type {
    LogOverview,
    LogSessionMetadata,
    StepAggregate
} from "@/types/logisticLogs";
import { formatDuration } from "@/services/logisticLogsService";
import {
    describeStep,
    phaseStyle,
    type LogPhase
} from "@/services/logisticLogsGlossary";

interface Props {
    overview: LogOverview;
    sessions: LogSessionMetadata[];
    aggregates: StepAggregate[];
}

export function LogNarrativeCard({ overview, sessions, aggregates }: Props) {
    const insights = useMemo(
        () => buildInsights(overview, sessions, aggregates),
        [overview, sessions, aggregates]
    );

    return (
        <Card className="border-violet-200 bg-violet-50/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-violet-900">
                    <Lightbulb className="h-4 w-4" />
                    Plain-English summary
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1.5 text-sm text-gray-800">
                    {insights.map((i, idx) => (
                        <li key={idx} className="flex gap-2">
                            <span className="text-violet-600 mt-1">•</span>
                            <span>{i}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

function buildInsights(
    ov: LogOverview,
    sessions: LogSessionMetadata[],
    aggregates: StepAggregate[]
): React.ReactNode[] {
    const out: React.ReactNode[] = [];

    // 1. Scope
    out.push(
        <>
            The kiosk recorded <b>{ov.sessionCount}</b> driver visits at{" "}
            <code className="font-mono">{ov.location}</code> between{" "}
            {new Date(ov.earliestDate).toLocaleDateString()} and{" "}
            {new Date(ov.latestDate).toLocaleDateString()}. A typical
            visit took{" "}
            <b>{formatDuration(ov.durationStats.medianSec)}</b> (median);
            the slowest 5% stretched past{" "}
            <b>{formatDuration(ov.durationStats.p95Sec)}</b>.
        </>
    );

    // 2. Top time-sinks
    const topDialogs = aggregates
        .filter((a) => a.type === "DIALOG")
        .slice(0, 3);
    if (topDialogs.length > 0) {
        out.push(
            <>
                The slowest driver-facing dialogs are{" "}
                {topDialogs.map((d, i) => {
                    const g = describeStep(d.stepInfo);
                    return (
                        <span key={d.stepInfo}>
                            {i > 0 ? ", " : ""}
                            <b>{g.en}</b> (~{formatDuration(d.p50Sec)} typical
                            {d.p95Sec > d.p50Sec * 2
                                ? `, ${formatDuration(d.p95Sec)} tail`
                                : ""}
                            )
                        </span>
                    );
                })}
                . Long tails usually mean a driver walked away or got stuck.
            </>
        );
    }

    // 3. Phase composition across all sessions
    const phaseTotals = aggregatePhaseTotals(aggregates);
    if (phaseTotals.length > 0) {
        const top = phaseTotals[0];
        const totalSec = phaseTotals.reduce((s, p) => s + p.seconds, 0);
        out.push(
            <>
                Across the whole flow, drivers spend most of their time
                in the <b>{phaseStyle(top.phase).label.toLowerCase()}</b>{" "}
                phase (~{((top.seconds / totalSec) * 100).toFixed(0)}% of
                the total). The {phaseTotals.length}-phase breakdown is
                visible per-session below.
            </>
        );
    }

    // 4. Outlier sessions
    const sorted = [...sessions].sort(
        (a, b) => b.durationSec - a.durationSec
    );
    const outliers = sorted.slice(0, 3).filter((s) => {
        // outlier = >5x median
        return s.durationSec > 5 * ov.durationStats.medianSec;
    });
    if (outliers.length > 0) {
        out.push(
            <>
                <b>{outliers.length}</b>{" "}
                {outliers.length === 1 ? "session is" : "sessions are"} much
                longer than the rest (
                {outliers
                    .map(
                        (s) =>
                            `#${s.processId} at ${formatDuration(s.durationSec)}`
                    )
                    .join(", ")}
                ). Worth checking — these often hide a stalled signature
                or someone returning to the kiosk later.
            </>
        );
    }

    // 5. Completion check — server marks `completed=true` when the session
    //    reached the ANZEIGE SCHLUSSBILD step.
    const incomplete = sessions.filter((s) => !s.completed).length;
    if (incomplete > 0) {
        out.push(
            <>
                <b>{incomplete}</b> of {sessions.length} sessions don't
                appear to reach the closing screen — they may have been
                abandoned mid-flow.
            </>
        );
    } else if (sessions.length > 0) {
        out.push(<>All {sessions.length} sessions reached the closing screen.</>);
    }

    return out;
}

function aggregatePhaseTotals(aggregates: StepAggregate[]) {
    const buckets = new Map<LogPhase, number>();
    for (const a of aggregates) {
        const g = describeStep(a.stepInfo);
        buckets.set(g.phase, (buckets.get(g.phase) ?? 0) + a.totalSec);
    }
    return [...buckets.entries()]
        .map(([phase, seconds]) => ({ phase, seconds }))
        .sort((a, b) => b.seconds - a.seconds);
}

