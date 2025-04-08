// ui/src/components/builder/BuilderScenarioCard.tsx

import {
    BookOpen,
    Clock,
    Code,
    GraduationCap,
    AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BuilderScenario } from "@/types/builder";

type BuilderScenarioCardProps = {
    scenario: BuilderScenario;
};

export function BuilderScenarioCard({ scenario }: BuilderScenarioCardProps) {
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-2">
                            <BookOpen className="mr-2 h-4 w-4 text-blue-600" />{" "}
                            Lectures
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {scenario.input.tasks.lectures.map(
                                (lecture, idx) => (
                                    <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {lecture}
                                    </Badge>
                                )
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-indigo-600" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Exercise Hours:
                            </span>
                            <Badge variant="outline" className="ml-2">
                                {scenario.input.tasks.exercisesHours}
                            </Badge>
                        </div>

                        <div className="flex items-center">
                            <Code className="h-4 w-4 mr-2 text-indigo-600" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Project Hours:
                            </span>
                            <Badge variant="outline" className="ml-2">
                                {scenario.input.tasks.projectHours}
                            </Badge>
                        </div>

                        <div className="flex items-center">
                            <GraduationCap className="h-4 w-4 mr-2 text-indigo-600" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Self-learning Hours:
                            </span>
                            <Badge variant="outline" className="ml-2">
                                {scenario.input.tasks.selfLearningHours}
                            </Badge>
                        </div>
                    </div>
                </div>

                <Separator className="my-4" />

                <div>
                    <h3 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-2">
                        <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />{" "}
                        Constraints
                    </h3>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600 dark:text-gray-400">
                        {scenario.input.constraints.map((constraint, idx) => (
                            <li key={idx}>{constraint}</li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
