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
        (scenario.input.teachingTotalHours || 0) +
        (scenario.input.labTotalHours || 0) +
        (scenario.input.weeklyHomeworkHours || 0) +
        (scenario.assignments?.reduce((sum, a) => sum + a.hoursPerWeek, 0) ||
            0);

    // Calculate total remaining hours (assuming these are not directly provided by API for now, or need calculation)
    // For simplicity, let's use the same values as nextWeekTotal if not explicitly available
    const totalRemaining = nextWeekTotal; // Placeholder, adjust if backend provides this

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
                        {scenario.input.courseName} ({scenario.input.courseId})
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                                ECTS:
                            </span>
                            <Badge variant="outline" className="ml-2">
                                {scenario.input.ects}
                            </Badge>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                                Difficulty:
                            </span>
                            <Badge
                                variant={
                                    scenario.input.topicDifficulty > 7
                                        ? "destructive"
                                        : scenario.input.topicDifficulty > 5
                                        ? "secondary"
                                        : "outline"
                                }
                                className="ml-2"
                            >
                                {scenario.input.topicDifficulty}/10
                            </Badge>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                                Prerequisites:
                            </span>
                            <span
                                className={`ml-2 text-sm ${
                                    scenario.input.prerequisites
                                        ? "text-blue-600"
                                        : "text-gray-500"
                                }`}
                            >
                                {scenario.input.prerequisites
                                    ? "Required"
                                    : "None"}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                                Attendance:
                            </span>
                            <span className="ml-2 text-sm capitalize">
                                {scenario.input.attendanceMethod}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                                Students:
                            </span>
                            <span className="ml-2 text-sm">
                                {scenario.input.studentCount}
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
                                    scenario.input.successRatePercent > 75
                                        ? "outline"
                                        : "secondary"
                                }
                            >
                                {scenario.input.successRatePercent}%
                            </Badge>
                        </div>
                        <div className="flex items-center">
                            <span className="flex-1">Avg. Grade:</span>
                            <Badge variant="outline">
                                {scenario.input.averageGrade?.toFixed(1) ||
                                    "N/A"}
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
                            {scenario.input.teachingDays.join(", ")}{" "}
                            {scenario.input.teachingTime}
                        </div>
                        <div>
                            <span className="font-medium">Lab:</span>{" "}
                            {scenario.input.labDays.join(", ")}{" "}
                            {scenario.input.labTime}
                        </div>
                    </div>

                    <h4 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-2 mt-4">
                        <Code className="mr-2 h-4 w-4 text-green-600" />{" "}
                        Assignments
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {scenario.assignments?.map((assignment) => (
                            <div
                                key={assignment.assignmentId}
                                className="border rounded-md p-2 text-sm"
                            >
                                <div className="font-medium">
                                    Assignment {assignment.assignmentNumber}
                                </div>
                                <div className="text-xs text-gray-600">
                                    Weeks {assignment.startWeek}-
                                    {assignment.endWeek}
                                </div>
                                <Badge variant="secondary" className="mt-1">
                                    {assignment.hoursPerWeek} hours/week
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
                                    Progress: Week {scenario.input.currentWeek}{" "}
                                    of {scenario.input.totalWeeks}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-2 bg-purple-600 rounded-full"
                                    style={{
                                        width: `${
                                            (scenario.input.currentWeek /
                                                scenario.input.totalWeeks) *
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
                                    {scenario.stressMetrics?.currentWeekAverage?.toFixed(
                                        1
                                    ) || "N/A"}
                                    /10
                                </span>
                                <span>
                                    Max:{" "}
                                    {scenario.stressMetrics?.currentWeekMaximum?.toFixed(
                                        1
                                    ) || "N/A"}
                                    /10
                                </span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-2 rounded-full ${getStressColor(
                                        scenario.stressMetrics
                                            ?.currentWeekAverage || 0
                                    )}`}
                                    style={{
                                        width: `${
                                            (scenario.stressMetrics
                                                ?.currentWeekAverage || 0) * 10
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
                                            {scenario.input.teachingTotalHours}h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Lab Work:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {scenario.input.labTotalHours}h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Homework:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {scenario.input.weeklyHomeworkHours}
                                            h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Assignments:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {scenario.assignments?.reduce(
                                                (sum, a) =>
                                                    sum + a.hoursPerWeek,
                                                0
                                            ) || 0}
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
                                            {scenario.input.teachingTotalHours}h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Lab Work:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {scenario.input.labTotalHours}h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Homework:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {scenario.input.weeklyHomeworkHours}
                                            h
                                        </Badge>
                                    </div>
                                    <div className="text-sm">Assignments:</div>
                                    <div className="text-sm text-right">
                                        <Badge
                                            variant="outline"
                                            className="min-w-12 text-center"
                                        >
                                            {scenario.assignments?.reduce(
                                                (sum, a) =>
                                                    sum + a.hoursPerWeek,
                                                0
                                            ) || 0}
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
