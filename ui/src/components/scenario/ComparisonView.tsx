// src/components/schedule/ComparisonView.tsx

import { Card, CardContent } from "@/components/ui/card";
import { Scenario } from "@/types";

interface ComparisonViewProps {
    scenarios: Scenario[];
}

export function ComparisonView({ scenarios }: ComparisonViewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scenarios.map((scenario) => (
                <Card key={scenario.scenarioId}>
                    <CardContent className="p-4 space-y-2">
                        <h2 className="font-semibold">
                            Scenario {scenario.scenarioId}
                        </h2>
                        <p className="text-sm">
                            <strong>Status:</strong>{" "}
                            <span
                                className={
                                    scenario.output.status === "feasible"
                                        ? "text-green-600"
                                        : "text-red-500"
                                }
                            >
                                {scenario.output.status}
                            </span>
                        </p>
                        <ul className="list-disc list-inside text-sm">
                            {scenario.input.constraints.map((c, i) => (
                                <li key={i}>{c}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
