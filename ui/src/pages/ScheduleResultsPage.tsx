import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ComparisonView } from "@/components/scenario/ComparisonView";
import { ScenarioView } from "@/components/scenario/ScenarioView";
import { useState, useEffect } from "react";
import { Scenario } from "@/types";
import { useParams } from "react-router-dom";

export default function ScheduleResultsPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const [activeTab, setActiveTab] = useState("compare");
    const [scenarios, setScenarios] = useState<Scenario[]>([]);

    useEffect(() => {
        async function fetchScenarios() {
            try {
                const res = await fetch(`/data/${projectId}.json`);
                const json = await res.json();
                setScenarios(json.scenarios);
            } catch (err) {
                console.error("Failed to load scenarios.json", err);
            }
        }

        fetchScenarios();
    }, []);

    return (
        <div className="max-w-screen-xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Schedule Results</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="compare">Comparison</TabsTrigger>
                    {scenarios.map((s) => (
                        <TabsTrigger
                            key={s.scenarioId}
                            value={s.scenarioId.toString()}
                        >
                            Scenario {s.scenarioId}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="compare">
                    <ComparisonView scenarios={scenarios} />
                </TabsContent>

                {scenarios.map((s) => (
                    <TabsContent
                        key={s.scenarioId}
                        value={s.scenarioId.toString()}
                    >
                        <ScenarioView scenario={s} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
