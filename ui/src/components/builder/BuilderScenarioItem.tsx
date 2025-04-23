// ui/src/components/builder/BuilderScenarioItem.tsx

import { BuilderScenarioCard } from "@/components/builder/BuilderScenarioCard";
import { BuilderStressScenarioCard } from "@/components/builder/BuilderStressScenarioCard";

type BuilderScenarioItemProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scenario: any; // Using any here as we need to support different scenario types
    kind: "coursework" | "stress";
};

export function BuilderScenarioItem({
    scenario,
    kind
}: BuilderScenarioItemProps) {
    // Render the appropriate card based on the scenario kind
    if (kind === "stress") {
        return <BuilderStressScenarioCard scenario={scenario} />;
    }

    // Default to the original coursework card
    return <BuilderScenarioCard scenario={scenario} />;
}
