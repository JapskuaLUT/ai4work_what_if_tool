export type ScenarioInput = {
    description: string;
    courseName: string;
    courseId: string;
    teachingTotalHours: number;
    teachingDays: string[];
    teachingTime: string;
    labTotalHours: number;
    labDays: string[];
    labTime: string;
    ects: number;
    topicDifficulty: number;
    prerequisites: boolean;
    weeklyHomeworkHours: number;
    totalWeeks: number;
    attendanceMethod: "in_person" | "online" | "hybrid" | "self_paced";
    successRatePercent: number;
    averageGrade: number;
    studentCount: number;
    currentWeek: number;
    createdAt?: string;
    updatedAt?: string;
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
