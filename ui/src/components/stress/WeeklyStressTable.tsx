// ui/src/components/stress/WeeklyStressTable.tsx
//
// The v1 weekly breakdown. Homework, assignment and exam load are shown as
// separate columns — merging them was the whole point of §12.1 — and each row
// expands to the component breakdown behind its stress number.

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { StressThresholds, WeeklyResult } from "@/types/educationalStress";
import {
    classificationBadgeClass,
    classifyStress,
    weekTotalHours,
} from "@/services/educationalStressService";

type Props = {
    weeklyResults: WeeklyResult[];
    thresholds: StressThresholds;
    showBaseline?: boolean;
};

const HOUR_COLUMNS = [
    { key: "lecture_hours", label: "Lecture" },
    { key: "lab_hours", label: "Lab" },
    { key: "homework_hours", label: "Homework" },
    { key: "assignment_hours", label: "Assignment" },
    { key: "exam_hours", label: "Exam" },
] as const;

const COMPONENT_ROWS = [
    { key: "base", label: "P_base", note: "BL(W; 5, 30, 34)" },
    { key: "teaching", label: "P_teach", note: "BL(T; 3, 14, 10)" },
    { key: "homework", label: "P_home", note: "BL(H; 2, 16, 12)" },
    { key: "assignment", label: "P_assign", note: "BL(A; 1, 14, 18)" },
    { key: "exam", label: "P_exam", note: "12 + min(2.5E, 18)" },
    { key: "overload", label: "P_over", note: "above 32h total" },
    { key: "fatigue", label: "P_fatigue", note: "7% of last week's final stress" },
] as const;

export function WeeklyStressTable({ weeklyResults, thresholds, showBaseline = true }: Props) {
    const [expanded, setExpanded] = useState<number | null>(null);

    const fmt = (n: number) => (Math.abs(n) < 5e-3 ? "0" : n.toFixed(2));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Weekly breakdown</CardTitle>
                <p className="text-sm text-gray-500">
                    Click a week to see the seven components behind its stress value.
                </p>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                <th className="text-left p-2 w-8" />
                                <th className="text-left p-2">Week</th>
                                {HOUR_COLUMNS.map((c) => (
                                    <th key={c.key} className="text-right p-2">
                                        {c.label}
                                    </th>
                                ))}
                                <th className="text-right p-2">Total</th>
                                {showBaseline && <th className="text-right p-2">Baseline</th>}
                                <th className="text-right p-2">Stress</th>
                                {showBaseline && <th className="text-right p-2">Δ</th>}
                                <th className="text-left p-2">Band</th>
                                <th className="text-right p-2">Observed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyResults.map((week) => {
                                const sim = week.simulation;
                                const band = classifyStress(sim.predicted_stress);
                                const isOpen = expanded === week.week_index;
                                const overWarning =
                                    sim.predicted_stress >= thresholds.warning;
                                const overCritical =
                                    sim.predicted_stress >= thresholds.critical;

                                return (
                                    <>
                                        <tr
                                            key={week.week_index}
                                            onClick={() =>
                                                setExpanded(isOpen ? null : week.week_index)
                                            }
                                            className={`border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
                                                week.adjusted
                                                    ? "bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100"
                                                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                            }`}
                                        >
                                            <td className="p-2 text-gray-400">
                                                {isOpen ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </td>
                                            <td className="p-2 font-medium whitespace-nowrap">
                                                {week.week_number}
                                                {week.adjusted && (
                                                    <span className="ml-2 text-xs text-purple-600">
                                                        adjusted
                                                    </span>
                                                )}
                                            </td>
                                            {HOUR_COLUMNS.map((c) => {
                                                const after = sim[c.key];
                                                const before = week.baseline[c.key];
                                                const changed =
                                                    showBaseline &&
                                                    Math.abs(after - before) > 1e-6;
                                                return (
                                                    <td key={c.key} className="p-2 text-right">
                                                        {changed && (
                                                            <span className="text-gray-400 line-through mr-1 text-xs">
                                                                {fmt(before)}
                                                            </span>
                                                        )}
                                                        <span
                                                            className={
                                                                changed
                                                                    ? "font-medium text-purple-600"
                                                                    : ""
                                                            }
                                                        >
                                                            {fmt(after)}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="p-2 text-right font-medium">
                                                {fmt(weekTotalHours(sim))}
                                            </td>
                                            {showBaseline && (
                                                <td className="p-2 text-right text-gray-500">
                                                    {week.baseline.predicted_stress.toFixed(2)}
                                                </td>
                                            )}
                                            <td
                                                className={`p-2 text-right font-semibold ${
                                                    overCritical
                                                        ? "text-red-600"
                                                        : overWarning
                                                          ? "text-amber-600"
                                                          : ""
                                                }`}
                                            >
                                                {sim.predicted_stress.toFixed(2)}
                                            </td>
                                            {showBaseline && (
                                                <td
                                                    className={`p-2 text-right ${
                                                        week.stress_delta < -1e-6
                                                            ? "text-green-600"
                                                            : week.stress_delta > 1e-6
                                                              ? "text-red-600"
                                                              : "text-gray-400"
                                                    }`}
                                                >
                                                    {Math.abs(week.stress_delta) < 1e-6
                                                        ? "—"
                                                        : `${week.stress_delta > 0 ? "+" : ""}${week.stress_delta.toFixed(2)}`}
                                                </td>
                                            )}
                                            <td className="p-2">
                                                <Badge
                                                    variant="outline"
                                                    className={classificationBadgeClass(band)}
                                                >
                                                    {band}
                                                </Badge>
                                            </td>
                                            <td className="p-2 text-right text-purple-600">
                                                {week.actual_stress === null
                                                    ? "—"
                                                    : week.actual_stress.toFixed(1)}
                                            </td>
                                        </tr>

                                        {isOpen && (
                                            <tr
                                                key={`${week.week_index}-detail`}
                                                className="bg-gray-50 dark:bg-gray-900"
                                            >
                                                <td />
                                                <td
                                                    colSpan={HOUR_COLUMNS.length + 6}
                                                    className="p-4"
                                                >
                                                    <div className="grid md:grid-cols-2 gap-6">
                                                        <div>
                                                            <p className="font-medium mb-2">
                                                                Components (week{" "}
                                                                {week.week_number})
                                                            </p>
                                                            <table className="w-full text-xs">
                                                                <tbody>
                                                                    {COMPONENT_ROWS.map((r) => (
                                                                        <tr key={r.key}>
                                                                            <td className="py-1 font-mono">
                                                                                {r.label}
                                                                            </td>
                                                                            <td className="py-1 text-gray-500">
                                                                                {r.note}
                                                                            </td>
                                                                            {showBaseline && (
                                                                                <td className="py-1 text-right text-gray-400">
                                                                                    {fmt(
                                                                                        week
                                                                                            .baseline
                                                                                            .components[
                                                                                            r.key
                                                                                        ]
                                                                                    )}
                                                                                </td>
                                                                            )}
                                                                            <td className="py-1 text-right font-medium">
                                                                                {fmt(
                                                                                    sim
                                                                                        .components[
                                                                                        r.key
                                                                                    ]
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                    <tr className="border-t">
                                                                        <td className="py-1 font-mono font-semibold">
                                                                            R
                                                                        </td>
                                                                        <td className="py-1 text-gray-500">
                                                                            raw sum
                                                                        </td>
                                                                        {showBaseline && (
                                                                            <td className="py-1 text-right text-gray-400">
                                                                                {fmt(
                                                                                    week.baseline
                                                                                        .components
                                                                                        .raw
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                        <td className="py-1 text-right font-semibold">
                                                                            {fmt(
                                                                                sim.components.raw
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="py-1 font-mono">
                                                                            S_schedule
                                                                        </td>
                                                                        <td className="py-1 text-gray-500">
                                                                            after soft cap
                                                                        </td>
                                                                        {showBaseline && (
                                                                            <td className="py-1 text-right text-gray-400">
                                                                                {fmt(
                                                                                    week.baseline
                                                                                        .components
                                                                                        .schedule_only
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                        <td className="py-1 text-right">
                                                                            {fmt(
                                                                                sim.components
                                                                                    .schedule_only
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="py-1 font-mono">
                                                                            bias
                                                                        </td>
                                                                        <td className="py-1 text-gray-500">
                                                                            learned calibration
                                                                        </td>
                                                                        {showBaseline && (
                                                                            <td className="py-1 text-right text-gray-400">
                                                                                {fmt(
                                                                                    week.baseline
                                                                                        .calibration_bias
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                        <td className="py-1 text-right">
                                                                            {fmt(
                                                                                sim.calibration_bias
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                    <tr className="border-t">
                                                                        <td className="py-1 font-mono font-semibold">
                                                                            S
                                                                        </td>
                                                                        <td className="py-1 text-gray-500">
                                                                            final
                                                                        </td>
                                                                        {showBaseline && (
                                                                            <td className="py-1 text-right text-gray-400">
                                                                                {week.baseline.predicted_stress.toFixed(
                                                                                    2
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                        <td className="py-1 text-right font-semibold">
                                                                            {sim.predicted_stress.toFixed(
                                                                                2
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium mb-2">
                                                                What changed
                                                            </p>
                                                            {week.adjustment_details.length ===
                                                            0 ? (
                                                                <p className="text-xs text-gray-500">
                                                                    No direct adjustment
                                                                    targeted this week.
                                                                    {week.adjusted &&
                                                                        " Its workload still changed because an assignment or exam moved and the schedule was rebuilt."}
                                                                </p>
                                                            ) : (
                                                                <ul className="text-xs list-disc pl-4 space-y-1">
                                                                    {week.adjustment_details.map(
                                                                        (d, i) => (
                                                                            <li key={i}>{d}</li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            )}
                                                            <p className="mt-3 text-xs text-gray-500">
                                                                {week.week_start.slice(0, 10)} –{" "}
                                                                {week.week_end.slice(0, 10)}
                                                                {" · "}week_index{" "}
                                                                {week.week_index}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
