// ui/src/components/yard/BottlenecksList.tsx

import type { BottleneckEntry } from "@/types/yard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass, Info } from "lucide-react";

interface Props {
    bottlenecks: BottleneckEntry[];
    onSelect?: (entityName: string) => void;
    selected?: string | null;
}

const EXTERNAL_WAIT_TOOLTIP =
    "Synthetic entry: trucks queued OUTSIDE the yard because their first " +
    "required entity (typically a CheckIn terminal) was busy. Address it by " +
    "adding CheckIn capacity or staggering order arrivals — not by 'expanding' " +
    "this row, which is not a real entity.";

export function BottlenecksList({ bottlenecks, onSelect, selected }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Top bottlenecks</CardTitle>
            </CardHeader>
            <CardContent>
                {bottlenecks.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        No serving entity carried more than one truck at a time.
                    </p>
                ) : (
                    <ul className="divide-y">
                        {bottlenecks.map((b) => {
                            const saturated = b.queue_score > 1.0;
                            const isSel = selected === b.entity;
                            const isExt = b.type === "ExternalWait";
                            return (
                                <li
                                    key={b.entity}
                                    className={`py-2 flex items-center justify-between border-l-4 -ml-2 pl-2 ${
                                        isExt
                                            ? "border-l-violet-400 bg-violet-50/40"
                                            : "border-l-transparent"
                                    } ${
                                        onSelect
                                            ? "cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                                            : ""
                                    } ${isSel ? "bg-blue-50" : ""}`}
                                    onClick={() =>
                                        onSelect && onSelect(b.entity)
                                    }
                                    title={
                                        isExt
                                            ? EXTERNAL_WAIT_TOOLTIP
                                            : undefined
                                    }
                                >
                                    <div className="flex items-start gap-2 min-w-0">
                                        {isExt && (
                                            <Hourglass className="h-4 w-4 mt-0.5 text-violet-600 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <div
                                                className={`font-medium truncate ${
                                                    isExt
                                                        ? "text-violet-900"
                                                        : ""
                                                }`}
                                            >
                                                {b.entity}
                                            </div>
                                            <div
                                                className={`text-xs flex items-center gap-1 ${
                                                    isExt
                                                        ? "text-violet-700"
                                                        : "text-gray-500"
                                                }`}
                                            >
                                                {b.type}
                                                {isExt && (
                                                    <Info className="h-3 w-3 opacity-70" />
                                                )}
                                            </div>
                                            {isExt && (
                                                <div className="text-[11px] text-violet-700/80 mt-0.5 leading-snug">
                                                    queue outside the yard —
                                                    fix at CheckIn or in order
                                                    pacing
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right text-sm shrink-0 ml-2">
                                        <div
                                            className={
                                                isExt && saturated
                                                    ? "text-violet-700 font-medium"
                                                    : saturated
                                                      ? "text-red-600 font-medium"
                                                      : "text-gray-700"
                                            }
                                        >
                                            {b.max_concurrent} / {b.max_occupancy}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            score {b.queue_score.toFixed(2)}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
