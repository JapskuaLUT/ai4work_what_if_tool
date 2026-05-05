// ui/src/components/yard/BottlenecksList.tsx

import type { BottleneckEntry } from "@/types/yard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
    bottlenecks: BottleneckEntry[];
    onSelect?: (entityName: string) => void;
    selected?: string | null;
}

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
                            return (
                                <li
                                    key={b.entity}
                                    className={`py-2 flex items-center justify-between ${
                                        onSelect
                                            ? "cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                                            : ""
                                    } ${isSel ? "bg-blue-50" : ""}`}
                                    onClick={() =>
                                        onSelect && onSelect(b.entity)
                                    }
                                >
                                    <div>
                                        <div className="font-medium">
                                            {b.entity}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {b.type}
                                        </div>
                                    </div>
                                    <div className="text-right text-sm">
                                        <div
                                            className={
                                                saturated
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
