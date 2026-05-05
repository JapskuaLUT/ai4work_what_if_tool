// ui/src/components/yard/TruckGanttChart.tsx

import { useMemo, useState } from "react";
import type { OrderMeasurement, TimeEntry } from "@/types/yard";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { parseHmsToSeconds } from "@/services/yardSimulationService";

interface Props {
    measurements: OrderMeasurement[];
}

const ACTION_COLOURS: Record<string, string> = {
    CheckIn: "#3b82f6",
    Driving: "#9ca3af",
    Parking: "#f59e0b",
    Waiting: "#dc2626",
    Authenticate: "#a855f7",
    Loading: "#10b981",
    Unloading: "#10b981",
    Weighing: "#06b6d4",
    CheckOut: "#3b82f6"
};

function colourFor(action: string): string {
    return ACTION_COLOURS[action] ?? "#6b7280";
}

export function TruckGanttChart({ measurements }: Props) {
    // Sort by total span (visible only when picking a single truck);
    // top-level chart shows all trucks stacked.
    const sorted = useMemo(
        () =>
            [...measurements].sort((a, b) =>
                a.OrderIdent.localeCompare(b.OrderIdent)
            ),
        [measurements]
    );

    const [filter, setFilter] = useState<string>("__all__");
    const visible =
        filter === "__all__"
            ? sorted
            : sorted.filter((m) => m.OrderIdent === filter);

    const tMaxSec = useMemo(() => {
        let mx = 0;
        for (const m of visible) {
            const last = m.TimeEntries[m.TimeEntries.length - 1];
            if (!last) continue;
            const e = parseHmsToSeconds(last.End);
            if (e > mx) mx = e;
        }
        return mx;
    }, [visible]);

    if (visible.length === 0) {
        return null;
    }

    const tMaxMin = Math.max(1, Math.ceil(tMaxSec / 60));

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <CardTitle>Per-truck timeline</CardTitle>
                    <div className="w-72">
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All trucks" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">
                                    All trucks ({sorted.length})
                                </SelectItem>
                                {sorted.map((m) => (
                                    <SelectItem
                                        key={m.OrderIdent}
                                        value={m.OrderIdent}
                                    >
                                        {m.OrderIdent}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Legend />
                <div className="overflow-x-auto">
                    <div
                        className="relative"
                        style={{ minWidth: 600 }}
                    >
                        {/* Time axis */}
                        <div className="flex text-xs text-gray-500 border-b pb-1 mb-1">
                            <div className="w-32 shrink-0">truck</div>
                            <div className="flex-1 flex justify-between">
                                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                                    <span key={f}>
                                        {Math.round(f * tMaxMin)}m
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* Rows */}
                        <div className="space-y-1">
                            {visible.map((m) => (
                                <GanttRow
                                    key={m.OrderIdent}
                                    measurement={m}
                                    tMaxSec={tMaxSec}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function GanttRow({
    measurement,
    tMaxSec
}: {
    measurement: OrderMeasurement;
    tMaxSec: number;
}) {
    const stateClass =
        measurement.Summary.OrderState === "Completed"
            ? "text-gray-700"
            : "text-yellow-700";
    return (
        <div className="flex items-center text-xs">
            <div
                className={`w-32 shrink-0 truncate pr-2 ${stateClass}`}
                title={`${measurement.OrderIdent} — wait ${measurement.Summary.WaitingTime}, drive ${measurement.Summary.DrivingTime}`}
            >
                {measurement.OrderIdent}
            </div>
            <div className="flex-1 relative h-5 bg-gray-100 rounded">
                {measurement.TimeEntries.map((te, idx) => (
                    <Segment
                        key={idx}
                        entry={te}
                        tMaxSec={tMaxSec}
                    />
                ))}
            </div>
        </div>
    );
}

function Segment({ entry, tMaxSec }: { entry: TimeEntry; tMaxSec: number }) {
    const start = parseHmsToSeconds(entry.Start);
    const end = parseHmsToSeconds(entry.End);
    if (tMaxSec <= 0) return null;
    const left = (start / tMaxSec) * 100;
    const width = Math.max(0.2, ((end - start) / tMaxSec) * 100);
    return (
        <div
            className="absolute h-full rounded"
            style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: colourFor(entry.Action),
                opacity: 0.85
            }}
            title={`${entry.Action} @ ${entry.Location} — ${entry.Start}–${entry.End} (${entry.Duration})`}
        />
    );
}

function Legend() {
    return (
        <div className="flex flex-wrap gap-3 text-xs text-gray-700 mb-3">
            {Object.entries(ACTION_COLOURS).map(([action, colour]) => (
                <span
                    key={action}
                    className="inline-flex items-center gap-1"
                >
                    <span
                        className="inline-block w-3 h-3 rounded"
                        style={{ backgroundColor: colour }}
                    />
                    {action}
                </span>
            ))}
        </div>
    );
}
