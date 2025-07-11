// ui/src/components/builder/BuilderScenarioList.tsx

import { BuilderScenarioCard } from "@/components/builder/BuilderScenarioCard";
import { BuilderStressScenarioCard } from "@/components/builder/BuilderStressScenarioCard";
import { BuilderScenario, CourseScenario } from "@/types/builder";

type BuilderScenarioListProps = {
    scenarios: (BuilderScenario | CourseScenario)[];
    kind: "coursework" | "stress";
};

export function BuilderScenarioList({
    scenarios,
    kind
}: BuilderScenarioListProps) {
    if (!scenarios.length) {
        return (
            <div className="text-center py-12 border border-dashed rounded-lg bg-gray-50 dark:bg-gray-800">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    No scenarios yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Add your first scenario using the form below.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Scenarios
            </h2>
            <div className="grid grid-cols-1 gap-6">
                {scenarios.map((scenario) =>
                    kind === "stress" ? (
                        <BuilderStressScenarioCard
                            key={scenario.scenarioId}
                            scenario={scenario as CourseScenario}
                        />
                    ) : (
                        <BuilderScenarioCard
                            key={scenario.scenarioId}
                            scenario={scenario as BuilderScenario}
                        />
                    )
                )}
            </div>
        </div>
    );
}
