export type ScenarioTasks = {
    lectures: string[];
    exercisesHours: number;
    projectHours: number;
    selfLearningHours: number;
};

export type ScenarioInput = {
    tasks: ScenarioTasks;
    constraints: string[];
};

export type TimeBlock = {
    time: string;
    task: string;
};

export type DaySchedule = {
    day: string;
    timeBlocks: TimeBlock[];
};

export type ScheduleOutput = {
    status: "feasible" | "infeasible";
    schedule: DaySchedule[];
};

export type Scenario = {
    scenarioId: number;
    description: string;
    input: ScenarioInput;
    output?: ScheduleOutput;
};

export type CourseworkPlan = {
    name: string;
    description: string;
    scenarios: Scenario[];
};
