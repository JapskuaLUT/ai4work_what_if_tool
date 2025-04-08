// ui/src/pages/SchedulerPage.tsx

import { useParams } from "react-router-dom";
import { ScenarioLoader } from "@/components/scenario/ScenarioLoader";
import { ScenarioLayout } from "@/components/layouts/ScenarioLayout";
import { ConstraintSummaryPanel } from "@/components/constraints/ConstraintSummaryPanel";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { ExplanationPanel } from "@/components/explanation/ExplanationPanel";
import { AskLLMBox } from "@/components/explanation/AskLLMBox";

export default function SchedulerPage() {
    const { scenarioId } = useParams<{ scenarioId: string }>();

    return (
        <div className="p-6 space-y-4">
            <ScenarioLoader scenarioId={scenarioId || "1"}>
                <ScenarioLayout>
                    <ConstraintSummaryPanel />
                    <ScheduleView />
                    <ExplanationPanel />
                    <AskLLMBox />
                </ScenarioLayout>
            </ScenarioLoader>
        </div>
    );
}
