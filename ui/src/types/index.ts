export interface TaskBlock {
    time: string;
    task: string;
}

export interface ScheduleDay {
    day: string;
    timeBlocks: TaskBlock[];
}

export interface ScenarioInput {
    tasks: Record<string, string[] | number>; // lectures: ["Mon 9–11"], exercisesHours: 2
    constraints: string[];
}

export interface ScenarioOutput {
    status: "feasible" | "infeasible";
    schedule?: ScheduleDay[];
}

export interface Scenario {
    scenarioId: number;
    input: ScenarioInput;
    output: ScenarioOutput;
}
