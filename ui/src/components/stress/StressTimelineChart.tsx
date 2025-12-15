// ui/src/components/stress/StressTimelineChart.tsx

import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    Area,
    ComposedChart,
} from "recharts";
import type {
    WeekSchedule,
    StressThresholds,
} from "@/types/educationalStress";

type StressTimelineChartProps = {
    weekSchedules: WeekSchedule[];
    thresholds: StressThresholds;
    showAdjustedOnly?: boolean;
};

type ChartDataPoint = {
    week: number;
    averageStress: number;
    maximumStress: number;
    adjusted: boolean;
    teachingHours: number;
    labHours: number;
    homeworkHours: number;
};

export function StressTimelineChart({
    weekSchedules,
    thresholds,
    showAdjustedOnly = false,
}: StressTimelineChartProps) {
    // Prepare chart data from week schedules
    const prepareChartData = (): ChartDataPoint[] => {
        const filteredWeeks = showAdjustedOnly
            ? weekSchedules.filter((w) => w.adjusted)
            : weekSchedules;

        return filteredWeeks.map((week) => ({
            week: week.week_number,
            averageStress: week.stress_metrics?.average_stress || 0,
            maximumStress: week.stress_metrics?.maximum_stress || 0,
            adjusted: week.adjusted,
            teachingHours: week.teaching_hours,
            labHours: week.lab_hours,
            homeworkHours: week.homework_hours,
        }));
    };

    const chartData = prepareChartData();

    // Define color scheme
    const colors = {
        average: "#3B82F6", // Blue
        maximum: "#EF4444", // Red
        warning: "#F59E0B", // Amber
        critical: "#DC2626", // Dark Red
        safe: "#10B981", // Green
        adjusted: "#8B5CF6", // Purple
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as ChartDataPoint;
            return (
                <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                    <p className="font-semibold text-sm">
                        Week {data.week}
                        {data.adjusted && (
                            <span className="ml-2 text-purple-600 text-xs">
                                (Adjusted)
                            </span>
                        )}
                    </p>
                    <div className="mt-2 space-y-1 text-xs">
                        <p className="text-blue-600">
                            Avg Stress: {data.averageStress.toFixed(1)}
                        </p>
                        <p className="text-red-600">
                            Max Stress: {data.maximumStress.toFixed(1)}
                        </p>
                        <div className="border-t border-gray-200 pt-1 mt-1">
                            <p className="text-gray-600">
                                Teaching: {data.teachingHours}h
                            </p>
                            <p className="text-gray-600">
                                Lab: {data.labHours}h
                            </p>
                            <p className="text-gray-600">
                                Homework: {data.homeworkHours}h
                            </p>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Custom dot for adjusted weeks
    const AdjustedDot = (props: any) => {
        const { cx, cy, payload } = props;
        if (payload.adjusted) {
            return (
                <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={colors.adjusted}
                    stroke="white"
                    strokeWidth={2}
                />
            );
        }
        return (
            <circle cx={cx} cy={cy} r={4} fill={props.fill} stroke="white" />
        );
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                    dataKey="week"
                    label={{
                        value: "Week Number",
                        position: "insideBottom",
                        offset: -10,
                    }}
                />
                <YAxis
                    domain={[0, 100]}
                    label={{
                        value: "Stress Level",
                        angle: -90,
                        position: "insideLeft",
                    }}
                    ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="line"
                    formatter={(value) => {
                        if (value === "averageStress") return "Average Stress";
                        if (value === "maximumStress") return "Maximum Stress";
                        return value;
                    }}
                />

                {/* Reference lines for thresholds */}
                <ReferenceLine
                    y={thresholds.critical}
                    stroke={colors.critical}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                        value: `Critical (${thresholds.critical})`,
                        position: "right",
                        fill: colors.critical,
                        fontSize: 12,
                    }}
                />
                <ReferenceLine
                    y={thresholds.warning}
                    stroke={colors.warning}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                        value: `Warning (${thresholds.warning})`,
                        position: "right",
                        fill: colors.warning,
                        fontSize: 12,
                    }}
                />

                {/* Safe zone background area */}
                <Area
                    type="monotone"
                    dataKey={() => thresholds.warning}
                    fill={colors.safe}
                    fillOpacity={0.05}
                    stroke="none"
                    name="Safe Zone"
                    hide={true}
                />

                {/* Average stress line */}
                <Line
                    type="monotone"
                    dataKey="averageStress"
                    stroke={colors.average}
                    strokeWidth={3}
                    dot={<AdjustedDot fill={colors.average} />}
                    activeDot={{ r: 8 }}
                    name="Average Stress"
                />

                {/* Maximum stress line */}
                <Line
                    type="monotone"
                    dataKey="maximumStress"
                    stroke={colors.maximum}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={<AdjustedDot fill={colors.maximum} />}
                    activeDot={{ r: 6 }}
                    name="Maximum Stress"
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
