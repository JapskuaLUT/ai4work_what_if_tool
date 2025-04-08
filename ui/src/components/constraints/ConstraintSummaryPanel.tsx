import { Scenario } from "@/types";

interface ConstraintSummaryPanelProps {
    scenario: Scenario;
}

export function ConstraintSummaryPanel({
    scenario
}: ConstraintSummaryPanelProps) {
    return (
        <div className="border rounded-lg p-4 h-full overflow-auto">
            <h2 className="font-semibold mb-2">Constraints</h2>
            <ul className="list-disc pl-4 text-sm space-y-1">
                {scenario.input.constraints.map((constraint, idx) => (
                    <li key={idx}>{constraint}</li>
                ))}
            </ul>
        </div>
    );
}
