// ui/src/components/results/ResultsHeader.tsx

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Calendar, Info } from "lucide-react";

type ResultsHeaderProps = {
    title: string;
    description: string;
    feasibleCount: number;
    infeasibleCount: number;
};

export function ResultsHeader({
    title,
    description,
    feasibleCount,
    infeasibleCount
}: ResultsHeaderProps) {
    const totalScenarios = feasibleCount + infeasibleCount;
    const feasiblePercentage =
        totalScenarios > 0
            ? Math.round((feasibleCount / totalScenarios) * 100)
            : 0;

    return (
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-none shadow-md overflow-hidden">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {title}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                            {description}
                        </p>

                        <div className="flex items-center space-x-3 text-sm text-gray-500 pt-2">
                            <Badge
                                variant="outline"
                                className="flex items-center gap-1 pl-1.5"
                            >
                                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                <span>Scenarios: {totalScenarios}</span>
                            </Badge>

                            <Badge
                                variant="outline"
                                className="flex items-center gap-1 pl-1.5"
                            >
                                <Info className="h-3.5 w-3.5 text-purple-500" />
                                <span>Results Analysis</span>
                            </Badge>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mr-3">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Feasible
                                </p>
                                <p className="text-lg font-bold">
                                    {feasibleCount}{" "}
                                    <span className="text-sm font-normal text-gray-500">
                                        ({feasiblePercentage}%)
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900 mr-3">
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Infeasible
                                </p>
                                <p className="text-lg font-bold">
                                    {infeasibleCount}{" "}
                                    <span className="text-sm font-normal text-gray-500">
                                        ({100 - feasiblePercentage}%)
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
