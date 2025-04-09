// ui/src/types/builder.ts

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
};

export type CourseworkPlan = {
    name: string;
    description: string;
    scenarios: BuilderScenario[];
};
