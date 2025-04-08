// src/components/schedule/ScenarioView.tsx

import { ScenarioLayout } from "@/components/layouts/ScenarioLayout";
import { ConstraintSummaryPanel } from "@/components/constraints/ConstraintSummaryPanel";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { ExplanationPanel } from "@/components/explanation/ExplanationPanel";
import { AskLLMBox } from "@/components/explanation/AskLLMBox";
import { Scenario } from "@/types";

interface ScenarioViewProps {
    scenario: Scenario;
}

export function ScenarioView({ scenario }: ScenarioViewProps) {
    return (
        <ScenarioLayout>
            <ConstraintSummaryPanel scenario={scenario} />
            <ScheduleView scenario={scenario} />
            <ExplanationPanel scenario={scenario} />
            <AskLLMBox scenario={scenario} />
        </ScenarioLayout>
    );
}
