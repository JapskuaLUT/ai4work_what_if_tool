// ui/src/components/stress/WeeklyScheduleTable.tsx

import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowUp,
    ArrowDown,
    ArrowRight,
    AlertTriangle,
    CheckCircle,
} from "lucide-react";
import type {
    WeekSchedule,
    StressThresholds,
} from "@/types/educationalStress";
import {
    getStressColor,
    formatStress,
} from "@/services/educationalStressService";

type WeeklyScheduleTableProps = {
    weekSchedules: WeekSchedule[];
    thresholds: StressThresholds;
    showAdjustedOnly?: boolean;
};

type SortField = "week" | "stress" | "hours" | "adjusted";
type SortDirection = "asc" | "desc";

export function WeeklyScheduleTable({
    weekSchedules,
    thresholds,
    showAdjustedOnly = false,
}: WeeklyScheduleTableProps) {
    const [sortField, setSortField] = useState<SortField>("week");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    // Filter weeks if needed
    const filteredWeeks = showAdjustedOnly
        ? weekSchedules.filter((w) => w.adjusted)
        : weekSchedules;

    // Sort weeks
    const sortedWeeks = [...filteredWeeks].sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
            case "week":
                comparison = a.week_number - b.week_number;
                break;
            case "stress":
                comparison =
                    (a.stress_metrics?.average_stress || 0) -
                    (b.stress_metrics?.average_stress || 0);
                break;
            case "hours":
                const totalA =
                    a.teaching_hours + a.lab_hours + a.homework_hours;
                const totalB =
                    b.teaching_hours + b.lab_hours + b.homework_hours;
                comparison = totalA - totalB;
                break;
            case "adjusted":
                comparison = a.adjusted === b.adjusted ? 0 : a.adjusted ? 1 : -1;
                break;
        }

        return sortDirection === "asc" ? comparison : -comparison;
    });

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === "asc" ? (
            <ArrowUp className="inline h-4 w-4 ml-1" />
        ) : (
            <ArrowDown className="inline h-4 w-4 ml-1" />
        );
    };

    const getStressStatus = (stress: number) => {
        if (stress >= thresholds.critical) {
            return { icon: AlertTriangle, color: "text-red-600", label: "Critical" };
        }
        if (stress >= thresholds.warning) {
            return { icon: AlertTriangle, color: "text-yellow-600", label: "Warning" };
        }
        return { icon: CheckCircle, color: "text-green-600", label: "Safe" };
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">
                    Weekly Schedule Breakdown
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th
                                    className="text-left p-3 cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleSort("week")}
                                >
                                    Week <SortIcon field="week" />
                                </th>
                                <th
                                    className="text-left p-3 cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleSort("adjusted")}
                                >
                                    Status <SortIcon field="adjusted" />
                                </th>
                                <th
                                    className="text-right p-3 cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleSort("stress")}
                                >
                                    Avg Stress <SortIcon field="stress" />
                                </th>
                                <th className="text-right p-3">Max Stress</th>
                                <th className="text-right p-3">Teaching</th>
                                <th className="text-right p-3">Lab</th>
                                <th className="text-right p-3">Homework</th>
                                <th
                                    className="text-right p-3 cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleSort("hours")}
                                >
                                    Total <SortIcon field="hours" />
                                </th>
                                <th className="text-left p-3">Changes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedWeeks.map((week) => {
                                const avgStress =
                                    week.stress_metrics?.average_stress || 0;
                                const maxStress =
                                    week.stress_metrics?.maximum_stress || 0;
                                const totalHours =
                                    week.teaching_hours +
                                    week.lab_hours +
                                    week.homework_hours;
                                const status = getStressStatus(avgStress);
                                const StatusIcon = status.icon;

                                const bgColor = week.adjusted
                                    ? "bg-purple-50 hover:bg-purple-100"
                                    : "hover:bg-gray-50";

                                return (
                                    <tr
                                        key={week.week_number}
                                        className={`border-b border-gray-100 ${bgColor} transition-colors`}
                                    >
                                        <td className="p-3 font-medium">
                                            Week {week.week_number}
                                        </td>
                                        <td className="p-3">
                                            {week.adjusted ? (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-purple-100 text-purple-800 border-purple-300"
                                                >
                                                    Adjusted
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-gray-100 text-gray-600"
                                                >
                                                    Original
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end">
                                                <StatusIcon
                                                    className={`h-4 w-4 mr-1 ${status.color}`}
                                                />
                                                <span
                                                    className={getStressColor(
                                                        avgStress,
                                                        thresholds
                                                    )}
                                                >
                                                    {formatStress(avgStress)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span
                                                className={getStressColor(
                                                    maxStress,
                                                    thresholds
                                                )}
                                            >
                                                {formatStress(maxStress)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            {week.teaching_hours}h
                                        </td>
                                        <td className="p-3 text-right">
                                            {week.lab_hours}h
                                        </td>
                                        <td className="p-3 text-right">
                                            {week.adjusted &&
                                            week.optimization_changes ? (
                                                <div className="flex items-center justify-end">
                                                    <span className="text-gray-400 line-through mr-2">
                                                        {
                                                            week
                                                                .optimization_changes
                                                                .original_homework_hours
                                                        }
                                                        h
                                                    </span>
                                                    <ArrowRight className="h-3 w-3 text-gray-400 mr-2" />
                                                    <span className="font-medium text-purple-600">
                                                        {week.homework_hours}h
                                                    </span>
                                                </div>
                                            ) : (
                                                <span>{week.homework_hours}h</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right font-medium">
                                            {totalHours.toFixed(1)}h
                                        </td>
                                        <td className="p-3 text-xs text-gray-600 max-w-xs">
                                            {week.optimization_changes
                                                ? week.optimization_changes
                                                      .change_reason
                                                : "-"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Summary Statistics */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">
                            Total Weeks
                        </p>
                        <p className="text-2xl font-bold">
                            {sortedWeeks.length}
                        </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">
                            Adjusted Weeks
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                            {sortedWeeks.filter((w) => w.adjusted).length}
                        </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">
                            Avg Stress
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                            {formatStress(
                                sortedWeeks.reduce(
                                    (sum, w) =>
                                        sum +
                                        (w.stress_metrics?.average_stress || 0),
                                    0
                                ) / sortedWeeks.length
                            )}
                        </p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">
                            Peak Stress
                        </p>
                        <p className="text-2xl font-bold text-red-600">
                            {formatStress(
                                Math.max(
                                    ...sortedWeeks.map(
                                        (w) =>
                                            w.stress_metrics?.maximum_stress ||
                                            0
                                    )
                                )
                            )}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
