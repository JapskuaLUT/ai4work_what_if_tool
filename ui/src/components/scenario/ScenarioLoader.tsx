// ui/src/components/scenario/ScenarioLoader.tsx
import { ReactNode, useEffect, useState } from "react";
import { Scenario } from "@/types";
import { ScenarioContext } from "@/context/ScenarioContext";

interface ScenarioLoaderProps {
    scenarioId: string;
    children: ReactNode;
}

export function ScenarioLoader({ scenarioId, children }: ScenarioLoaderProps) {
    const [scenario, setScenario] = useState<Scenario | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetch("/data/scenarios.json");
                const data = await res.json();
                const matched = data.scenarios.find(
                    (s: Scenario) => s.scenarioId.toString() === scenarioId
                );
                setScenario(matched ?? null);
            } catch (error) {
                console.error("Failed to load scenario:", error);
                setScenario(null);
            }
        }

        loadData();
    }, [scenarioId]);

    if (!scenario) {
        return <p className="text-center mt-10">Loading scenario...</p>;
    }

    return (
        <ScenarioContext.Provider value={scenario}>
            {children}
        </ScenarioContext.Provider>
    );
}
