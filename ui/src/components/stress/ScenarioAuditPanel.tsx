// ui/src/components/stress/ScenarioAuditPanel.tsx
//
// §11 — everything the response is required to carry, rendered so an
// instructor can actually check it: what each adjustment did, where cancelled
// teaching hours went, which deadlines moved, and which model produced the
// numbers.
//
// A rejected adjustment is shown as prominently as an applied one. A what-if
// tool that quietly drops half a request is worse than one that refuses it.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";
import type {
    ObjectiveMetrics,
    ScenarioResult,
    TrajectorySummary,
} from "@/types/educationalStress";
import {
    adjustmentTypeLabel,
    outcomeBadgeClass,
} from "@/services/educationalStressService";

type Props = { result: ScenarioResult };

function SummaryColumn({
    title,
    summary,
    muted,
}: {
    title: string;
    summary: TrajectorySummary;
    muted?: boolean;
}) {
    return (
        <div className={muted ? "opacity-70" : ""}>
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                {title}
            </p>
            <p className="text-3xl font-bold">{summary.peak_stress.toFixed(2)}</p>
            <p className="text-sm text-gray-500">
                peak, week {summary.peak_week_number}
            </p>
            <dl className="mt-3 text-sm space-y-1">
                <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Average</dt>
                    <dd>{summary.average_stress.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Warning weeks</dt>
                    <dd>
                        {summary.warning_week_numbers.length === 0
                            ? "none"
                            : summary.warning_week_numbers.join(", ")}
                    </dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Critical weeks</dt>
                    <dd>
                        {summary.critical_week_numbers.length === 0
                            ? "none"
                            : summary.critical_week_numbers.join(", ")}
                    </dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Bands</dt>
                    <dd>
                        {summary.band_counts.Low}L / {summary.band_counts.Moderate}M /{" "}
                        {summary.band_counts.High}H
                    </dd>
                </div>
            </dl>
        </div>
    );
}

function ObjectiveRow({ objective }: { objective: ObjectiveMetrics }) {
    const delta = objective.peak_stress_delta;
    const good = delta < -1e-6;
    const neutral = Math.abs(delta) <= 1e-6;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
                <p className="text-xs text-gray-500">Peak change</p>
                <p
                    className={`text-xl font-bold ${
                        neutral ? "" : good ? "text-green-600" : "text-red-600"
                    }`}
                >
                    {neutral ? "no change" : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`}
                </p>
            </div>
            <div>
                <p className="text-xs text-gray-500">Weeks changed</p>
                <p className="text-xl font-bold">{objective.changed_week_count}</p>
            </div>
            <div>
                <p className="text-xs text-gray-500">Events changed</p>
                <p className="text-xl font-bold">{objective.changed_event_count}</p>
            </div>
            <div>
                <p className="text-xs text-gray-500">Workload moved</p>
                <p className="text-xl font-bold">
                    {objective.moved_workload_hours.toFixed(1)}h
                </p>
            </div>
        </div>
    );
}

export function ScenarioAuditPanel({ result }: Props) {
    const { objective, adjustment_outcomes, redistribution_flows } = result;

    // A scenario stored before the audit columns existed has no comparison
    // block. Show what we do have rather than crashing on a missing summary.
    if (!result.baseline?.summary || !result.simulation?.summary || !objective) {
        return (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    This scenario was stored without a baseline comparison, so
                    peak-stress and objective figures are unavailable for it. Run a
                    new what-if to get the full audit.
                </AlertDescription>
            </Alert>
        );
    }
    const rejected = adjustment_outcomes.filter((o) => o.status === "rejected");
    const partial = adjustment_outcomes.filter(
        (o) => o.status === "partially_applied"
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Baseline vs simulation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        <SummaryColumn
                            title="Baseline"
                            summary={result.baseline.summary}
                            muted
                        />
                        <SummaryColumn
                            title="Simulation"
                            summary={result.simulation.summary}
                        />
                    </div>
                    <ObjectiveRow objective={objective} />
                    {!objective.improved && objective.changed_week_count > 0 && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                This scenario did not lower the peak. That is a real
                                result, not an error — the changes moved workload
                                without relieving the worst week, or moved it onto one.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {(rejected.length > 0 || partial.length > 0) && (
                <Alert variant={rejected.length > 0 ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {rejected.length > 0 && (
                            <>
                                {rejected.length}{" "}
                                {rejected.length === 1 ? "adjustment was" : "adjustments were"}{" "}
                                rejected.
                            </>
                        )}
                        {partial.length > 0 && (
                            <>
                                {" "}
                                {partial.length}{" "}
                                {partial.length === 1 ? "was" : "were"} only partially
                                applied.
                            </>
                        )}{" "}
                        The results below reflect what actually happened, not what was
                        requested.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        Adjustments ({adjustment_outcomes.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {adjustment_outcomes.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            No adjustments — this is the untouched baseline.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {adjustment_outcomes.map((o) => (
                                <li
                                    key={`${o.adjustment_id}-${o.code}`}
                                    className="border rounded-md p-3 border-gray-200 dark:border-gray-700"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{o.adjustment_id}</Badge>
                                        <span className="font-medium">
                                            {adjustmentTypeLabel(o.type)}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={outcomeBadgeClass(o.status)}
                                        >
                                            {o.status.replace(/_/g, " ")}
                                        </Badge>
                                        <code className="text-xs text-gray-500">{o.code}</code>
                                    </div>
                                    <p className="text-sm mt-2">{o.message}</p>
                                    {o.reason && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Stated reason: {o.reason}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            {redistribution_flows.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Redistribution flows ({redistribution_flows.length})
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                            Where cancelled teaching hours went, and what each placement
                            cost in stress.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left p-2">Move</th>
                                        <th className="text-right p-2">Hours</th>
                                        <th className="text-left p-2">Type</th>
                                        <th className="text-right p-2">Target before</th>
                                        <th className="text-right p-2">Target after</th>
                                        <th className="text-right p-2">Impact</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {redistribution_flows.map((f, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-gray-100 dark:border-gray-800"
                                        >
                                            <td className="p-2 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1">
                                                    Week {f.source_week_number}
                                                    <ArrowRight className="h-3 w-3 text-gray-400" />
                                                    Week {f.target_week_number}
                                                </span>
                                            </td>
                                            <td className="p-2 text-right">
                                                {f.hours.toFixed(2)}
                                            </td>
                                            <td className="p-2">
                                                {f.workload_type.replace("_hours", "")}
                                            </td>
                                            <td className="p-2 text-right text-gray-500">
                                                {f.target_stress_before.toFixed(3)}
                                            </td>
                                            <td className="p-2 text-right">
                                                {f.target_stress_after.toFixed(3)}
                                            </td>
                                            <td className="p-2 text-right font-medium">
                                                +{f.impact.toFixed(3)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {result.extensions_applied.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Deadline extensions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            {result.extensions_applied.map((e) => (
                                <li
                                    key={e.extension_id}
                                    className="border rounded-md p-3 border-gray-200 dark:border-gray-700"
                                >
                                    <p className="font-medium">
                                        {e.assignment_id}: week {e.original_end_week} → week{" "}
                                        {e.new_end_week} ({e.weeks_extended} week
                                        {e.weeks_extended === 1 ? "" : "s"})
                                    </p>
                                    {e.reason && (
                                        <p className="text-gray-500 text-xs mt-1">{e.reason}</p>
                                    )}
                                    <p className="text-gray-400 text-xs mt-1">
                                        {e.extension_id} · recorded{" "}
                                        {new Date(e.created_at).toLocaleString()}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {result.warnings.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Warnings ({result.warnings.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            {result.warnings.map((w, i) => (
                                <li key={i} className="flex gap-2">
                                    <code className="text-xs text-amber-700 shrink-0">
                                        {w.code}
                                    </code>
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {w.message}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Model and parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <p className="text-xs text-gray-500">Model</p>
                            <p className="font-mono">
                                {result.stress_model.name}@{result.stress_model_version}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Range</p>
                            <p className="font-mono">
                                {result.stress_model.minimum_stress}–
                                {result.stress_model.maximum_stress}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Fatigue carry-over</p>
                            <p className="font-mono">
                                {result.stress_model.fatigue_carry_over}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Redistribution</p>
                            <p className="font-mono">{result.redistribution_objective}</p>
                        </div>
                    </div>
                    {result.known_limitations.length > 0 && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                <ul className="list-disc pl-4 space-y-1">
                                    {result.known_limitations.map((l, i) => (
                                        <li key={i}>{l}</li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                    <p className="text-xs text-gray-500">
                        Predicted values are the course&rsquo;s additive
                        contribution to stress (schedule-only ceiling &asymp;
                        60.45), not a total stress level. Warning and critical
                        here use the course-model scale.
                    </p>
                    <p className="text-xs text-gray-400">
                        Scenario {result.scenario_id} · created{" "}
                        {new Date(result.created_at).toLocaleString()} · current week{" "}
                        {result.current_week_number}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
