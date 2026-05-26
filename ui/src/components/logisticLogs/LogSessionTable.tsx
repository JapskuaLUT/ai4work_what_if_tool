// ui/src/components/logisticLogs/LogSessionTable.tsx

import type { LogSession } from "@/types/logisticLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/services/logisticLogsService";

interface Props {
    sessions: LogSession[];
    selected: number | null;
    onSelect: (processId: number) => void;
}

export function LogSessionTable({ sessions, selected, onSelect }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    Sessions ({sessions.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr className="text-left text-gray-600 border-b">
                                <th className="py-2 px-3">Process</th>
                                <th className="py-2 px-3">Started</th>
                                <th className="py-2 px-3">Duration</th>
                                <th className="py-2 px-3">Events</th>
                                <th className="py-2 px-3">Steps</th>
                                <th className="py-2 px-3">Plate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s) => {
                                const isSel = selected === s.processId;
                                return (
                                    <tr
                                        key={s.processId}
                                        className={`border-b cursor-pointer transition-colors ${
                                            isSel
                                                ? "bg-blue-50"
                                                : "hover:bg-gray-50"
                                        }`}
                                        onClick={() => onSelect(s.processId)}
                                    >
                                        <td className="py-2 px-3 font-mono">
                                            {s.processId}
                                        </td>
                                        <td className="py-2 px-3 text-gray-700">
                                            {new Date(
                                                s.startedAt
                                            ).toLocaleString()}
                                        </td>
                                        <td className="py-2 px-3 tabular-nums">
                                            {formatDuration(s.durationSec)}
                                        </td>
                                        <td className="py-2 px-3 tabular-nums">
                                            {s.eventCount}
                                        </td>
                                        <td className="py-2 px-3 tabular-nums">
                                            {s.stepCount}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-xs">
                                            {s.licensePlate ?? (
                                                <span className="text-gray-400">
                                                    —
                                                </span>
                                            )}
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
