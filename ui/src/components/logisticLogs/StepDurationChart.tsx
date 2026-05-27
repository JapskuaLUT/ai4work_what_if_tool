// ui/src/components/logisticLogs/StepDurationChart.tsx

import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    Cell
} from "recharts";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import type { StepAggregate } from "@/types/logisticLogs";
import { formatDuration } from "@/services/logisticLogsService";
import {
    describeStep,
    PHASE_ORDER,
    phaseStyle
} from "@/services/logisticLogsGlossary";

interface Props {
    aggregates: StepAggregate[];
    /** Show only steps drivers actually see (DIALOG) — defaults to true. */
    dialogsOnly?: boolean;
    /** How many top steps to render. */
    topN?: number;
}

export function StepDurationChart({
    aggregates,
    dialogsOnly = true,
    topN = 12
}: Props) {
    const data = useMemo(() => {
        const pool = dialogsOnly
            ? aggregates.filter((a) => a.type === "DIALOG")
            : aggregates;
        return pool.slice(0, topN).map((a) => {
            const g = describeStep(a.stepInfo);
            const style = phaseStyle(g.phase);
            return {
                ...a,
                en: g.en,
                phase: g.phase,
                hex: style.hex,
                short: g.en.length > 36 ? g.en.slice(0, 34) + "…" : g.en
            };
        });
    }, [aggregates, dialogsOnly, topN]);

    const phasesPresent = useMemo(() => {
        const seen = new Set(data.map((d) => d.phase));
        return PHASE_ORDER.filter((p) => seen.has(p));
    }, [data]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    Time per step — top {topN}{" "}
                    {dialogsOnly ? "dialogs" : "steps"}
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                    Median (solid) and p95 (faded) time drivers spent in
                    each kiosk {dialogsOnly ? "dialog" : "step"}. Bar colour
                    indicates the workflow phase — see the legend below.
                </p>
            </CardHeader>
            <CardContent>
                <div
                    style={{
                        width: "100%",
                        height: Math.max(260, data.length * 28)
                    }}
                >
                    <ResponsiveContainer>
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                type="number"
                                tickFormatter={(v) => formatDuration(v)}
                                label={{
                                    value: "seconds",
                                    position: "insideBottom",
                                    offset: -2,
                                    fontSize: 11
                                }}
                            />
                            <YAxis
                                type="category"
                                dataKey="short"
                                width={240}
                                tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                                formatter={(v: any, name: string) => [
                                    formatDuration(v as number),
                                    name
                                ]}
                                labelFormatter={(label, payload) => {
                                    const a = payload?.[0]?.payload as
                                        | (StepAggregate & {
                                              en: string;
                                              phase: string;
                                          })
                                        | undefined;
                                    if (!a) return label as string;
                                    return `${a.en}  ·  ${phaseStyle(a.phase as any).label}  (${a.count} occurrences)\nGerman: ${a.stepInfo}`;
                                }}
                            />
                            <Bar dataKey="p50Sec" name="p50">
                                {data.map((d, i) => (
                                    <Cell key={i} fill={d.hex} opacity={0.85} />
                                ))}
                            </Bar>
                            <Bar dataKey="p95Sec" name="p95">
                                {data.map((d, i) => (
                                    <Cell key={i} fill={d.hex} opacity={0.35} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Phase legend */}
                <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t text-[11px]">
                    {phasesPresent.map((p) => {
                        const s = phaseStyle(p);
                        return (
                            <span
                                key={p}
                                className="inline-flex items-center gap-1"
                            >
                                <span
                                    className="inline-block w-2.5 h-2.5 rounded"
                                    style={{ backgroundColor: s.hex }}
                                />
                                <span className="text-gray-700">
                                    {s.label}
                                </span>
                            </span>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
