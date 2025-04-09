// ui/src/components/builder/BuilderPageHeader.tsx

import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

type PageHeaderProps = {
    title: string;
    description: string;
    scenarioCount: number;
};

export function BuilderPageHeader({
    title,
    description,
    scenarioCount
}: PageHeaderProps) {
    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
                {description}
            </p>

            <div className="flex items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                <Badge variant="outline" className="mr-2">
                    {scenarioCount}{" "}
                    {scenarioCount === 1 ? "scenario" : "scenarios"}
                </Badge>
                <CalendarDays className="h-4 w-4 mr-1" /> Weekly Schedule
                Builder
            </div>
        </header>
    );
}
