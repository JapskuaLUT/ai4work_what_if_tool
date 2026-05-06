// ui/src/components/yard/OccupancyTimelineChart.tsx

import { useEffect, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    CartesianGrid
} from "recharts";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { fetchOccupancyTimeline } from "@/services/yardSimulationService";
import type { OccupancyTimeline } from "@/types/yard";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
    caseId: string;
    runId: string;
    entity: string | null;
}

export function OccupancyTimelineChart({ caseId, runId, entity }: Props) {
    const [data, setData] = useState<OccupancyTimeline | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!entity) {
            setData(null);
            return;
        }
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const t = await fetchOccupancyTimeline(caseId, runId, entity!);
                if (!cancelled) setData(t);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [caseId, runId, entity]);

    if (!entity) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Entity occupancy</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">
                        Select a bottleneck on the left to plot its occupancy
                        over time.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const isExternalWait = entity === "(off-yard waiting)";
    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {isExternalWait
                        ? "Off-yard wait queue"
                        : `Occupancy at ${entity}`}
                </CardTitle>
                {isExternalWait && (
                    <p className="text-xs text-gray-500 mt-1">
                        Trucks queued outside the yard because their first
                        required entity was busy. Capacity = 1 (single
                        waiting slot); peaks above the line indicate gate
                        congestion.
                    </p>
                )}
            </CardHeader>
            <CardContent>
                {loading && <Skeleton className="h-72 w-full" />}
                {error && <p className="text-sm text-red-600">{error}</p>}
                {data && !loading && (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={data.points.map((p) => ({
                                    minute: Math.round(p.t_seconds / 60),
                                    count: p.count
                                }))}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="minute"
                                    label={{
                                        value: "minute",
                                        position: "insideBottom",
                                        offset: -4
                                    }}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    label={{
                                        value: "trucks",
                                        angle: -90,
                                        position: "insideLeft"
                                    }}
                                />
                                <Tooltip />
                                <ReferenceLine
                                    y={data.max_occupancy}
                                    stroke="#dc2626"
                                    strokeDasharray="4 4"
                                    label={{
                                        value: `capacity (${data.max_occupancy})`,
                                        position: "right",
                                        fill: "#dc2626",
                                        fontSize: 12
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#2563eb"
                                    fill="#3b82f6"
                                    fillOpacity={0.3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
