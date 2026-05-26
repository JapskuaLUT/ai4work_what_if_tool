// ui/src/components/logisticLogs/LogSessionDetail.tsx

import { useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import type { LogSession } from "@/types/logisticLogs";
import {
    formatDuration,
    maskValue,
    reconstructSteps
} from "@/services/logisticLogsService";

interface Props {
    session: LogSession | null;
}

const TYPE_COLOR: Record<string, string> = {
    DIALOG: "#3b82f6",   // blue — driver-facing input
    PROCESS: "#9ca3af"   // gray — internal state
};

export function LogSessionDetail({ session }: Props) {
    const [revealPii, setRevealPii] = useState(false);
    const steps = useMemo(
        () => (session ? reconstructSteps(session) : []),
        [session]
    );
    const maxDur = useMemo(
        () =>
            steps.reduce(
                (m, s) =>
                    s.durationSec !== null && s.durationSec > m
                        ? s.durationSec
                        : m,
                0
            ) || 1,
        [steps]
    );

    if (!session) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Session detail
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">
                        Pick a session on the left to see its full
                        step-by-step timeline.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-base">
                            Process #{session.processId}
                        </CardTitle>
                        <div className="text-xs text-gray-500 mt-1">
                            {new Date(session.startedAt).toLocaleString()} ·{" "}
                            {formatDuration(session.durationSec)} ·{" "}
                            {session.eventCount} events ·{" "}
                            {session.stepCount} distinct steps
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevealPii((v) => !v)}
                        title="Driver name and signature are masked by default."
                    >
                        {revealPii ? (
                            <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Hide PII
                            </>
                        ) : (
                            <>
                                <Eye className="h-3 w-3 mr-1" />
                                Reveal PII
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                    Step-by-step
                </div>
                <div
                    className="overflow-y-auto pr-1 border rounded"
                    style={{ maxHeight: 480 }}
                >
                    <ul className="divide-y">
                        {steps.map((s) => {
                            const widthPct =
                                s.durationSec === null
                                    ? 0
                                    : Math.max(
                                          1,
                                          (s.durationSec / maxDur) * 100
                                      );
                            const color =
                                TYPE_COLOR[s.type] ?? "#6b7280";
                            return (
                                <li
                                    key={s.sequence}
                                    className="py-1.5 px-2 text-xs flex items-center gap-2"
                                >
                                    <span className="w-8 text-gray-400 tabular-nums shrink-0">
                                        {s.sequence}
                                    </span>
                                    <span
                                        className="text-[10px] uppercase font-mono px-1 rounded shrink-0"
                                        style={{
                                            backgroundColor: color + "22",
                                            color
                                        }}
                                    >
                                        {s.type === "DIALOG" ? "DLG" : "PRC"}
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block truncate font-medium">
                                            {s.stepInfo}
                                        </span>
                                        {s.value && (
                                            <span
                                                className={`block text-[11px] font-mono ${
                                                    s.pii
                                                        ? "text-amber-700"
                                                        : "text-gray-500"
                                                }`}
                                            >
                                                ↳ {maskValue(s.value, s.pii && !revealPii)}
                                            </span>
                                        )}
                                    </span>
                                    <div className="w-32 shrink-0">
                                        <div className="h-2 bg-gray-100 rounded relative">
                                            <div
                                                className="absolute inset-y-0 left-0 rounded"
                                                style={{
                                                    width: `${widthPct}%`,
                                                    backgroundColor: color
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span className="w-14 text-right tabular-nums text-gray-700 shrink-0">
                                        {s.durationSec === null
                                            ? "—"
                                            : formatDuration(s.durationSec)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
