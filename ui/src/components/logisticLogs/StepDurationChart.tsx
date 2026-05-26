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

interface Props {
    aggregates: StepAggregate[];
    /** Show only steps drivers actually see (DIALOG) — defaults to true. */
    dialogsOnly?: boolean;
    /** How many top steps to render. */
    topN?: number;
}

const COLOR = { DIALOG: "#3b82f6", PROCESS: "#9ca3af" } as const;

export function StepDurationChart({
    aggregates,
    dialogsOnly = true,
    topN = 12
}: Props) {
    const data = useMemo(() => {
        const pool = dialogsOnly
            ? aggregates.filter((a) => a.type === "DIALOG")
            : aggregates;
        return pool.slice(0, topN).map((a) => ({
            ...a,
            // Recharts likes short labels
            short:
                a.stepInfo.length > 40
                    ? a.stepInfo.slice(0, 38) + "…"
                    : a.stepInfo
        }));
    }, [aggregates, dialogsOnly, topN]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    Time per step — top {topN} {dialogsOnly ? "dialogs" : "steps"}
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                    Median duration drivers spent in each kiosk{" "}
                    {dialogsOnly ? "dialog" : "step"}. p95 trails behind so
                    you can spot tails.
                </p>
            </CardHeader>
            <CardContent>
                <div style={{ width: "100%", height: Math.max(260, data.length * 26) }}>
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
                                width={260}
                                tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                                formatter={(v: any, name: string) => [
                                    formatDuration(v as number),
                                    name
                                ]}
                                labelFormatter={(label, payload) => {
                                    const a = payload?.[0]?.payload as
                                        | StepAggregate
                                        | undefined;
                                    if (!a) return label as string;
                                    return `${a.stepInfo} (${a.count} occurrences)`;
                                }}
                            />
                            <Bar dataKey="p50Sec" name="p50">
                                {data.map((d, i) => (
                                    <Cell
                                        key={i}
                                        fill={COLOR[d.type]}
                                        opacity={0.85}
                                    />
                                ))}
                            </Bar>
                            <Bar dataKey="p95Sec" name="p95">
                                {data.map((d, i) => (
                                    <Cell
                                        key={i}
                                        fill={COLOR[d.type]}
                                        opacity={0.35}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
