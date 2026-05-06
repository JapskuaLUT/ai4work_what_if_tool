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
import {
    formatSeconds,
    parseHmsToSeconds
} from "@/services/yardSimulationService";

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

interface TruckAggregate {
    totalSec: number;        // sum of all TimeEntry durations
    spanSec: number;         // last End − first Start (wall-clock on-yard)
    byAction: Array<{ action: string; seconds: number; pct: number }>;
}

/**
 * Reduce a truck's TimeEntries into per-action totals + a span. Action
 * percentages are over the totalSec sum (which equals span only if there
 * are no overlaps — for our data it does).
 */
function aggregateTruck(m: OrderMeasurement): TruckAggregate {
    const byAct = new Map<string, number>();
    let total = 0;
    let firstStart = Number.POSITIVE_INFINITY;
    let lastEnd = 0;
    for (const te of m.TimeEntries) {
        const s = parseHmsToSeconds(te.Start);
        const e = parseHmsToSeconds(te.End);
        if (e < s) continue;
        const dur = e - s;
        total += dur;
        byAct.set(te.Action, (byAct.get(te.Action) ?? 0) + dur);
        if (s < firstStart) firstStart = s;
        if (e > lastEnd) lastEnd = e;
    }
    const span = Math.max(0, lastEnd - (Number.isFinite(firstStart) ? firstStart : 0));
    const byAction = [...byAct.entries()]
        .map(([action, seconds]) => ({
            action,
            seconds,
            pct: total > 0 ? (seconds / total) * 100 : 0
        }))
        .sort((a, b) => b.seconds - a.seconds);
    return { totalSec: total, spanSec: span, byAction };
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

    const [hovered, setHovered] = useState<{
        measurement: OrderMeasurement;
        x: number;
        y: number;
    } | null>(null);

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
                                    onHoverEnter={(e) =>
                                        setHovered({
                                            measurement: m,
                                            x: e.clientX,
                                            y: e.clientY
                                        })
                                    }
                                    onHoverMove={(e) =>
                                        setHovered((prev) =>
                                            prev &&
                                            prev.measurement.OrderIdent ===
                                                m.OrderIdent
                                                ? {
                                                      ...prev,
                                                      x: e.clientX,
                                                      y: e.clientY
                                                  }
                                                : prev
                                        )
                                    }
                                    onHoverLeave={() => setHovered(null)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                {hovered && <TruckTooltip {...hovered} />}
            </CardContent>
        </Card>
    );
}

function GanttRow({
    measurement,
    tMaxSec,
    onHoverEnter,
    onHoverMove,
    onHoverLeave
}: {
    measurement: OrderMeasurement;
    tMaxSec: number;
    onHoverEnter: (e: React.MouseEvent) => void;
    onHoverMove: (e: React.MouseEvent) => void;
    onHoverLeave: () => void;
}) {
    const stateClass =
        measurement.Summary.OrderState === "Completed"
            ? "text-gray-700"
            : "text-yellow-700";
    return (
        <div
            className="flex items-center text-xs cursor-default"
            onMouseEnter={onHoverEnter}
            onMouseMove={onHoverMove}
            onMouseLeave={onHoverLeave}
        >
            <div className={`w-32 shrink-0 truncate pr-2 ${stateClass}`}>
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

function TruckTooltip({
    measurement,
    x,
    y
}: {
    measurement: OrderMeasurement;
    x: number;
    y: number;
}) {
    const agg = useMemo(() => aggregateTruck(measurement), [measurement]);
    const sum = measurement.Summary;
    const waitSec = parseHmsToSeconds(sum.WaitingTime);
    const driveSec = parseHmsToSeconds(sum.DrivingTime);

    // Position to the right of the cursor by default; flip left if too close
    // to the right edge of the viewport. Same vertical flip near the bottom.
    const W = 320;
    const H = 320; // generous; tooltip can be shorter
    const left =
        typeof window !== "undefined" && x + W + 24 > window.innerWidth
            ? x - W - 12
            : x + 12;
    const top =
        typeof window !== "undefined" && y + H + 24 > window.innerHeight
            ? Math.max(8, y - H - 12)
            : y + 12;

    return (
        <div
            className="fixed z-50 pointer-events-none rounded-lg border bg-white shadow-lg p-3 text-xs"
            style={{ left, top, width: W }}
        >
            <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-sm truncate">
                    {measurement.OrderIdent}
                </div>
                <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                        sum.OrderState === "Completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                    }`}
                >
                    {sum.OrderState}
                </span>
            </div>
            <div className="text-gray-500 mb-2">
                Process: {measurement.ProcessIdent}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat label="On yard" value={formatSeconds(agg.spanSec)} />
                <Stat
                    label="Waiting"
                    value={formatSeconds(waitSec)}
                    accent={waitSec > 0 ? "text-red-600" : undefined}
                />
                <Stat label="Driving" value={formatSeconds(driveSec)} />
            </div>

            {/* Stacked composition bar */}
            <div className="flex h-2 w-full rounded overflow-hidden mb-2">
                {agg.byAction.map((a) => (
                    <div
                        key={a.action}
                        style={{
                            width: `${a.pct}%`,
                            backgroundColor: colourFor(a.action)
                        }}
                        title={`${a.action}: ${formatSeconds(a.seconds)} (${a.pct.toFixed(1)}%)`}
                    />
                ))}
            </div>

            {/* Per-action breakdown */}
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                Time per action
            </div>
            <ul className="space-y-0.5">
                {agg.byAction.map((a) => (
                    <li
                        key={a.action}
                        className="flex items-center justify-between gap-2"
                    >
                        <span className="flex items-center gap-1.5 min-w-0">
                            <span
                                className="inline-block w-2.5 h-2.5 rounded shrink-0"
                                style={{ backgroundColor: colourFor(a.action) }}
                            />
                            <span className="truncate">{a.action}</span>
                        </span>
                        <span className="tabular-nums text-gray-700 shrink-0">
                            {formatSeconds(a.seconds)}{" "}
                            <span className="text-gray-400">
                                ({a.pct.toFixed(0)}%)
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Stat({
    label,
    value,
    accent
}: {
    label: string;
    value: string;
    accent?: string;
}) {
    return (
        <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                {label}
            </div>
            <div
                className={`font-semibold tabular-nums ${accent ?? "text-gray-800"}`}
            >
                {value}
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
