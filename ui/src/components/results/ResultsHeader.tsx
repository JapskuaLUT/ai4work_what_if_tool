// ui/src/components/results/ResultsHeader.tsx

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle, XCircle, Activity } from "lucide-react";

type ResultsHeaderProps = {
    title: string;
    description: string;
    feasibleCount: number;
    infeasibleCount: number;
    planKind?: "coursework" | "stress";
};

export function ResultsHeader({
    title,
    description,
    feasibleCount,
    infeasibleCount,
    planKind = "coursework"
}: ResultsHeaderProps) {
    const isStressPlan = planKind === "stress";

    return (
        <Card className="shadow-sm dark:bg-gray-800 bg-white border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {title}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {description}
                        </p>
                        <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {isStressPlan ? (
                                <Badge variant="outline" className="mr-2">
                                    <Activity className="h-3 w-3 mr-1" /> Stress
                                    Analysis
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="mr-2">
                                    <CalendarDays className="h-3 w-3 mr-1" />{" "}
                                    Weekly Schedule
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-row md:flex-col gap-3 md:items-end">
                        <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                            <div>
                                <span className="text-gray-600 dark:text-gray-400 text-sm">
                                    {isStressPlan ? "Manageable:" : "Feasible:"}
                                </span>
                                <span className="font-bold ml-1">
                                    {feasibleCount}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <XCircle className="h-5 w-5 text-red-500 mr-2" />
                            <div>
                                <span className="text-gray-600 dark:text-gray-400 text-sm">
                                    {isStressPlan
                                        ? "High Stress:"
                                        : "Infeasible:"}
                                </span>
                                <span className="font-bold ml-1">
                                    {infeasibleCount}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
