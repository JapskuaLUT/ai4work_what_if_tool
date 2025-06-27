// ui/src/types/builder.ts

export type PlanKind = "coursework" | "stress";

// Common plan interface with kind discriminator
export interface BasePlan {
    name: string;
    description: string;
    kind: PlanKind;
}

export type BuilderTasks = {
    lectures: string[];
    exercisesHours: number;
    projectHours: number;
    selfLearningHours: number;
};

export type BuilderScenarioInput = {
    tasks: BuilderTasks;
    constraints: string[];
};

export type BuilderScenario = {
    scenarioId: number;
    description: string;
    input: BuilderScenarioInput;
    output?: {
        status: "feasible" | "infeasible";
        schedule?: Array<{
            day: string;
            timeBlocks: Array<{
                time: string;
                task: string;
            }>;
        }>;
    };
};

import { ScenarioInput } from "./scenario";

export interface CourseScenario {
    scenarioId: number;
    description: string;
    input: ScenarioInput;
    assignments: {
        id: number;
        startWeek: number;
        endWeek: number;
        hoursPerWeek: number;
    }[];
    stressMetrics: {
        currentWeekAverage: number;
        currentWeekMaximum: number;
        predictedNextWeekAverage: number;
        predictedNextWeekMaximum: number;
    };
}

// Union type for any plan
export type Plan = CourseworkPlan | StressPlan;

// Original coursework types
export interface CourseworkPlan extends BasePlan {
    kind: "coursework";
    scenarios: BuilderScenario[];
}

// New stress scenario types
export interface StressPlan extends BasePlan {
    kind: "stress";
    scenarios: CourseScenario[];
}
