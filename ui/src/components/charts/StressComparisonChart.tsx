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

export function StressComparisonChart({
    scenarios,
    chartType
}: StressComparisonChartProps) {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        if (chartType === "stress") {
            prepareStressData();
        } else {
            prepareWorkloadData();
        }
    }, [scenarios, chartType]);

    const prepareStressData = () => {
        // For the stress chart, we'll compare current and predicted stress levels
        const chartData = scenarios.map((scenario) => {
            return {
                name: `Scenario ${scenario.scenarioId}`,
                "Current Week":
                    scenario.output.stress_metrics.current_week.average,
                "Next Week":
                    scenario.output.stress_metrics.predicted_next_week.average,
                "Current Max":
                    scenario.output.stress_metrics.current_week.maximum,
                "Next Week Max":
                    scenario.output.stress_metrics.predicted_next_week.maximum
            };
        });

        setData(chartData);
    };

    const prepareWorkloadData = () => {
        // For the workload chart, we'll show the distribution of hours in the next week
        const chartData = scenarios.map((scenario) => {
            return {
                name: `Scenario ${scenario.scenarioId}`,
                Teaching:
                    scenario.input.hours_distribution.next_week.teaching_hours,
                Lab: scenario.input.hours_distribution.next_week.lab_hours,
                Homework:
                    scenario.input.hours_distribution.next_week.homework_hours,
                Assignments:
                    scenario.input.hours_distribution.next_week.assignment_hours
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
