// ui/src/components/builder/BuilderScenarioList.tsx

import { ListChecks, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BuilderScenario } from "@/types/builder";
import { BuilderScenarioCard } from "./BuilderScenarioCard";

type BuilderScenarioListProps = {
    scenarios: BuilderScenario[];
};

export function BuilderScenarioList({ scenarios }: BuilderScenarioListProps) {
    if (scenarios.length === 0) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-blue-500 mb-2" />
                <h3 className="text-lg font-semibold text-blue-800">
                    No scenarios yet
                </h3>
                <p className="text-blue-600 mb-4">
                    Create your first scenario using the form below
                </p>
            </div>
        );
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold flex items-center">
                    <ListChecks className="mr-2 h-5 w-5 text-blue-600" />{" "}
                    Existing Scenarios
                </h2>
                <Badge variant="outline" className="text-sm">
                    {scenarios.length} total
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                {scenarios.map((scenario) => (
                    <BuilderScenarioCard
                        key={scenario.scenarioId}
                        scenario={scenario}
                    />
                ))}
            </div>
        </section>
    );
}
