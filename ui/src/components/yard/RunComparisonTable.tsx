// ui/src/components/yard/RunComparisonTable.tsx

import type { YardRunSummary } from "@/types/yard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Check } from "lucide-react";
import { formatSeconds } from "@/services/yardSimulationService";

interface Props {
    runs: YardRunSummary[];
    selectedRunId: string | null;
    onSelect: (runId: string) => void;
    isSelecting: boolean;
}

export function RunComparisonTable({
    runs,
    selectedRunId,
    onSelect,
    isSelecting
}: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Run comparison</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-gray-600">
                                <th className="py-2 pr-4">Run</th>
                                <th className="py-2 pr-4">Orders</th>
                                <th className="py-2 pr-4">Completed</th>
                                <th className="py-2 pr-4">Total wait</th>
                                <th className="py-2 pr-4">Avg wait</th>
                                <th className="py-2 pr-4">Max wait</th>
                                <th className="py-2 pr-4">Throughput</th>
                                <th className="py-2 pr-4">Top bottleneck</th>
                                <th className="py-2 pr-4"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.map((r) => {
                                const m = r.summary_metrics;
                                const top = m.bottlenecks[0];
                                const isSelected = selectedRunId === r.run_id;
                                return (
                                    <tr
                                        key={r.run_id}
                                        className={`border-b hover:bg-gray-50 ${
                                            isSelected ? "bg-green-50" : ""
                                        }`}
                                    >
                                        <td className="py-2 pr-4">
                                            <div className="font-medium flex items-center gap-1">
                                                {r.label}
                                                {isSelected && (
                                                    <Star className="h-3 w-3 fill-green-600 text-green-600" />
                                                )}
                                            </div>
                                            {r.description && (
                                                <div className="text-xs text-gray-500">
                                                    {r.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {m.orders.overall}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {m.orders.completed}
                                            {m.orders.incomplete +
                                                m.orders.unhandled >
                                                0 && (
                                                <span className="text-red-600 ml-1">
                                                    (
                                                    {m.orders.incomplete +
                                                        m.orders.unhandled}{" "}
                                                    pending)
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {formatSeconds(
                                                m.waiting_seconds.total
                                            )}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {formatSeconds(
                                                m.waiting_seconds.avg
                                            )}
                                        </td>
                                        <td
                                            className={`py-2 pr-4 ${
                                                m.waiting_seconds.max > 600
                                                    ? "text-red-600 font-medium"
                                                    : m.waiting_seconds.max >
                                                          120
                                                        ? "text-yellow-700"
                                                        : ""
                                            }`}
                                        >
                                            {formatSeconds(
                                                m.waiting_seconds.max
                                            )}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {m.throughput.orders_per_hour.toFixed(
                                                1
                                            )}
                                            <span className="text-gray-500">
                                                /h
                                            </span>
                                        </td>
                                        <td className="py-2 pr-4">
                                            {top ? (
                                                <span>
                                                    <span className="font-medium">
                                                        {top.entity}
                                                    </span>
                                                    <span className="text-gray-500 ml-1">
                                                        ({top.max_concurrent}/
                                                        {top.max_occupancy})
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 pr-4">
                                            <Button
                                                size="sm"
                                                variant={
                                                    isSelected
                                                        ? "outline"
                                                        : "default"
                                                }
                                                disabled={
                                                    isSelecting || isSelected
                                                }
                                                onClick={() =>
                                                    onSelect(r.run_id)
                                                }
                                            >
                                                {isSelected ? (
                                                    <>
                                                        <Check className="mr-1 h-3 w-3" />
                                                        Selected
                                                    </>
                                                ) : (
                                                    "Select"
                                                )}
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
