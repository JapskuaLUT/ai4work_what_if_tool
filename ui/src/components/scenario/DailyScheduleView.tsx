// ui/src/components/scenario/DailyScheduleView.tsx

import { DaySchedule } from "@/types/scenario";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DailyScheduleViewProps = {
    day: DaySchedule;
};

export function DailyScheduleView({ day }: DailyScheduleViewProps) {
    // Define time blocks for visualization (from 8:00 to 19:00)
    const timeBlocks = [
        "8:00",
        "9:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00"
    ];

    // Function to determine the position and width of schedule items
    const calculatePosition = (timeRange: string) => {
        const [startStr, endStr] = timeRange.split("–");

        // Parse times (handle both formats: "9" and "9:30")
        let startHour = startStr.includes(":")
            ? parseFloat(startStr.split(":")[0]) +
              parseFloat(startStr.split(":")[1]) / 60
            : parseFloat(startStr);

        let endHour = endStr.includes(":")
            ? parseFloat(endStr.split(":")[0]) +
              parseFloat(endStr.split(":")[1]) / 60
            : parseFloat(endStr);

        // Calculate position relative to our timeline (8:00-19:00)
        const startPosition = ((startHour - 8) / 11) * 100;
        const width = ((endHour - startHour) / 11) * 100;

        return { startPosition, width };
    };

    // Get color for different task types
    const getTaskColor = (task: string) => {
        switch (task) {
            case "Lecture":
                return "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300";
            case "Exercises":
                return "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300";
            case "Project":
                return "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300";
            case "Self-learning":
                return "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300";
            default:
                return "bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900/30 dark:border-gray-700 dark:text-gray-300";
        }
    };

    return (
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{day.day}</h4>
                    <Badge variant="outline" className="text-xs">
                        {day.timeBlocks.length} tasks
                    </Badge>
                </div>

                {/* Timeline visualization */}
                <div className="mt-4 relative">
                    {/* Timeline markers */}
                    <div className="grid grid-cols-12 mb-1">
                        {timeBlocks.map((time, idx) => (
                            <div
                                key={idx}
                                className="text-xs text-gray-500 text-center"
                            >
                                {idx % 2 === 0 ? time : ""}
                            </div>
                        ))}
                    </div>

                    {/* Timeline ruler */}
                    <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded relative mb-3">
                        {timeBlocks.map((_, idx) => (
                            <div
                                key={idx}
                                className="absolute top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-700"
                                style={{ left: `${(idx / 12) * 100}%` }}
                            />
                        ))}
                    </div>

                    {/* Tasks on timeline */}
                    <div className="relative h-16">
                        {day.timeBlocks.map((block, idx) => {
                            const { startPosition, width } = calculatePosition(
                                block.time
                            );

                            return (
                                <div
                                    key={idx}
                                    className={`absolute rounded px-2 py-1 text-xs border ${getTaskColor(
                                        block.task
                                    )} flex items-center justify-center`}
                                    style={{
                                        left: `${startPosition}%`,
                                        width: `${width}%`,
                                        height: "30px",
                                        top: idx % 2 === 0 ? 0 : "35px",
                                        minWidth: "40px"
                                    }}
                                >
                                    {width > 10 ? block.task : ""}
                                </div>
                            );
                        })}
                    </div>

                    {/* Task list for small screens */}
                    <div className="mt-4 md:hidden">
                        <ul className="space-y-1">
                            {day.timeBlocks.map((block, idx) => (
                                <li
                                    key={idx}
                                    className="text-sm flex justify-between"
                                >
                                    <span className="font-medium">
                                        {block.time}
                                    </span>
                                    <Badge
                                        className={getTaskColor(
                                            block.task
                                        ).replace("bg-", "border-")}
                                        variant="outline"
                                    >
                                        {block.task}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
