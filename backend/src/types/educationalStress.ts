// backend/src/types/educationalStress.ts

/**
 * Educational Stress Calculation Types
 * Types for course stress analysis and optimization
 */

export interface StressFactors {
    workloadHours: number; // Total hours per week (teaching + lab + homework)
    assignmentDeadlines: number; // Number of concurrent deadlines this week
    topicDifficulty: number; // 1-5 scale
    hasPrerequisites: boolean; // Course prerequisite status
    attendanceMethod: "Physical" | "Online" | "Hybrid" | "self_paced";
    currentWeek: number; // Week in semester
    totalWeeks: number; // Total semester weeks
    studentExperience?: number; // Optional: student year level
}

export interface WeeklyStressMetrics {
    baseWorkloadStress: number; // Stress from hours alone
    deadlineStress: number; // Stress from deadlines
    difficultyStress: number; // Stress from topic complexity
    cumulativeStress: number; // Accumulated stress over time
    averageStress: number; // Average across student population
    maximumStress: number; // Peak stress level (99th percentile)
    stressDistribution: number[]; // Distribution across student cohort
}

export interface Session {
    day: string;
    start_time: string;
    end_time: string;
}

export interface CourseInfo {
    course_name: string;
    course_id: string;
    teaching_hours: number;
    lab_hours: number;
    ects: number;
    topic_difficulty: number; // 1-5
    has_prerequisites: boolean;
    total_homework_hours: number;
    total_weeks: number;
    total_assignments: number;
    attendance_method: "Physical" | "Online" | "Hybrid";
    success_rate_percent: number | null;
    average_grade: number | null;
    course_sessions: Session[];
    lab_sessions: Session[];
}

export interface AssignmentWeek {
    id: number;
    start_week: number;
    end_week: number;
    extensions: Extension[];
}

export interface Extension {
    extension_id: number;
    new_end_week: number;
    reason: string;
}

export interface CurrentStatus {
    current_week: number;
    latest_adjusted_week: number;
}

export interface StressMetrics {
    average_stress: number;
    maximum_stress: number;
}

export interface OptimizationChanges {
    original_homework_hours: number;
    original_teaching_hours: number;
    original_lab_hours: number;
    hours_redistributed: boolean;
    change_reason: string;
}

export interface WeekSchedule {
    week_number: number;
    adjusted: boolean;
    teaching_hours: number;
    lab_hours: number;
    homework_hours: number;
    stress_metrics?: StressMetrics;
    optimization_changes?: OptimizationChanges;
}

export interface OptimizationRequest {
    optimization_target: string;
    stress_threshold_warning: number; // e.g., 75.0
    stress_threshold_critical: number; // e.g., 85.0
    allow_extensions: boolean;
    max_extensions_per_assignment: number;
    consider_all_remaining_weeks: boolean;
}

export interface Metadata {
    created_at: string;
    creator_id: string;
    semester_id: string;
}

export interface CourseAnalysisInput {
    name: string;
    description: string;
    course_info: CourseInfo;
    assignment_weeks: AssignmentWeek[];
    current_status: CurrentStatus;
    week_schedules: WeekSchedule[];
    optimization_request: OptimizationRequest;
    students: { count: number };
    metadata: Metadata;
}

export interface AdjustmentScenario {
    adjustment_id: string; // "adjustment_1", "adjustment_2", etc.
    week_schedules: WeekSchedule[];
}

export interface OptimizationSummary {
    stress_reduction_achieved: number;
    learning_outcomes_maintained: boolean;
    total_adjustments_made: number;
    extensions_used: number;
    hours_redistributed: boolean;
    total_hours_maintained: boolean;
}

export interface AdjustmentDetail {
    adjustment_id: string;
    name: string;
    feasibility_score: number;
    key_changes: string;
    peak_stress: number;
    total_hours_maintained: boolean;
    optimization_summary: OptimizationSummary;
    week_schedules: WeekSchedule[];
}

export interface CourseAnalysisOutput extends CourseAnalysisInput {
    week_schedules: AdjustmentScenario[];
}

export interface SimulationStartResponse {
    caseId: string;
    resultsUrl: string;
}
