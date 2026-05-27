// ui/src/components/yard/RunSummaryCard.tsx

import type { YardRunSummaryMetrics } from "@/types/yard";
import { Card, CardContent } from "@/components/ui/card";
import { formatSeconds } from "@/services/yardSimulationService";

interface Props {
    metrics: YardRunSummaryMetrics;
}

function Stat({
    label,
    value,
    sub
}: {
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
                {label}
            </div>
            <div className="text-2xl font-semibold">{value}</div>
            {sub && <div className="text-xs text-gray-500">{sub}</div>}
        </div>
    );
}

export function RunSummaryCard({ metrics }: Props) {
    const o = metrics.orders;
    const w = metrics.waiting_seconds;
    const d = metrics.driving_seconds;
    const t = metrics.throughput;
    const pending = o.incomplete + o.unhandled;

    return (
        <Card>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-6">
                <Stat
                    label="Orders"
                    value={`${o.completed}/${o.overall}`}
                    sub={pending ? `${pending} pending` : "all completed"}
                />
                <Stat
                    label="Total wait"
                    value={formatSeconds(w.total)}
                    sub={`p95 ${formatSeconds(w.p95)}`}
                />
                <Stat
                    label="Max wait"
                    value={formatSeconds(w.max)}
                    sub={`avg ${formatSeconds(w.avg)}`}
                />
                <Stat
                    label="Total drive"
                    value={formatSeconds(d.total)}
                    sub={`avg ${formatSeconds(d.avg)}`}
                />
                <Stat
                    label="Throughput"
                    value={`${t.orders_per_hour.toFixed(1)}/h`}
                    sub={`span ${Math.round(t.last_completion_min - t.first_order_min)}m`}
                />
            </CardContent>
        </Card>
    );
}
