// ui/src/hooks/useScenario.ts
import { useContext } from "react";
import { ScenarioContext } from "@/context/ScenarioContext";

export function useScenario() {
    const scenario = useContext(ScenarioContext);
    if (!scenario)
        throw new Error(
            "useScenario must be used within ScenarioContext.Provider"
        );
    return scenario;
}
