// ui/src/components/explanation/ExplanationPanel.tsx
import { Scenario } from "@/types";

interface ExplanationPanelProps {
    scenario: Scenario;
}

export function ExplanationPanel({ scenario }: ExplanationPanelProps) {
    return (
        <div className="border rounded-lg p-4 h-full overflow-auto">
            <h2 className="font-semibold mb-2">Explanation</h2>

            {scenario.output.status === "infeasible" ? (
                <p className="text-red-500 text-sm">
                    This scenario is infeasible. Likely reasons include
                    conflicting constraints like overlapping time requirements
                    or exceeding daily hour limits.
                </p>
            ) : (
                <p className="text-sm whitespace-pre-line">
                    • The project was scheduled on Monday to optimize available
                    time.{"\n"}• Tuesday is free to satisfy the free afternoon
                    requirement.{"\n"}• No tasks overlap, satisfying all
                    constraints.
                </p>
            )}
        </div>
    );
}
