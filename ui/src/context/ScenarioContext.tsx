// ui/src/context/ScenarioContext.tsx

import { createContext } from "react";
import { Scenario } from "@/types";

/* This is the initial state of the ScenarioContext. But we no made it nullable underneath. 
export const ScenarioContext = createContext<Scenario>({
    scenarioId: 0,
    input: {
        tasks: {},
        constraints: []
    },
    output: {
        status: "infeasible"
    }
});
*/

export const ScenarioContext = createContext<Scenario | undefined>(undefined);
