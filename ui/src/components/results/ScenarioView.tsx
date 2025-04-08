// ui/src/components/scenario/ScenarioView.tsx

import { Scenario } from "@/types/scenario";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
    AlertTriangle,
    Check,
    X,
    Clock,
    BookOpen,
    Code,
    GraduationCap,
    Calendar,
    ClipboardList
} from "lucide-react";
import { DailyScheduleView } from "./DailyScheduleView";

interface ScenarioViewProps {
    scenario: Scenario;
}

export function ScenarioView({ scenario }: ScenarioViewProps) {
    const isFeasible = scenario.output?.status === "feasible";
    const hasSchedule = isFeasible && scenario.output?.schedule.length > 0;

    // Calculate task statistics
    const taskStats = {
        totalLectureHours: 0,
        totalExerciseHours: 0,
        totalProjectHours: 0,
        totalSelfLearningHours: 0,
        totalHours: 0,
        busiest: { day: "", hours: 0 },
        lightest: { day: "", hours: 100 } // Start with high value to find minimum
    };

    if (hasSchedule) {
        scenario.output?.schedule.forEach((day) => {
            let dailyHours = 0;

            day.timeBlocks.forEach((block) => {
                // Simple duration calculation from time ranges like "9–11" or "15:30–17:30"
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
                dailyHours += hours;

                // Add hours to the appropriate task category
                switch (block.task) {
                    case "Lecture":
                        taskStats.totalLectureHours += hours;
                        break;
                    case "Exercises":
                        taskStats.totalExerciseHours += hours;
                        break;
                    case "Project":
                        taskStats.totalProjectHours += hours;
                        break;
                    case "Self-learning":
                        taskStats.totalSelfLearningHours += hours;
                        break;
                }
            });

            // Update total hours
            taskStats.totalHours += dailyHours;

            // Update busiest and lightest days
            if (dailyHours > taskStats.busiest.hours) {
                taskStats.busiest = { day: day.day, hours: dailyHours };
            }

            if (dailyHours < taskStats.lightest.hours) {
                taskStats.lightest = { day: day.day, hours: dailyHours };
            }
        });
    }

    return (
        <div className="space-y-6">
            <Card
                className={`border-2 ${
                    isFeasible
                        ? "border-green-200 dark:border-green-800"
                        : "border-red-200 dark:border-red-800"
                }`}
            >
                <CardHeader
                    className={`pb-4 ${
                        isFeasible
                            ? "bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800"
                            : "bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <Badge
                            className={
                                isFeasible
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                            }
                        >
                            {isFeasible ? "Feasible" : "Infeasible"}
                        </Badge>
                        <span className="text-sm text-gray-500">
                            Scenario {scenario.scenarioId}
                        </span>
                    </div>
                    <CardTitle className="text-2xl mt-2">
                        {scenario.description}
                    </CardTitle>
                    <CardDescription className="mt-1 text-gray-600">
                        {isFeasible
                            ? "This schedule satisfies all constraints and can be implemented."
                            : "This schedule cannot be created with the given constraints."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    {!isFeasible && (
                        <Alert
                            variant="destructive"
                            className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <p className="font-medium mb-1">
                                    Schedule cannot be created
                                </p>
                                <p className="text-sm">
                                    The constraints cannot be satisfied
                                    simultaneously. Consider relaxing some
                                    constraints.
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left column - Task Details */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium mb-4">
                                    Task Requirements
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                                            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">
                                                    Lectures
                                                </h4>
                                                <span className="text-sm text-gray-500">
                                                    {
                                                        scenario.input.tasks
                                                            .lectures.length
                                                    }{" "}
                                                    sessions
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap mt-1 gap-1">
                                                {scenario.input.tasks.lectures.map(
                                                    (lecture, idx) => (
                                                        <Badge
                                                            key={idx}
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            {lecture}
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-3">
                                            <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">
                                                    Exercises
                                                </h4>
                                                <span className="text-sm text-gray-500">
                                                    {
                                                        scenario.input.tasks
                                                            .exercisesHours
                                                    }{" "}
                                                    hours
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full"
                                                    style={{
                                                        width: `${Math.min(
                                                            (taskStats.totalExerciseHours /
                                                                scenario.input
                                                                    .tasks
                                                                    .exercisesHours) *
                                                                100,
                                                            100
                                                        )}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
                                            <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">
                                                    Project
                                                </h4>
                                                <span className="text-sm text-gray-500">
                                                    {
                                                        scenario.input.tasks
                                                            .projectHours
                                                    }{" "}
                                                    hours
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                                <div
                                                    className="bg-purple-500 h-2 rounded-full"
                                                    style={{
                                                        width: `${Math.min(
                                                            (taskStats.totalProjectHours /
                                                                scenario.input
                                                                    .tasks
                                                                    .projectHours) *
                                                                100,
                                                            100
                                                        )}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mr-3">
                                            <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">
                                                    Self-learning
                                                </h4>
                                                <span className="text-sm text-gray-500">
                                                    {
                                                        scenario.input.tasks
                                                            .selfLearningHours
                                                    }{" "}
                                                    hours
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                                <div
                                                    className="bg-amber-500 h-2 rounded-full"
                                                    style={{
                                                        width: `${Math.min(
                                                            (taskStats.totalSelfLearningHours /
                                                                scenario.input
                                                                    .tasks
                                                                    .selfLearningHours) *
                                                                100,
                                                            100
                                                        )}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-lg font-medium mb-3 flex items-center">
                                    <ClipboardList className="mr-2 h-5 w-5 text-gray-500" />{" "}
                                    Constraints
                                </h3>
                                <ul className="space-y-2">
                                    {scenario.input.constraints.map(
                                        (constraint, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-start text-sm"
                                            >
                                                {isFeasible ? (
                                                    <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                                                ) : (
                                                    <X className="h-4 w-4 text-red-500 mr-2 mt-0.5" />
                                                )}
                                                <span>{constraint}</span>
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Right column - Schedule */}
                        <div>
                            <h3 className="text-lg font-medium mb-4 flex items-center">
                                <Calendar className="mr-2 h-5 w-5 text-gray-500" />{" "}
                                Weekly Schedule
                            </h3>

                            {hasSchedule ? (
                                <div className="space-y-4">
                                    {/* Schedule stats */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                            <p className="text-xs text-gray-500 mb-1">
                                                Total Hours
                                            </p>
                                            <p className="text-xl font-bold">
                                                {taskStats.totalHours.toFixed(
                                                    1
                                                )}
                                                h
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                            <p className="text-xs text-gray-500 mb-1">
                                                Busiest Day
                                            </p>
                                            <p className="text-xl font-bold">
                                                {taskStats.busiest.day}{" "}
                                                <span className="text-sm font-normal text-gray-500">
                                                    (
                                                    {taskStats.busiest.hours.toFixed(
                                                        1
                                                    )}
                                                    h)
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Daily Schedule */}
                                    <div className="space-y-3">
                                        {scenario.output?.schedule.map(
                                            (day) => (
                                                <DailyScheduleView
                                                    key={day.day}
                                                    day={day}
                                                />
                                            )
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center h-full flex flex-col items-center justify-center">
                                    <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
                                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                        No Schedule Available
                                    </h4>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1 max-w-md">
                                        The current constraints cannot be
                                        satisfied simultaneously.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="bg-gray-50 dark:bg-gray-800/50 p-4 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
                    <div className="text-sm text-gray-500">
                        {isFeasible ? (
                            <span className="flex items-center">
                                <Check className="h-4 w-4 text-green-500 mr-1" />
                                Schedule is viable and meets all constraints
                            </span>
                        ) : (
                            <span className="flex items-center">
                                <X className="h-4 w-4 text-red-500 mr-1" />
                                Schedule conflicts detected
                            </span>
                        )}
                    </div>
                    <Button variant="outline" size="sm">
                        Export Schedule
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
