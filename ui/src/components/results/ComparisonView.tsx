// ui/src/components/results/ComparisonView.tsx

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    BarChart,
    Calendar,
    Clock,
    BarChart2,
    Activity,
    CheckCircle
} from "lucide-react";
import {
    BuilderScenario,
    CourseScenario,
    Plan,
    PlanKind
} from "@/types/builder";
import { ComparisonChatButton } from "@/components/results/ComparisonChatButton";

// Import visualization components
import { ScheduleComparisonChart } from "@/components/charts/ScheduleComparisonChart";
import { StressComparisonChart } from "@/components/charts/StressComparisonChart";

type ComparisonViewProps = {
    scenarios: (BuilderScenario | CourseScenario)[];
    planKind: PlanKind;
    plan?: Plan;
};

export function ComparisonView({
    scenarios,
    planKind = "coursework",
    plan
}: ComparisonViewProps) {
    // Check if we're dealing with a stress plan
    const isStressPlan = planKind === "stress";

    // For coursework plans
    const courseworkScenarioComparison = () => {
        const courseworkScenarios = scenarios as BuilderScenario[];

        // Prepare data for comparison charts
        const feasibility = courseworkScenarios.map((s) =>
            s.output?.status === "feasible" ? "✓ Feasible" : "✗ Infeasible"
        );

        // Calculate weekly hours comparison
        const weeklyHours = courseworkScenarios.map((s) => {
            if (!s.output?.schedule) return 0;

            return s.output.schedule.reduce((total, day) => {
                const dayHours = day.timeBlocks.reduce((dayTotal, block) => {
                    // Calculate hours from time range (e.g., "9–11" = 2 hours)
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

                    return dayTotal + (endHour - startHour);
                }, 0);

                return total + dayHours;
            }, 0);
        });

        // Get busiest days for each scenario
        const busiestDays = courseworkScenarios.map((s) => {
            if (!s.output?.schedule) return { day: "N/A", hours: 0 };

            let busiest = { day: "", hours: 0 };

            s.output.schedule.forEach((day) => {
                const dayHours = day.timeBlocks.reduce((total, block) => {
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
                }, 0);

                if (dayHours > busiest.hours) {
                    busiest = { day: day.day, hours: dayHours };
                }
            });

            return busiest;
        });

        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                Feasibility
                            </CardTitle>
                            <CardDescription>
                                Scenario feasibility comparison
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {courseworkScenarios.map((s, idx) => (
                                    <div
                                        key={s.scenarioId}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="text-sm font-medium">
                                            Scenario {s.scenarioId}
                                        </span>
                                        <Badge
                                            variant={
                                                s.output?.status === "feasible"
                                                    ? "outline"
                                                    : "secondary"
                                            }
                                            className={
                                                s.output?.status === "feasible"
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                            }
                                        >
                                            {feasibility[idx]}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center">
                                <Clock className="h-5 w-5 text-blue-500 mr-2" />
                                Weekly Hours
                            </CardTitle>
                            <CardDescription>
                                Total time allocation per week
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {courseworkScenarios.map((s, idx) => (
                                    <div
                                        key={s.scenarioId}
                                        className="space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                Scenario {s.scenarioId}
                                            </span>
                                            <Badge variant="outline">
                                                {weeklyHours[idx].toFixed(1)}h
                                            </Badge>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full"
                                                style={{
                                                    width: `${
                                                        (weeklyHours[idx] /
                                                            Math.max(
                                                                ...weeklyHours
                                                            )) *
                                                        100
                                                    }%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center">
                                <Calendar className="h-5 w-5 text-purple-500 mr-2" />
                                Busiest Days
                            </CardTitle>
                            <CardDescription>
                                Day with highest workload
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {courseworkScenarios.map((s, idx) => (
                                    <div
                                        key={s.scenarioId}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="text-sm font-medium">
                                            Scenario {s.scenarioId}
                                        </span>
                                        <div className="text-right">
                                            <div className="font-medium">
                                                {busiestDays[idx].day}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {busiestDays[idx].hours.toFixed(
                                                    1
                                                )}{" "}
                                                hours
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="distribution">
                    <TabsList className="mb-4">
                        <TabsTrigger value="distribution">
                            <BarChart className="h-4 w-4 mr-2" />
                            Task Distribution
                        </TabsTrigger>
                        <TabsTrigger value="daily">
                            <BarChart2 className="h-4 w-4 mr-2" />
                            Daily Load
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="distribution">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Task Distribution Comparison
                                </CardTitle>
                                <CardDescription>
                                    Compare how each scenario distributes the
                                    different task types
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                <ScheduleComparisonChart
                                    scenarios={courseworkScenarios}
                                    chartType="distribution"
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="daily">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Load Comparison</CardTitle>
                                <CardDescription>
                                    Compare the workload distribution across
                                    days of the week
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                <ScheduleComparisonChart
                                    scenarios={courseworkScenarios}
                                    chartType="daily"
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </>
        );
    };

    // For stress plans
    const stressScenarioComparison = () => {
        const stressScenarios = scenarios as CourseScenario[];

        // Extract predicted stress levels
        const predictedStressLevels = stressScenarios.map(
            (s) => s.stressMetrics?.predictedNextWeekAverage || 0
        );

        // Calculate stress change
        const stressChanges = stressScenarios.map(
            (s) =>
                (s.stressMetrics?.predictedNextWeekAverage || 0) -
                (s.stressMetrics?.currentWeekAverage || 0)
        );

        // Extract next week total hours
        const nextWeekHours = stressScenarios.map((s) => {
            const hours =
                (s.input.teachingTotalHours || 0) +
                (s.input.labTotalHours || 0) +
                (s.input.weeklyHomeworkHours || 0) +
                (s.assignments?.reduce((sum, a) => sum + a.hoursPerWeek, 0) ||
                    0);
            return hours;
        });

        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center">
                                <Activity className="h-5 w-5 text-red-500 mr-2" />
                                Stress Level
                            </CardTitle>
                            <CardDescription>
                                Predicted stress levels
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stressScenarios.map((s, idx) => (
                                    <div
                                        key={s.scenarioId}
                                        className="space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                Scenario {s.scenarioId}
                                            </span>
                                            <Badge
                                                variant={
                                                    predictedStressLevels[idx] <
                                                    7
                                                        ? "outline"
                                                        : "secondary"
                                                }
                                                className={
                                                    predictedStressLevels[
                                                        idx
                                                    ] >= 7
                                                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                                        : predictedStressLevels[
                                                              idx
                                                          ] >= 5
                                                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                }
                                            >
                                                {predictedStressLevels[
                                                    idx
                                                ].toFixed(1)}
                                                /10
                                            </Badge>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${
                                                    predictedStressLevels[
                                                        idx
                                                    ] >= 7
                                                        ? "bg-red-500"
                                                        : predictedStressLevels[
                                                              idx
                                                          ] >= 5
                                                        ? "bg-yellow-500"
                                                        : "bg-green-500"
                                                }`}
                                                style={{
                                                    width: `${
                                                        predictedStressLevels[
                                                            idx
                                                        ] * 10
                                                    }%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center">
                                <BarChart2 className="h-5 w-5 text-amber-500 mr-2" />
                                Stress Change
                            </CardTitle>
                            <CardDescription>
                                Predicted increase/decrease
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stressScenarios.map((s, idx) => (
                                    <div
                                        key={s.scenarioId}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="text-sm font-medium">
                                            Scenario {s.scenarioId}
                                        </span>
                                        <Badge
                                            variant={
                                                stressChanges[idx] <= 0
                                                    ? "outline"
                                                    : "secondary"
                                            }
                                            className={
                                                stressChanges[idx] > 1
                                                    ? "bg-red-100 text-red-800"
                                                    : stressChanges[idx] < 0
                                                    ? "bg-green-100 text-green-800"
                                                    : ""
                                            }
                                        >
                                            {stressChanges[idx] > 0 ? "+" : ""}
                                            {stressChanges[idx].toFixed(1)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center">
                                <Clock className="h-5 w-5 text-blue-500 mr-2" />
                                Next Week Hours
                            </CardTitle>
                            <CardDescription>
                                Total weekly workload
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stressScenarios.map((s, idx) => (
                                    <div
                                        key={s.scenarioId}
                                        className="space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                Scenario {s.scenarioId}
                                            </span>
                                            <Badge variant="outline">
                                                {nextWeekHours[idx]}h
                                            </Badge>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full"
                                                style={{
                                                    width: `${
                                                        (nextWeekHours[idx] /
                                                            Math.max(
                                                                ...nextWeekHours
                                                            )) *
                                                        100
                                                    }%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="stress">
                    <TabsList className="mb-4">
                        <TabsTrigger value="stress">
                            <Activity className="h-4 w-4 mr-2" />
                            Stress Analysis
                        </TabsTrigger>
                        <TabsTrigger value="workload">
                            <BarChart className="h-4 w-4 mr-2" />
                            Workload Distribution
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="stress">
                        <Card>
                            <CardHeader>
                                <CardTitle>Stress Level Comparison</CardTitle>
                                <CardDescription>
                                    Compare current and predicted stress levels
                                    across scenarios
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                <StressComparisonChart
                                    scenarios={stressScenarios}
                                    chartType="stress"
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="workload">
                        <Card>
                            <CardHeader>
                                <CardTitle>Workload Distribution</CardTitle>
                                <CardDescription>
                                    Compare workload distribution across
                                    different courses
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-80">
                                <StressComparisonChart
                                    scenarios={stressScenarios}
                                    chartType="workload"
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </>
        );
    };

    // Render the appropriate comparison view based on plan kind
    return (
        <div className="relative">
            {isStressPlan
                ? stressScenarioComparison()
                : courseworkScenarioComparison()}

            {/* Add the floating chat button for comparison analysis */}
            {plan && <ComparisonChatButton plan={plan} />}
        </div>
    );
}
