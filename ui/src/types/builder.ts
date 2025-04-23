// ui/src/types/builder.ts

// Common plan interface with kind discriminator
export interface BasePlan {
    name: string;
    description: string;
    kind: "coursework" | "stress";
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

export interface CourseScenario {
    scenarioId: number;
    description: string;
    course_info: {
        course_name: string;
        course_id: string;
        teaching: {
            total_hours: number;
            days: string[];
            time: string;
        };
        lab: {
            total_hours: number;
            days: string[];
            time: string;
        };
        ects: number;
        topic_difficulty: number;
        prerequisites: boolean;
        weekly_homework_hours: number;
        total_weeks: number;
        attendance_method: string;
        success_rate_percent: number;
        average_grade: number;
    };
    assignments: {
        id: number;
        start_week: number;
        end_week: number;
        hours_per_week: number;
    }[];
    current_status: {
        current_week: number;
        total_weeks: number;
    };
    hours_distribution: {
        next_week: {
            teaching_hours: number;
            lab_hours: number;
            homework_hours: number;
            assignment_hours: number;
        };
        remaining: {
            teaching_hours: number;
            lab_hours: number;
            homework_hours: number;
            assignment_hours: number;
        };
    };
    students: {
        count: number;
    };
    stress_metrics: {
        current_week: {
            average: number;
            maximum: number;
        };
        predicted_next_week: {
            average: number;
            maximum: number;
        };
    };
}
