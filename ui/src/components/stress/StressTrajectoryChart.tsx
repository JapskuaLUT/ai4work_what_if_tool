// ui/src/components/stress/StressTrajectoryChart.tsx
//
// The v1 trajectory chart: baseline against simulated, observed readings as
// points, and the warning/critical thresholds as reference lines.
//
// The Y axis is fixed to the model's own 0-90 range rather than auto-scaling.
// That is deliberate — an auto-scaled axis makes a 40-point week look alarming
// and hides how much headroom the model actually leaves.

import {
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { StressThresholds, WeeklyResult } from "@/types/educationalStress";
import {
    classifyStress,
    SCHEDULE_ONLY_CEILING,
} from "@/services/educationalStressService";

type Props = {
    weeklyResults: WeeklyResult[];
    thresholds: StressThresholds;
    /** Hide the baseline series when showing an unmodified case. */
    showBaseline?: boolean;
    currentWeekNumber?: number;
    maximumStress?: number;
};

const COLORS = {
    baseline: "#94A3B8",
    simulation: "#3B82F6",
    observed: "#8B5CF6",
    warning: "#F59E0B",
    critical: "#DC2626",
    current: "#0F766E",
    ceiling: "#94A3B8",
};

export function StressTrajectoryChart({
    weeklyResults,
    thresholds,
    showBaseline = true,
    currentWeekNumber,
    maximumStress = 90,
}: Props) {
    const data = weeklyResults.map((w) => ({
        week: w.week_number,
        baseline: w.baseline.predicted_stress,
        simulation: w.simulation.predicted_stress,
        observed: w.actual_stress,
        adjusted: w.adjusted,
        delta: w.stress_delta,
        details: w.adjustment_details,
    }));

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload as (typeof data)[number];
        return (
            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg text-sm max-w-xs">
                <p className="font-semibold">
                    Week {d.week}
                    {d.adjusted && (
                        <span className="ml-2 text-purple-600 text-xs">
                            (adjusted)
                        </span>
                    )}
                </p>
                {showBaseline && (
                    <p className="text-gray-500">
                        Baseline: {d.baseline.toFixed(2)} ({classifyStress(d.baseline)})
                    </p>
                )}
                <p className="text-blue-600">
                    {showBaseline ? "Simulated" : "Predicted"}:{" "}
                    {d.simulation.toFixed(2)} ({classifyStress(d.simulation)})
                </p>
                {showBaseline && Math.abs(d.delta) > 1e-6 && (
                    <p className={d.delta < 0 ? "text-green-600" : "text-red-600"}>
                        {d.delta > 0 ? "+" : ""}
                        {d.delta.toFixed(2)} vs baseline
                    </p>
                )}
                {d.observed !== null && d.observed !== undefined && (
                    <p className="text-purple-600">
                        Observed: {d.observed.toFixed(1)}
                    </p>
                )}
                {d.details?.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-600 dark:text-gray-300 list-disc pl-4">
                        {d.details.map((t: string, i: number) => (
                            <li key={i}>{t}</li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                    dataKey="week"
                    label={{ value: "Week", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                    domain={[0, maximumStress]}
                    ticks={[0, 15, 33, 45, 55, 66, maximumStress]}
                    label={{
                        value: "Course stress (additive)",
                        angle: -90,
                        position: "insideLeft",
                    }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={30} />

                <ReferenceLine
                    y={thresholds.warning}
                    stroke={COLORS.warning}
                    strokeDasharray="6 3"
                    label={{ value: `Course warning ${thresholds.warning}`, position: "right", fontSize: 11 }}
                />
                <ReferenceLine
                    y={thresholds.critical}
                    stroke={COLORS.critical}
                    strokeDasharray="6 3"
                    label={{ value: `Course critical ${thresholds.critical}`, position: "right", fontSize: 11 }}
                />
                {/* The model's own ceiling: schedule-only predictions cannot
                    exceed this, whatever the plan looks like. Drawn only when
                    it is meaningfully below the axis top. */}
                {maximumStress > SCHEDULE_ONLY_CEILING + 5 && (
                    <ReferenceLine
                        y={SCHEDULE_ONLY_CEILING}
                        stroke={COLORS.ceiling}
                        strokeDasharray="2 5"
                        label={{
                            value: `model ceiling ${SCHEDULE_ONLY_CEILING}`,
                            position: "right",
                            fontSize: 10,
                        }}
                    />
                )}
                {currentWeekNumber !== undefined && currentWeekNumber > 1 && (
                    <ReferenceLine
                        x={currentWeekNumber}
                        stroke={COLORS.current}
                        strokeDasharray="2 4"
                        label={{ value: "Now", position: "top", fontSize: 11 }}
                    />
                )}

                {showBaseline && (
                    <Line
                        type="monotone"
                        dataKey="baseline"
                        name="Baseline"
                        stroke={COLORS.baseline}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                    />
                )}
                <Line
                    type="monotone"
                    dataKey="simulation"
                    name={showBaseline ? "Simulated" : "Predicted"}
                    stroke={COLORS.simulation}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                />
                <Scatter
                    dataKey="observed"
                    name="Observed"
                    fill={COLORS.observed}
                    shape="circle"
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
