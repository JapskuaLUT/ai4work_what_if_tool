// ui/src/components/stress/EducationalStressComparisonView.tsx

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import type {
    CourseAnalysisOutput,
    AdjustmentScenario,
    StressThresholds,
} from "@/types/educationalStress";
import {
    getAdjustmentName,
    calculateWeekSummary,
} from "@/services/educationalStressService";

type EducationalStressComparisonViewProps = {
    simulation: CourseAnalysisOutput;
    thresholds: StressThresholds;
};

export function EducationalStressComparisonView({
    simulation,
    thresholds,
}: EducationalStressComparisonViewProps) {
    // Prepare comparison data for scenarios
    const scenarioComparison = simulation.week_schedules.map((scenario) => {
        const summary = calculateWeekSummary(scenario.week_schedules);
        return {
            id: scenario.adjustment_id,
            name: getAdjustmentName(scenario.adjustment_id),
            averageStress: summary.averageStress,
            peakStress: summary.peakStress,
            adjustedWeeks: summary.adjustedCount,
            totalWeeks: summary.totalWeeks,
        };
    });

    // Prepare data for peak stress comparison
    const peakStressData = scenarioComparison.map((s) => ({
        name: s.name.split(" - ")[0], // Short name
        "Peak Stress": s.peakStress,
        "Average Stress": s.averageStress,
    }));

    // Prepare data for adjusted weeks comparison
    const adjustedWeeksData = scenarioComparison.map((s) => ({
        name: s.name.split(" - ")[0],
        "Adjusted Weeks": s.adjustedWeeks,
        "Original Weeks": s.totalWeeks - s.adjustedWeeks,
    }));

    // Get stress status
    const getStressStatus = (stress: number) => {
        if (stress >= thresholds.critical) {
            return {
                icon: AlertTriangle,
                color: "text-red-600",
                bg: "bg-red-50",
                label: "Critical",
            };
        }
        if (stress >= thresholds.warning) {
            return {
                icon: AlertTriangle,
                color: "text-yellow-600",
                bg: "bg-yellow-50",
                label: "Warning",
            };
        }
        return {
            icon: CheckCircle,
            color: "text-green-600",
            bg: "bg-green-50",
            label: "Safe",
        };
    };

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {scenarioComparison.map((scenario) => {
                    const status = getStressStatus(scenario.peakStress);
                    const StatusIcon = status.icon;

                    return (
                        <Card key={scenario.id} className={status.bg}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center justify-between">
                                    <span className="truncate">
                                        {scenario.name.split(" - ")[0]}
                                    </span>
                                    <StatusIcon
                                        className={`h-4 w-4 ${status.color}`}
                                    />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Peak Stress:
                                        </span>
                                        <span
                                            className={`font-bold ${status.color}`}
                                        >
                                            {scenario.peakStress.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Avg Stress:
                                        </span>
                                        <span className="font-medium">
                                            {scenario.averageStress.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Adjusted:
                                        </span>
                                        <span className="font-medium">
                                            {scenario.adjustedWeeks}/
                                            {scenario.totalWeeks}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Comparison Charts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <BarChart className="mr-2 h-5 w-5" />
                        Scenario Comparison
                    </CardTitle>
                    <CardDescription>
                        Compare stress levels and adjustments across different
                        optimization strategies
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="stress" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="stress">
                                Stress Levels
                            </TabsTrigger>
                            <TabsTrigger value="adjustments">
                                Adjustments Made
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="stress" className="mt-6">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={peakStressData}
                                    margin={{
                                        top: 20,
                                        right: 30,
                                        left: 20,
                                        bottom: 20,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-15}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        label={{
                                            value: "Stress Level",
                                            angle: -90,
                                            position: "insideLeft",
                                        }}
                                    />
                                    <Tooltip />
                                    <Legend />
                                    <ReferenceLine
                                        y={thresholds.critical}
                                        stroke="#DC2626"
                                        strokeDasharray="5 5"
                                        label={{
                                            value: "Critical",
                                            position: "right",
                                        }}
                                    />
                                    <ReferenceLine
                                        y={thresholds.warning}
                                        stroke="#F59E0B"
                                        strokeDasharray="5 5"
                                        label={{
                                            value: "Warning",
                                            position: "right",
                                        }}
                                    />
                                    <Bar
                                        dataKey="Peak Stress"
                                        fill="#EF4444"
                                        name="Peak Stress"
                                    />
                                    <Bar
                                        dataKey="Average Stress"
                                        fill="#3B82F6"
                                        name="Average Stress"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </TabsContent>

                        <TabsContent value="adjustments" className="mt-6">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={adjustedWeeksData}
                                    margin={{
                                        top: 20,
                                        right: 30,
                                        left: 20,
                                        bottom: 20,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-15}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis
                                        label={{
                                            value: "Number of Weeks",
                                            angle: -90,
                                            position: "insideLeft",
                                        }}
                                    />
                                    <Tooltip />
                                    <Legend />
                                    <Bar
                                        dataKey="Adjusted Weeks"
                                        stackId="a"
                                        fill="#8B5CF6"
                                        name="Adjusted Weeks"
                                    />
                                    <Bar
                                        dataKey="Original Weeks"
                                        stackId="a"
                                        fill="#D1D5DB"
                                        name="Original Weeks"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Key Insights */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <TrendingDown className="mr-2 h-5 w-5" />
                        Key Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {scenarioComparison.map((scenario, index) => {
                            const status = getStressStatus(scenario.peakStress);
                            return (
                                <li
                                    key={scenario.id}
                                    className="flex items-start"
                                >
                                    <Badge
                                        variant="outline"
                                        className="mr-3 mt-0.5"
                                    >
                                        {index + 1}
                                    </Badge>
                                    <div>
                                        <span className="font-medium">
                                            {scenario.name}:
                                        </span>{" "}
                                        Adjusts {scenario.adjustedWeeks} week
                                        {scenario.adjustedWeeks !== 1
                                            ? "s"
                                            : ""}{" "}
                                        to achieve {scenario.averageStress.toFixed(
                                            1
                                        )}{" "}
                                        average stress with peak at{" "}
                                        {scenario.peakStress.toFixed(1)} (
                                        {status.label})
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
