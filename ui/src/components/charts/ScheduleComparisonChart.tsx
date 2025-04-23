// ui/src/components/charts/ScheduleComparisonChart.tsx

import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";
import { BuilderScenario } from "@/types/builder";

type ScheduleComparisonChartProps = {
    scenarios: BuilderScenario[];
    chartType: "distribution" | "daily";
};

export function ScheduleComparisonChart({
    scenarios,
    chartType
}: ScheduleComparisonChartProps) {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        if (chartType === "distribution") {
            prepareTaskDistributionData();
        } else {
            prepareDailyLoadData();
        }
    }, [scenarios, chartType]);

    const prepareTaskDistributionData = () => {
        const chartData = scenarios.map((scenario) => {
            if (!scenario.output?.schedule) {
                return {
                    name: `Scenario ${scenario.scenarioId}`,
                    Lectures: 0,
                    Exercises: 0,
                    Project: 0,
                    "Self-learning": 0
                };
            }

            // Initialize counters for each task type
            let lectureHours = 0;
            let exerciseHours = 0;
            let projectHours = 0;
            let selfLearningHours = 0;

            // Calculate hours for each task type
            scenario.output.schedule.forEach((day) => {
                day.timeBlocks.forEach((block) => {
                    // Calculate duration from time range (e.g., "9–11" = 2 hours)
                    const [start, end] = block.time.split("–");

                    // Parse hours and minutes
                    let startHour = parseInt(start.split(":")[0]);
                    let endHour = parseInt(end.split(":")[0]);

                    // Adjust for minutes if present
                    if (start.includes(":")) {
                        const startMin = parseInt(start.split(":")[1]) / 60;
                        startHour += startMin;
                    }

                    if (end.includes(":")) {
                        const endMin = parseInt(end.split(":")[1]) / 60;
                        endHour += endMin;
                    }

                    const hours = endHour - startHour;

                    // Add hours to appropriate task type
                    switch (block.task) {
                        case "Lecture":
                            lectureHours += hours;
                            break;
                        case "Exercises":
                            exerciseHours += hours;
                            break;
                        case "Project":
                            projectHours += hours;
                            break;
                        case "Self-learning":
                            selfLearningHours += hours;
                            break;
                    }
                });
            });

            return {
                name: `Scenario ${scenario.scenarioId}`,
                Lectures: parseFloat(lectureHours.toFixed(1)),
                Exercises: parseFloat(exerciseHours.toFixed(1)),
                Project: parseFloat(projectHours.toFixed(1)),
                "Self-learning": parseFloat(selfLearningHours.toFixed(1))
            };
        });

        setData(chartData);
    };

    const prepareDailyLoadData = () => {
        // Initialize an array to hold data for each day of the week
        const days = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
        ];

        const chartData = days.map((day) => {
            const dataPoint: any = { name: day };

            // Add data for each scenario
            scenarios.forEach((scenario) => {
                if (!scenario.output?.schedule) {
                    dataPoint[`Scenario ${scenario.scenarioId}`] = 0;
                    return;
                }

                // Find the corresponding day in the schedule
                const scheduleDay = scenario.output.schedule.find(
                    (d) => d.day === day
                );

                if (!scheduleDay) {
                    dataPoint[`Scenario ${scenario.scenarioId}`] = 0;
                    return;
                }

                // Calculate total hours for this day
                const dayHours = scheduleDay.timeBlocks.reduce(
                    (total, block) => {
                        const [start, end] = block.time.split("–");

                        // Parse hours and minutes
                        let startHour = parseInt(start.split(":")[0]);
                        let endHour = parseInt(end.split(":")[0]);

                        // Adjust for minutes if present
                        if (start.includes(":")) {
                            const startMin = parseInt(start.split(":")[1]) / 60;
                            startHour += startMin;
                        }

                        if (end.includes(":")) {
                            const endMin = parseInt(end.split(":")[1]) / 60;
                            endHour += endMin;
                        }

                        return total + (endHour - startHour);
                    },
                    0
                );

                dataPoint[`Scenario ${scenario.scenarioId}`] = parseFloat(
                    dayHours.toFixed(1)
                );
            });

            return dataPoint;
        });

        setData(chartData);
    };

    // Define chart colors
    const colors = [
        "#4F46E5", // Blue
        "#10B981", // Green
        "#8B5CF6", // Purple
        "#F59E0B" // Amber
    ];

    // Define scenario colors
    const scenarioColors = [
        "#3B82F6", // Blue
        "#10B981", // Green
        "#8B5CF6", // Purple
        "#F59E0B", // Amber
        "#EF4444", // Red
        "#06B6D4" // Cyan
    ];

    if (chartType === "distribution") {
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
                    <Bar dataKey="Lectures" fill={colors[0]} name="Lectures" />
                    <Bar
                        dataKey="Exercises"
                        fill={colors[1]}
                        name="Exercises"
                    />
                    <Bar dataKey="Project" fill={colors[2]} name="Project" />
                    <Bar
                        dataKey="Self-learning"
                        fill={colors[3]}
                        name="Self-learning"
                    />
                </BarChart>
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
                    {scenarios.map((scenario, index) => (
                        <Bar
                            key={scenario.scenarioId}
                            dataKey={`Scenario ${scenario.scenarioId}`}
                            fill={scenarioColors[index % scenarioColors.length]}
                            name={`Scenario ${scenario.scenarioId}`}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        );
    }
}
