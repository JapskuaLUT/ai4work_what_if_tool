// ui/src/components/results/ComparisonView.tsx

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Scenario } from "@/types/scenario";
import {
    CheckCircle,
    XCircle,
    ClipboardList,
    Calendar,
    Clock,
    AlarmClock,
    Calendar as CalendarIcon,
    MessageSquare
} from "lucide-react";
import { useMemo } from "react";

interface ComparisonViewProps {
    scenarios: Scenario[];
}

export function ComparisonView({ scenarios }: ComparisonViewProps) {
    // Group scenarios by status
    const feasibleScenarios = scenarios.filter(
        (s) => s.output?.status === "feasible"
    );
    const infeasibleScenarios = scenarios.filter(
        (s) => s.output?.status === "infeasible"
    );

    // Calculate statistics for feasible scenarios
    const scenarioStats = useMemo(() => {
        return feasibleScenarios.map((scenario) => {
            // Calculate total hours per day
            const dailyHours: Record<string, number> = {};
            const taskCounts: Record<string, number> = {
                Lecture: 0,
                Exercises: 0,
                Project: 0,
                "Self-learning": 0
            };

            scenario.output?.schedule.forEach((day) => {
                let totalHours = 0;

                day.timeBlocks.forEach((block) => {
                    // Very simple duration calculation based on the time format "9–11" or "15:30–17:30"
                    const [start, end] = block.time.split("–");

                    // Simple parsing, just for estimation
                    let startHour = parseInt(start.split(":")[0]);
                    let endHour = parseInt(end.split(":")[0]);

                    // Adjust if there are minutes
                    if (start.includes(":")) {
                        const startMin = parseInt(start.split(":")[1]) / 60;
                        startHour += startMin;
                    }

                    if (end.includes(":")) {
                        const endMin = parseInt(end.split(":")[1]) / 60;
                        endHour += endMin;
                    }

                    const duration = endHour - startHour;
                    totalHours += duration;

                    // Count tasks by type
                    taskCounts[block.task] = (taskCounts[block.task] || 0) + 1;
                });

                dailyHours[day.day] = totalHours;
            });

            // Calculate max, min, and average hours per day
            const hoursValues = Object.values(dailyHours);
            const maxHours = Math.max(...hoursValues);
            const minHours = Math.min(...hoursValues);
            const avgHours =
                hoursValues.reduce((sum, val) => sum + val, 0) /
                hoursValues.length;

            return {
                scenarioId: scenario.scenarioId,
                maxHours,
                minHours,
                avgHours,
                dailyHours,
                taskCounts
            };
        });
    }, [feasibleScenarios]);

    return (
        <div className="space-y-10">
            {/* Feasible Scenarios Section */}
            <section className="space-y-4">
                <div className="flex items-center">
                    <h2 className="text-2xl font-semibold flex items-center">
                        <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                        Feasible Scenarios
                    </h2>
                    <Badge className="ml-3 bg-green-100 text-green-800">
                        {feasibleScenarios.length} scenarios
                    </Badge>
                </div>

                {feasibleScenarios.length === 0 ? (
                    <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <CardContent className="py-8 text-center">
                            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">
                                No feasible scenarios found.
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                Try adjusting the constraints to create a
                                workable schedule.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {feasibleScenarios.map((scenario, index) => {
                            // Find the stats for this scenario
                            const stats = scenarioStats.find(
                                (s) => s.scenarioId === scenario.scenarioId
                            );

                            return (
                                <Card
                                    key={scenario.scenarioId}
                                    className="border border-green-200 dark:border-green-900 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                >
                                    <CardHeader className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800 pb-4">
                                        <div className="flex justify-between items-center">
                                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                                Feasible
                                            </Badge>
                                            <span className="text-sm text-gray-500">
                                                Scenario {scenario.scenarioId}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg mt-2">
                                            {scenario.description}
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="pt-5 pb-3 space-y-4">
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                                                <p className="text-xs text-gray-500 mb-1 flex items-center justify-center">
                                                    <Clock className="h-3 w-3 mr-1" />{" "}
                                                    Max Hours
                                                </p>
                                                <p className="font-bold text-green-700 dark:text-green-400">
                                                    {stats?.maxHours.toFixed(1)}
                                                    h
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                                                <p className="text-xs text-gray-500 mb-1 flex items-center justify-center">
                                                    <AlarmClock className="h-3 w-3 mr-1" />{" "}
                                                    Avg Hours
                                                </p>
                                                <p className="font-bold text-blue-600 dark:text-blue-400">
                                                    {stats?.avgHours.toFixed(1)}
                                                    h
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                                                <p className="text-xs text-gray-500 mb-1 flex items-center justify-center">
                                                    <CalendarIcon className="h-3 w-3 mr-1" />{" "}
                                                    Days
                                                </p>
                                                <p className="font-bold text-indigo-600 dark:text-indigo-400">
                                                    {
                                                        scenario.output
                                                            ?.schedule.length
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-medium flex items-center mb-2 text-gray-700 dark:text-gray-300">
                                                <Calendar className="mr-2 h-4 w-4 text-gray-500" />{" "}
                                                Daily Schedule
                                            </h3>
                                            <div className="space-y-1">
                                                {scenario.output?.schedule
                                                    .slice(0, 3)
                                                    .map((day) => (
                                                        <div
                                                            key={day.day}
                                                            className="flex items-center text-sm"
                                                        >
                                                            <span className="font-medium w-10">
                                                                {day.day}:
                                                            </span>
                                                            <div className="flex flex-wrap gap-1 flex-1">
                                                                {day.timeBlocks.map(
                                                                    (
                                                                        block,
                                                                        i
                                                                    ) => (
                                                                        <Badge
                                                                            key={
                                                                                i
                                                                            }
                                                                            variant="outline"
                                                                            className={`text-xs ${getTaskColor(
                                                                                block.task
                                                                            )}`}
                                                                        >
                                                                            {
                                                                                block.time
                                                                            }{" "}
                                                                            {
                                                                                block.task
                                                                            }
                                                                        </Badge>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                {(scenario.output?.schedule
                                                    .length || 0) > 3 && (
                                                    <p className="text-xs text-gray-500 text-right italic">
                                                        +
                                                        {(scenario.output
                                                            ?.schedule.length ||
                                                            0) - 3}{" "}
                                                        more days...
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <Separator />

                                        <div>
                                            <h3 className="text-sm font-medium flex items-center mb-2 text-gray-700 dark:text-gray-300">
                                                <ClipboardList className="mr-2 h-4 w-4 text-gray-500" />{" "}
                                                Key Constraints
                                            </h3>
                                            <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                                                {scenario.input.constraints
                                                    .slice(0, 3)
                                                    .map((constraint, idx) => (
                                                        <li
                                                            key={idx}
                                                            className="flex items-start"
                                                        >
                                                            <span className="mr-2">
                                                                •
                                                            </span>
                                                            <span className="text-xs">
                                                                {constraint}
                                                            </span>
                                                        </li>
                                                    ))}
                                                {scenario.input.constraints
                                                    .length > 3 && (
                                                    <li className="text-xs text-gray-500 italic text-right">
                                                        +
                                                        {scenario.input
                                                            .constraints
                                                            .length - 3}{" "}
                                                        more constraints...
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="bg-gray-50 dark:bg-gray-800/50 pt-3 pb-3 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
                                        <div className="flex gap-1">
                                            {stats && (
                                                <>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                                                    >
                                                        {stats.taskCounts
                                                            .Lecture || 0}{" "}
                                                        lectures
                                                    </Badge>
                                                    {stats.taskCounts.Project >
                                                        0 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-400"
                                                        >
                                                            {
                                                                stats.taskCounts
                                                                    .Project
                                                            }{" "}
                                                            projects
                                                        </Badge>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs"
                                        >
                                            View Details
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Infeasible Scenarios Section */}
            <section className="space-y-4">
                <div className="flex items-center">
                    <h2 className="text-2xl font-semibold flex items-center">
                        <XCircle className="mr-2 h-5 w-5 text-red-600" />
                        Infeasible Scenarios
                    </h2>
                    <Badge className="ml-3 bg-red-100 text-red-800">
                        {infeasibleScenarios.length} scenarios
                    </Badge>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {infeasibleScenarios.map((scenario) => (
                        <Card
                            key={scenario.scenarioId}
                            className="border border-red-200 dark:border-red-900 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <CardHeader className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 pb-4">
                                <div className="flex justify-between items-center">
                                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                                        Infeasible
                                    </Badge>
                                    <span className="text-sm text-gray-500">
                                        Scenario {scenario.scenarioId}
                                    </span>
                                </div>
                                <CardTitle className="text-lg mt-2">
                                    {scenario.description}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="pt-5 pb-3">
                                <div>
                                    <h3 className="text-sm font-medium flex items-center mb-2 text-gray-700 dark:text-gray-300">
                                        <ClipboardList className="mr-2 h-4 w-4 text-red-500" />{" "}
                                        Constraints Causing Conflicts
                                    </h3>
                                    <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600 dark:text-gray-400">
                                        {scenario.input.constraints.map(
                                            (constraint, idx) => (
                                                <li
                                                    key={idx}
                                                    className="text-xs"
                                                >
                                                    {constraint}
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>

                                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded p-3">
                                    <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                                        Potential Issues
                                    </h4>
                                    <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">
                                        {isConstraintTooStrict(
                                            scenario.input.constraints
                                        ) && (
                                            <li>
                                                • Too strict daily hour limits
                                            </li>
                                        )}
                                        {hasConflictingTimeConstraints(
                                            scenario.input.constraints
                                        ) && (
                                            <li>
                                                • Conflicting time constraints
                                            </li>
                                        )}
                                        {hasTooManyFreeRequirements(
                                            scenario.input.constraints
                                        ) && (
                                            <li>
                                                • Too many free time
                                                requirements
                                            </li>
                                        )}
                                        {requiresExcessiveBlocks(
                                            scenario.input.constraints
                                        ) && (
                                            <li>
                                                • Required task blocks exceed
                                                available time
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </CardContent>

                            <CardFooter className="bg-gray-50 dark:bg-gray-800/50 pt-3 pb-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                >
                                    Edit Constraints
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}

// Helper function to get task-specific colors for badges
function getTaskColor(task: string): string {
    switch (task) {
        case "Lecture":
            return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
        case "Exercises":
            return "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300";
        case "Project":
            return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
        case "Self-learning":
            return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300";
        default:
            return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
}

// Simple analysis functions for infeasible scenarios
function isConstraintTooStrict(constraints: string[]): boolean {
    return constraints.some(
        (c) =>
            c.toLowerCase().includes("max") &&
            c.includes("hour") &&
            parseInt(c.match(/\d+/)?.[0] || "10") < 5
    );
}

function hasConflictingTimeConstraints(constraints: string[]): boolean {
    return constraints.some(
        (c) =>
            c.toLowerCase().includes("no tasks") &&
            (c.toLowerCase().includes("before") ||
                c.toLowerCase().includes("after"))
    );
}

function hasTooManyFreeRequirements(constraints: string[]): boolean {
    return constraints.some(
        (c) =>
            c.toLowerCase().includes("free") &&
            (c.toLowerCase().includes("afternoon") ||
                c.toLowerCase().includes("day"))
    );
}

function requiresExcessiveBlocks(constraints: string[]): boolean {
    return constraints.some(
        (c) =>
            c.toLowerCase().includes("must") &&
            (c.toLowerCase().includes("block") ||
                c.toLowerCase().includes("hour"))
    );
}
