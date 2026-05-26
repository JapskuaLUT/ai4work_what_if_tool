// ui/src/pages/LogisticLogsPage.tsx
//
// Inspector for kiosk check-in logs. Now backed by /api/logs/* —
// overview + aggregates land in one fetch, sessions list in a second,
// and the focused session's rows are lazy-fetched on selection.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
    LogCaseOverviewResponse,
    LogSessionDetail,
    LogSessionMetadata
} from "@/types/logisticLogs";
import {
    fetchLogCase,
    fetchLogSession,
    fetchLogSessions,
    formatDuration
} from "@/services/logisticLogsService";
import { LogSessionTable } from "@/components/logisticLogs/LogSessionTable";
import { LogSessionDetail as LogSessionDetailView } from "@/components/logisticLogs/LogSessionDetail";
import { StepDurationChart } from "@/components/logisticLogs/StepDurationChart";
import { LogNarrativeCard } from "@/components/logisticLogs/LogNarrativeCard";
import { FloatingLogsChat } from "@/components/logisticLogs/FloatingLogsChat";

export default function LogisticLogsPage() {
    const navigate = useNavigate();
    const { caseId } = useParams<{ caseId: string }>();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [overview, setOverview] = useState<LogCaseOverviewResponse | null>(
        null
    );
    const [sessions, setSessions] = useState<LogSessionMetadata[]>([]);
    const [selectedProc, setSelectedProc] = useState<number | null>(null);
    const [selectedSession, setSelectedSession] =
        useState<LogSessionDetail | null>(null);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [loadingSession, setLoadingSession] = useState(false);

    // Initial load: overview + sessions in parallel
    useEffect(() => {
        if (!caseId) {
            setError("Case ID is missing.");
            setLoading(false);
            return;
        }
        let cancelled = false;
        async function load() {
            try {
                const [ov, sess] = await Promise.all([
                    fetchLogCase(caseId!),
                    fetchLogSessions(caseId!)
                ]);
                if (cancelled) return;
                setOverview(ov);
                setSessions(sess);
                if (sess.length > 0) setSelectedProc(sess[0].processId);
                setError(null);
            } catch (e) {
                if (!cancelled) {
                    setError(
                        e instanceof Error
                            ? e.message
                            : "Failed to load log case"
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
    }, [caseId]);

    // Lazy-load the selected session's rows
    useEffect(() => {
        if (!caseId || selectedProc === null) {
            setSelectedSession(null);
            return;
        }
        let cancelled = false;
        async function load() {
            setLoadingSession(true);
            setSessionError(null);
            try {
                const s = await fetchLogSession(caseId!, selectedProc!);
                if (cancelled) return;
                setSelectedSession(s);
            } catch (e) {
                if (!cancelled) {
                    setSessionError(
                        e instanceof Error ? e.message : "Failed to load session"
                    );
                }
            } finally {
                if (!cancelled) setLoadingSession(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [caseId, selectedProc]);

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
                        Process-mining view over{" "}
                        {overview.overview.rowCount.toLocaleString()} raw
                        events from the {overview.topic} kiosk,
                        reconstructed into {overview.overview.sessionCount}{" "}
                        driver sessions. Span:{" "}
                        {new Date(
                            overview.overview.earliestDate
                        ).toLocaleDateString()}{" "}
                        →{" "}
                        {new Date(
                            overview.overview.latestDate
                        ).toLocaleDateString()}
                        .
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            {/* Narrative interpretation */}
            <LogNarrativeCard
                overview={overview.overview}
                sessions={sessions}
                aggregates={overview.aggregates}
            />

            {/* Overview KPIs */}
            <Card>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-6">
                    <Stat
                        label="Sessions"
                        value={overview.overview.sessionCount.toString()}
                    />
                    <Stat
                        label="Events"
                        value={overview.overview.rowCount.toLocaleString()}
                    />
                    <Stat
                        label="Median duration"
                        value={formatDuration(
                            overview.overview.durationStats.medianSec
                        )}
                        sub={`p95 ${formatDuration(
                            overview.overview.durationStats.p95Sec
                        )}`}
                    />
                    <Stat
                        label="Median events / session"
                        value={overview.overview.eventStats.median.toString()}
                        sub={`p95 ${overview.overview.eventStats.p95}`}
                    />
                    <Stat
                        label="Distinct dialogs"
                        value={overview.aggregates
                            .filter((a) => a.type === "DIALOG")
                            .length.toString()}
                    />
                </CardContent>
            </Card>

            {/* Step duration chart */}
            <StepDurationChart
                aggregates={overview.aggregates}
                dialogsOnly
                topN={12}
            />

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
                    {loadingSession && !selectedSession ? (
                        <Skeleton className="h-96 w-full rounded-lg" />
                    ) : sessionError ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{sessionError}</AlertDescription>
                        </Alert>
                    ) : (
                        <LogSessionDetailView session={selectedSession} />
                    )}
                </div>
            </div>

            {/* About */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">About this view</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-gray-600 space-y-1">
                    <p>
                        Data is served by the backend at{" "}
                        <code>/api/logs/{overview.case_id}</code>.{" "}
                        Aggregates and session metadata are pre-computed
                        at ingest time; per-session row detail is fetched
                        on demand when you select a session.
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
                overview={overview.overview}
                sessions={sessions}
                aggregates={overview.aggregates}
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
