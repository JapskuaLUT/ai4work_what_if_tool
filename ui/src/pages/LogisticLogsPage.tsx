// ui/src/pages/LogisticLogsPage.tsx
//
// A client-side prototype for inspecting raw check-in terminal logs from
// the LT 010 kiosk. Loads the bundled JSON once, reduces it into sessions
// + step aggregates, and renders three views:
//   1. Overview stats card
//   2. Top-N step-duration chart (where do drivers actually spend time?)
//   3. Session table + per-session step-by-step detail drill-in
//
// No backend involvement yet — easy to evolve into a proper domain when
// we know what's worth keeping.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronLeft, KeyRound } from "lucide-react";

import type {
    LogOverview,
    LogRow,
    LogSession,
    StepAggregate
} from "@/types/logisticLogs";
import {
    computeOverview,
    computeStepAggregates,
    formatDuration,
    loadLogs
} from "@/services/logisticLogsService";
import { LogSessionTable } from "@/components/logisticLogs/LogSessionTable";
import { LogSessionDetail } from "@/components/logisticLogs/LogSessionDetail";
import { StepDurationChart } from "@/components/logisticLogs/StepDurationChart";
import { LogNarrativeCard } from "@/components/logisticLogs/LogNarrativeCard";
import { FloatingLogsChat } from "@/components/logisticLogs/FloatingLogsChat";

export default function LogisticLogsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<LogRow[]>([]);
    const [sessions, setSessions] = useState<LogSession[]>([]);
    const [selectedProc, setSelectedProc] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const { rows, sessions } = await loadLogs();
                if (cancelled) return;
                setRows(rows);
                setSessions(sessions);
                if (sessions.length > 0) {
                    setSelectedProc(sessions[0].processId);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(
                        e instanceof Error ? e.message : "Failed to load logs"
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const overview: LogOverview | null = useMemo(
        () => (rows.length ? computeOverview(rows, sessions) : null),
        [rows, sessions]
    );

    const aggregates: StepAggregate[] = useMemo(
        () => (rows.length ? computeStepAggregates(rows) : []),
        [rows]
    );

    const selectedSession =
        sessions.find((s) => s.processId === selectedProc) ?? null;

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <Skeleton className="h-8 w-72" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-96 w-full rounded-lg" />
            </div>
        );
    }

    if (error || !overview) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {error ?? "Failed to load logs."}
                    </AlertDescription>
                </Alert>
                <Button className="mt-4" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Home
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <KeyRound className="h-7 w-7" />
                        Check-in terminal logs — {overview.location}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Process-mining view over {overview.rowCount.toLocaleString()} raw events from
                        the {overview.topic} kiosk, reconstructed into{" "}
                        {overview.sessionCount} driver sessions. Span:{" "}
                        {new Date(overview.earliestDate).toLocaleDateString()} →{" "}
                        {new Date(overview.latestDate).toLocaleDateString()}.
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            {/* Narrative interpretation — plain English, no charts needed */}
            <LogNarrativeCard
                overview={overview}
                sessions={sessions}
                aggregates={aggregates}
            />

            {/* Overview KPIs */}
            <Card>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-6">
                    <Stat
                        label="Sessions"
                        value={overview.sessionCount.toString()}
                    />
                    <Stat
                        label="Events"
                        value={overview.rowCount.toLocaleString()}
                    />
                    <Stat
                        label="Median duration"
                        value={formatDuration(overview.durationStats.medianSec)}
                        sub={`p95 ${formatDuration(overview.durationStats.p95Sec)}`}
                    />
                    <Stat
                        label="Median events / session"
                        value={overview.eventStats.median.toString()}
                        sub={`p95 ${overview.eventStats.p95}`}
                    />
                    <Stat
                        label="Distinct dialogs"
                        value={aggregates
                            .filter((a) => a.type === "DIALOG")
                            .length.toString()}
                    />
                </CardContent>
            </Card>

            {/* Step duration chart — at-a-glance "where does the kiosk eat time?" */}
            <StepDurationChart aggregates={aggregates} dialogsOnly topN={12} />

            {/* Session list + detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <LogSessionTable
                        sessions={sessions}
                        selected={selectedProc}
                        onSelect={setSelectedProc}
                    />
                </div>
                <div className="lg:col-span-2">
                    <LogSessionDetail session={selectedSession} />
                </div>
            </div>

            {/* Note */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                        About this view
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-gray-600 space-y-1">
                    <p>
                        Prototype: data is the raw{" "}
                        <code>logdata_aggregated.data.json</code> from{" "}
                        <code>specifications/logistic_logs/</code>, bundled
                        as a static asset and reduced client-side. No
                        backend involvement yet.
                    </p>
                    <p>
                        Each step shows the English description as the
                        primary label with the original German operator
                        name underneath, and a colour-coded pill for the
                        workflow phase it belongs to. Driver names and
                        signatures are masked by default — toggle with{" "}
                        <em>Reveal PII</em> when debugging.
                    </p>
                </CardContent>
            </Card>

            {/* Floating AI chat */}
            <FloatingLogsChat
                overview={overview}
                sessions={sessions}
                aggregates={aggregates}
                selectedSession={selectedSession}
            />
        </div>
    );
}

function Stat({
    label,
    value,
    sub
}: {
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
                {label}
            </div>
            <div className="text-2xl font-semibold">{value}</div>
            {sub && <div className="text-xs text-gray-500">{sub}</div>}
        </div>
    );
}
