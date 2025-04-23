// ui/src/components/scenario/StressScenarioView.tsx

import { CourseScenario } from "@/types/builder";
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
import { Separator } from "@/components/ui/separator";
import {
    BookOpen,
    Award,
    Clock,
    Calendar,
    Activity,
    BarChart,
    Users
} from "lucide-react";
import { FloatingScenarioChat } from "./FloatingScenarioChat";

interface StressScenarioViewProps {
    scenario: CourseScenario;
}

export function StressScenarioView({ scenario }: StressScenarioViewProps) {
    // Helper function to determine stress color
    const getStressColor = (value: number) => {
        if (value < 4) return "bg-green-500";
        if (value < 7) return "bg-yellow-500";
        return "bg-red-500";
    };

    // Calculate total hours for next week
    const nextWeekTotal =
        scenario.input.hours_distribution.next_week.teaching_hours +
        scenario.input.hours_distribution.next_week.lab_hours +
        scenario.input.hours_distribution.next_week.homework_hours +
        scenario.input.hours_distribution.next_week.assignment_hours;

    // Calculate total remaining hours
    const totalRemaining =
        scenario.input.hours_distribution.remaining.teaching_hours +
        scenario.input.hours_distribution.remaining.lab_hours +
        scenario.input.hours_distribution.remaining.homework_hours +
        scenario.input.hours_distribution.remaining.assignment_hours;

    // Calculate stress level increase
    const stressIncrease =
        scenario.output.stress_metrics.predicted_next_week.average -
        scenario.output.stress_metrics.current_week.average;

    return (
        <div className="space-y-6 relative pb-20">
            <Card
                className={`border-2 ${
                    scenario.output.stress_metrics.predicted_next_week.average <
                    7
                        ? "border-green-200 dark:border-green-800"
                        : "border-red-200 dark:border-red-800"
                }`}
            >
                <CardHeader
                    className={`pb-4 ${
                        scenario.output.stress_metrics.predicted_next_week
                            .average < 7
                            ? "bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800"
                            : "bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <Badge
                            className={
                                scenario.output.stress_metrics
                                    .predicted_next_week.average < 7
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                            }
                        >
                            {scenario.output.stress_metrics.predicted_next_week
                                .average < 7
                                ? "Manageable"
                                : "High Stress"}
                        </Badge>
                        <span className="text-sm text-gray-500">
                            Scenario {scenario.scenarioId}
                        </span>
                    </div>
                    <CardTitle className="text-2xl mt-2">
                        {scenario.description}
                    </CardTitle>
                    <CardDescription className="mt-1 text-gray-600">
                        {scenario.input.course_info.course_name} (
                        {scenario.input.course_info.course_id})
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left column - Course Info */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium mb-4 flex items-center">
                                    <BookOpen className="mr-2 h-5 w-5 text-blue-600" />{" "}
                                    Course Information
                                </h3>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">
                                            ECTS
                                        </p>
                                        <p className="text-xl font-bold">
                                            {scenario.input.course_info.ects}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">
                                            Difficulty
                                        </p>
                                        <p className="text-xl font-bold">
                                            {
                                                scenario.input.course_info
                                                    .topic_difficulty
                                            }
                                            /10
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            Attendance:
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="capitalize"
                                        >
                                            {
                                                scenario.input.course_info
                                                    .attendance_method
                                            }
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            Prerequisites:
                                        </span>
                                        <Badge
                                            variant={
                                                scenario.input.course_info
                                                    .prerequisites
                                                    ? "secondary"
                                                    : "outline"
                                            }
                                        >
                                            {scenario.input.course_info
                                                .prerequisites
                                                ? "Required"
                                                : "None"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            Current Week:
                                        </span>
                                        <Badge variant="outline">
                                            {
                                                scenario.input.current_status
                                                    .current_week
                                            }{" "}
                                            of{" "}
                                            {
                                                scenario.input.current_status
                                                    .total_weeks
                                            }
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-lg font-medium mb-4 flex items-center">
                                    <Award className="mr-2 h-5 w-5 text-indigo-600" />{" "}
                                    Course Performance
                                </h3>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">
                                            Success Rate
                                        </p>
                                        <p className="text-xl font-bold">
                                            {
                                                scenario.input.course_info
                                                    .success_rate_percent
                                            }
                                            %
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">
                                            Average Grade
                                        </p>
                                        <p className="text-xl font-bold">
                                            {scenario.input.course_info.average_grade.toFixed(
                                                1
                                            )}
                                            /4.0
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center">
                                            <Users className="h-4 w-4 text-gray-500 mr-2" />
                                            <span className="text-sm text-gray-600">
                                                Students:
                                            </span>
                                        </div>
                                        <Badge variant="secondary">
                                            {scenario.input.students.count}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-lg font-medium mb-4 flex items-center">
                                    <Calendar className="mr-2 h-5 w-5 text-green-600" />{" "}
                                    Course Schedule
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">
                                            Teaching Schedule
                                        </p>
                                        <p className="font-medium">
                                            {scenario.input.course_info.teaching.days.join(
                                                ", "
                                            )}{" "}
                                            {
                                                scenario.input.course_info
                                                    .teaching.time
                                            }
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Total:{" "}
                                            {
                                                scenario.input.course_info
                                                    .teaching.total_hours
                                            }{" "}
                                            hours
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">
                                            Lab Schedule
                                        </p>
                                        <p className="font-medium">
                                            {scenario.input.course_info.lab.days.join(
                                                ", "
                                            )}{" "}
                                            {
                                                scenario.input.course_info.lab
                                                    .time
                                            }
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Total:{" "}
                                            {
                                                scenario.input.course_info.lab
                                                    .total_hours
                                            }{" "}
                                            hours
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right column - Stress & Workload */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium mb-4 flex items-center">
                                    <Activity className="mr-2 h-5 w-5 text-red-600" />{" "}
                                    Stress Analysis
                                </h3>

                                <div className="space-y-4">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <div className="flex justify-between mb-2">
                                            <h4 className="font-medium">
                                                Current Week Stress
                                            </h4>
                                            <Badge
                                                variant={
                                                    scenario.output
                                                        .stress_metrics
                                                        .current_week.average <
                                                    5
                                                        ? "outline"
                                                        : "secondary"
                                                }
                                                className={
                                                    scenario.output
                                                        .stress_metrics
                                                        .current_week.average >
                                                    7
                                                        ? "bg-red-100 text-red-800"
                                                        : ""
                                                }
                                            >
                                                {scenario.output.stress_metrics.current_week.average.toFixed(
                                                    1
                                                )}
                                                /10
                                            </Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>Average Stress</span>
                                                    <span>
                                                        {scenario.output.stress_metrics.current_week.average.toFixed(
                                                            1
                                                        )}
                                                        /10
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full ${getStressColor(
                                                            scenario.output
                                                                .stress_metrics
                                                                .current_week
                                                                .average
                                                        )}`}
                                                        style={{
                                                            width: `${Math.min(
                                                                scenario.output
                                                                    .stress_metrics
                                                                    .current_week
                                                                    .average *
                                                                    10,
                                                                100
                                                            )}%`
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>Maximum Stress</span>
                                                    <span>
                                                        {scenario.output.stress_metrics.current_week.maximum.toFixed(
                                                            1
                                                        )}
                                                        /10
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full ${getStressColor(
                                                            scenario.output
                                                                .stress_metrics
                                                                .current_week
                                                                .maximum
                                                        )}`}
                                                        style={{
                                                            width: `${Math.min(
                                                                scenario.output
                                                                    .stress_metrics
                                                                    .current_week
                                                                    .maximum *
                                                                    10,
                                                                100
                                                            )}%`
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <div className="flex justify-between mb-2">
                                            <h4 className="font-medium">
                                                Predicted Next Week
                                            </h4>
                                            <Badge
                                                variant={
                                                    scenario.output
                                                        .stress_metrics
                                                        .predicted_next_week
                                                        .average < 5
                                                        ? "outline"
                                                        : "secondary"
                                                }
                                                className={
                                                    scenario.output
                                                        .stress_metrics
                                                        .predicted_next_week
                                                        .average > 7
                                                        ? "bg-red-100 text-red-800"
                                                        : ""
                                                }
                                            >
                                                {scenario.output.stress_metrics.predicted_next_week.average.toFixed(
                                                    1
                                                )}
                                                /10
                                            </Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>Average Stress</span>
                                                    <span>
                                                        {scenario.output.stress_metrics.predicted_next_week.average.toFixed(
                                                            1
                                                        )}
                                                        /10
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full ${getStressColor(
                                                            scenario.output
                                                                .stress_metrics
                                                                .predicted_next_week
                                                                .average
                                                        )}`}
                                                        style={{
                                                            width: `${Math.min(
                                                                scenario.output
                                                                    .stress_metrics
                                                                    .predicted_next_week
                                                                    .average *
                                                                    10,
                                                                100
                                                            )}%`
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>Maximum Stress</span>
                                                    <span>
                                                        {scenario.output.stress_metrics.predicted_next_week.maximum.toFixed(
                                                            1
                                                        )}
                                                        /10
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full ${getStressColor(
                                                            scenario.output
                                                                .stress_metrics
                                                                .predicted_next_week
                                                                .maximum
                                                        )}`}
                                                        style={{
                                                            width: `${Math.min(
                                                                scenario.output
                                                                    .stress_metrics
                                                                    .predicted_next_week
                                                                    .maximum *
                                                                    10,
                                                                100
                                                            )}%`
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">
                                                    Stress Change:
                                                </span>
                                                <Badge
                                                    variant={
                                                        stressIncrease <= 0
                                                            ? "outline"
                                                            : "secondary"
                                                    }
                                                    className={
                                                        stressIncrease > 1
                                                            ? "bg-red-100 text-red-800"
                                                            : stressIncrease < 0
                                                            ? "bg-green-100 text-green-800"
                                                            : ""
                                                    }
                                                >
                                                    {stressIncrease > 0
                                                        ? "+"
                                                        : ""}
                                                    {stressIncrease.toFixed(1)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-lg font-medium mb-4 flex items-center">
                                    <Clock className="mr-2 h-5 w-5 text-blue-600" />{" "}
                                    Workload Analysis
                                </h3>

                                <div className="space-y-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                                        <h4 className="font-medium mb-2">
                                            Next Week Hours
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">
                                                    Teaching:
                                                </span>
                                                <Badge variant="outline">
                                                    {
                                                        scenario.input
                                                            .hours_distribution
                                                            .next_week
                                                            .teaching_hours
                                                    }
                                                    h
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">
                                                    Lab:
                                                </span>
                                                <Badge variant="outline">
                                                    {
                                                        scenario.input
                                                            .hours_distribution
                                                            .next_week.lab_hours
                                                    }
                                                    h
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">
                                                    Homework:
                                                </span>
                                                <Badge variant="outline">
                                                    {
                                                        scenario.input
                                                            .hours_distribution
                                                            .next_week
                                                            .homework_hours
                                                    }
                                                    h
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">
                                                    Assignments:
                                                </span>
                                                <Badge variant="outline">
                                                    {
                                                        scenario.input
                                                            .hours_distribution
                                                            .next_week
                                                            .assignment_hours
                                                    }
                                                    h
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center">
                                            <span className="font-medium">
                                                Total:
                                            </span>
                                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                                {nextWeekTotal}h
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <h4 className="font-medium mb-2">
                                            Assignment Schedule
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {scenario.input.assignments.map(
                                                (assignment) => (
                                                    <div
                                                        key={assignment.id}
                                                        className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                                                    >
                                                        <div>
                                                            <span className="font-medium">
                                                                Assignment{" "}
                                                                {assignment.id}
                                                            </span>
                                                            <div className="text-xs text-gray-500">
                                                                Weeks{" "}
                                                                {
                                                                    assignment.start_week
                                                                }
                                                                -
                                                                {
                                                                    assignment.end_week
                                                                }
                                                            </div>
                                                        </div>
                                                        <Badge>
                                                            {
                                                                assignment.hours_per_week
                                                            }
                                                            h/week
                                                        </Badge>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="bg-gray-50 dark:bg-gray-800/50 p-4 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
                    <div className="text-sm text-gray-500">
                        <span className="flex items-center">
                            <BarChart className="h-4 w-4 mr-1 text-indigo-500" />
                            Course stress analysis for{" "}
                            {scenario.input.current_status.current_week}/
                            {scenario.input.current_status.total_weeks} weeks
                        </span>
                    </div>
                    <Button variant="outline" size="sm">
                        Export Analysis
                    </Button>
                </CardFooter>
            </Card>

            {/* Include the floating chat component */}
            <FloatingScenarioChat scenario={scenario} kind="stress" />
        </div>
    );
}
