// src/pages/ComparePage.tsx

import { Card, CardContent } from "@/components/ui/card";

const mockComparisonData = [
    {
        scenarioId: 1,
        status: "feasible",
        constraints: ["Max 6h/day", "Free afternoon"]
    },
    {
        scenarioId: 2,
        status: "infeasible",
        constraints: ["Max 5h/day", "Two free afternoons"]
    }
];

export default function ComparePage() {
    return (
        <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold">Compare Scenarios</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockComparisonData.map((scenario) => (
                    <Card key={scenario.scenarioId}>
                        <CardContent className="p-4 space-y-2">
                            <h2 className="font-semibold">
                                Scenario {scenario.scenarioId}
                            </h2>
                            <p className="text-sm">
                                <strong>Status:</strong>{" "}
                                <span
                                    className={
                                        scenario.status === "feasible"
                                            ? "text-green-600"
                                            : "text-red-500"
                                    }
                                >
                                    {scenario.status}
                                </span>
                            </p>
                            <ul className="list-disc list-inside text-sm">
                                {scenario.constraints.map((c, i) => (
                                    <li key={i}>{c}</li>
                                ))}
                            </ul>
                            <a
                                href={`/scheduler/${scenario.scenarioId}`}
                                className="text-primary underline text-sm"
                            >
                                View Schedule →
                            </a>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
