// ui/src/components/builder/BuilderStressScenarioCard.tsx

import { BookOpen, Clock, Code, Calendar, Activity, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { CourseScenario } from "@/types/builder";

type BuilderStressScenarioCardProps = {
    scenario: CourseScenario;
};

export function BuilderStressScenarioCard({
    scenario
}: BuilderStressScenarioCardProps) {
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

    // Helper function to determine stress color
    const getStressColor = (value: number) => {
        if (value < 4) return "bg-green-500";
        if (value < 7) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-gray-900 dark:text-gray-100">
                        Scenario {scenario.scenarioId}
                    </CardTitle>
                </div>
                <CardDescription className="font-medium">
                    {scenario.description}
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
                <div className="mb-4">
                    <h3 className="text-base font-semibold flex items-center text-gray-800 dark:text-gray-200 mb-2">
                        <BookOpen className="mr-2 h-5 w-5 text-blue-600" />{" "}
                        {scenario.input.course_info.course_name} (
                        {scenario.input.course_info.course_id})
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                                ECTS:
                            </span>
                            <Badge variant="outline" className="ml-2">
                                {scenario.input.course_info.ects}
                            </Badge>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                                Difficulty:
                            </span>
                            <Badge
                                variant={
                                    scenario.input.course_info
                                        .topic_difficulty > 7
                                        ? "destructive"
                                        : scenario.input.course_info
                                              .topic_difficulty > 5
                                        ? "secondary"
                                        : "outline"
                                }
                                className="ml-2"
                            >
                                {scenario.input.course_info.topic_difficulty}/10
                            </Badge>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                                Prerequisites:
                            </span>
                            <span
                                className={`ml-2 text-sm ${
                                    scenario.input.course_info.prerequisites
                                        ? "text-blue-600"
                                        : "text-gray-500"
                                }`}
                            >
                                {scenario.input.course_info.prerequisites
                                    ? "Required"
                                    : "None"}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                                Attendance:
                            </span>
                            <span className="ml-2 text-sm capitalize">
                                {scenario.input.course_info.attendance_method}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                                Students:
                            </span>
                            <span className="ml-2 text-sm">
                                {scenario.input.students.count}
                            </span>
                        </div>
                    </div>
                </div>

                <Separator className="my-4" />

                {/* Performance Stats */}
                <div className="mb-4">
                    <h3 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-2">
                        <Award className="mr-2 h-4 w-4 text-indigo-600" />{" "}
                        Performance Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                            <span className="flex-1">Success Rate:</span>
                            <Badge
                                variant={
                                    scenario.input.course_info
                                        .success_rate_percent > 75
                                        ? "outline"
                                        : "secondary"
                                }
                            >
                                {
                                    scenario.input.course_info
                                        .success_rate_percent
                                }
                                %
                            </Badge>
                        </div>
                        <div className="flex items-center">
                            <span className="flex-1">Avg. Grade:</span>
                            <Badge variant="outline">
                                {scenario.input.course_info.average_grade.toFixed(
                                    1
                                )}
                                /4.0
                            </Badge>
                        </div>
                    </div>
                </div>

                <Separator className="my-4" />

                {/* Course Overview - Schedule */}
                <div className="mb-4">
                    <h3 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-2">
                        <Calendar className="mr-2 h-4 w-4 text-indigo-600" />{" "}
                        Course Schedule
                    </h3>
                    <div className="space-y-2 text-sm mb-3">
                        <div>
                            <span className="font-medium">Teaching:</span>{" "}
                            {scenario.input.course_info.teaching.days.join(
                                ", "
                            )}{" "}
                            {scenario.input.course_info.teaching.time}
                        </div>
                        <div>
                            <span className="font-medium">Lab:</span>{" "}
                            {scenario.input.course_info.lab.days.join(", ")}{" "}
                            {scenario.input.course_info.lab.time}
                        </div>
                    </div>

                    <h4 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-2 mt-4">
                        <Code className="mr-2 h-4 w-4 text-green-600" />{" "}
                        Assignments
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {scenario.input.assignments.map((assignment) => (
                            <div
                                key={assignment.id}
                                className="border rounded-md p-2 text-sm"
                            >
                                <div className="font-medium">
                                    Assignment {assignment.id}
                                </div>
                                <div className="text-xs text-gray-600">
                                    Weeks {assignment.start_week}-
                                    {assignment.end_week}
                                </div>
                                <Badge variant="secondary" className="mt-1">
                                    {assignment.hours_per_week} hours/week
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>

                <Separator className="my-4" />

                {/* Current Status - Progress and Stress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <h3 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-2">
                            <Clock className="mr-2 h-4 w-4 text-purple-600" />{" "}
                            Current Progress
                        </h3>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span>
                                    Progress: Week{" "}
                                    {scenario.input.current_status.current_week}{" "}
                                    of{" "}
                                    {scenario.input.current_status.total_weeks}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-2 bg-purple-600 rounded-full"
                                    style={{
                                        width: `${
                                            (scenario.input.current_status
                                                .current_week /
                                                scenario.input.current_status
                                                    .total_weeks) *
                                            100
                                        }%`
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-2">
                            <Activity className="mr-2 h-4 w-4 text-amber-600" />{" "}
                            Current Week Stress
                        </h3>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span>
                                    Average:{" "}
                                    {scenario.output.stress_metrics.current_week.average.toFixed(
                                        1
                                    )}
                                    /10
                                </span>
                                <span>
                                    Max:{" "}
                                    {scenario.output.stress_metrics.current_week.maximum.toFixed(
                                        1
                                    )}
                                    /10
                                </span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-2 rounded-full ${getStressColor(
                                        scenario.output.stress_metrics
                                            .current_week.average
                                    )}`}
                                    style={{
                                        width: `${
                                            scenario.output.stress_metrics
                                                .current_week.average * 10
                                        }%`
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="my-4" />

                {/* Remaining Course Workload */}
                <div className="mb-4">
                    <h3 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-3">
                        <Clock className="mr-2 h-4 w-4 text-purple-600" />{" "}
                        Remaining Course Workload
                    </h3>
                    <div className="bg-slate-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-3">
                                <div className="grid grid-cols-2 gap-y-2">
                                    <div className="text-sm">Teaching:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {
                                                scenario.input
                                                    .hours_distribution
                                                    .remaining.teaching_hours
                                            }
                                            h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Lab Work:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {
                                                scenario.input
                                                    .hours_distribution
                                                    .remaining.lab_hours
                                            }
                                            h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Homework:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {
                                                scenario.input
                                                    .hours_distribution
                                                    .remaining.homework_hours
                                            }
                                            h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Assignments:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {
                                                scenario.input
                                                    .hours_distribution
                                                    .remaining.assignment_hours
                                            }
                                            h
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-1 flex items-center justify-center border-l border-gray-200 dark:border-gray-700 pl-2">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">
                                        Total Remaining
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="text-lg px-3 py-1"
                                    >
                                        {totalRemaining}h
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="my-4" />

                {/* Next Week Workload */}
                <div>
                    <h3 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-3">
                        <Clock className="mr-2 h-4 w-4 text-blue-600" /> Next
                        Week Workload
                    </h3>
                    <div className="bg-blue-50 dark:bg-gray-800/50 rounded-lg p-3 border border-blue-100 dark:border-gray-700">
                        <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-3">
                                <div className="grid grid-cols-2 gap-y-2">
                                    <div className="text-sm">Teaching:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {
                                                scenario.input
                                                    .hours_distribution
                                                    .next_week.teaching_hours
                                            }
                                            h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Lab Work:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {
                                                scenario.input
                                                    .hours_distribution
                                                    .next_week.lab_hours
                                            }
                                            h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Homework:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {
                                                scenario.input
                                                    .hours_distribution
                                                    .next_week.homework_hours
                                            }
                                            h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Assignments:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {
                                                scenario.input
                                                    .hours_distribution
                                                    .next_week.assignment_hours
                                            }
                                            h
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-1 flex items-center justify-center border-l border-gray-200 dark:border-gray-700 pl-2">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">
                                        Total Hours
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="text-lg px-3 py-1"
                                    >
                                        {nextWeekTotal}h
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
