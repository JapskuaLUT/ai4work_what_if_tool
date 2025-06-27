// ui/src/components/charts/StressComparisonChart.tsx

import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from "recharts";
import { CourseScenario } from "@/types/builder";

type StressComparisonChartProps = {
    scenarios: CourseScenario[];
    chartType: "stress" | "workload";
};

type StressChartData = {
    name: string;
    "Current Week": number;
    "Next Week": number;
    "Current Max": number;
    "Next Week Max": number;
};

type WorkloadChartData = {
    name: string;
    Teaching: number;
    Lab: number;
    Homework: number;
    Assignments: number;
};

export function StressComparisonChart({
    scenarios,
    chartType
}: StressComparisonChartProps) {
    const [data, setData] = useState<StressChartData[] | WorkloadChartData[]>(
        []
    );

    useEffect(() => {
        if (chartType === "stress") {
            prepareStressData();
        } else {
            prepareWorkloadData();
        }
    }, [scenarios, chartType]);

    const prepareStressData = () => {
        // For the stress chart, we'll compare current and predicted stress levels
        const chartData: StressChartData[] = scenarios.map((scenario) => {
            return {
                name: `Scenario ${scenario.scenarioId}`,
                "Current Week": scenario.stressMetrics?.currentWeekAverage || 0,
                "Next Week":
                    scenario.stressMetrics?.predictedNextWeekAverage || 0,
                "Current Max": scenario.stressMetrics?.currentWeekMaximum || 0,
                "Next Week Max":
                    scenario.stressMetrics?.predictedNextWeekMaximum || 0
            };
        });

        setData(chartData);
    };

    const prepareWorkloadData = () => {
        // For the workload chart, we'll show the distribution of hours in the next week
        const chartData: WorkloadChartData[] = scenarios.map((scenario) => {
            return {
                name: `Scenario ${scenario.scenarioId}`,
                Teaching: scenario.input.teachingTotalHours || 0,
                Lab: scenario.input.labTotalHours || 0,
                Homework: scenario.input.weeklyHomeworkHours || 0,
                Assignments:
                    scenario.assignments?.reduce(
                        (sum, a) => sum + a.hoursPerWeek,
                        0
                    ) || 0
            };
        });

        setData(chartData);
    };

    // Define chart colors
    const colors = {
        current: "#3B82F6", // Blue
        predicted: "#EF4444", // Red
        currentMax: "#93C5FD", // Light Blue
        predictedMax: "#FCA5A5" // Light Red
    };

    const workloadColors = {
        teaching: "#3B82F6", // Blue
        lab: "#10B981", // Green
        homework: "#8B5CF6", // Purple
        assignments: "#F59E0B" // Amber
    };

    if (chartType === "stress") {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                        domain={[0, 10]}
                        label={{
                            value: "Stress Level",
                            angle: -90,
                            position: "insideLeft"
                        }}
                    />
                    <Tooltip formatter={(value) => [`${value}/10`, ""]} />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="Current Week"
                        stroke={colors.current}
                        strokeWidth={2}
                        dot={{ r: 6 }}
                        activeDot={{ r: 8 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="Next Week"
                        stroke={colors.predicted}
                        strokeWidth={2}
                        dot={{ r: 6 }}
                        activeDot={{ r: 8 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="Current Max"
                        stroke={colors.currentMax}
                        strokeDasharray="5 5"
                        strokeWidth={1}
                        dot={{ r: 4 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="Next Week Max"
                        stroke={colors.predictedMax}
                        strokeDasharray="5 5"
                        strokeWidth={1}
                        dot={{ r: 4 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        );
    } else {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                        label={{
                            value: "Hours",
                            angle: -90,
                            position: "insideLeft"
                        }}
                    />
                    <Tooltip formatter={(value) => [`${value} hours`, ""]} />
                    <Legend />
                    <Bar
                        dataKey="Teaching"
                        fill={workloadColors.teaching}
                        name="Teaching"
                    />
                    <Bar dataKey="Lab" fill={workloadColors.lab} name="Lab" />
                    <Bar
                        dataKey="Homework"
                        fill={workloadColors.homework}
                        name="Homework"
                    />
                    <Bar
                        dataKey="Assignments"
                        fill={workloadColors.assignments}
                        name="Assignments"
                    />
                </BarChart>
            </ResponsiveContainer>
        );
    }
}
