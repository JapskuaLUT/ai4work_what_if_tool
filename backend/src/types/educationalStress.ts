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
    weeks_extended: number; // Calculated field for clarity
    applied_in_scenario?: string; // Track which scenario applied this
}

/**
 * Tracks details of an assignment deadline extension
 * Used to record which assignments were extended and by how much
 */
export interface ExtensionApplication {
    assignment_id: number;
    original_end_week: number;
    new_end_week: number;
    weeks_extended: number;
    reason: string;
    homework_hours_affected: number; // How many hours were redistributed
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
    extension_applied?: ExtensionApplication; // Link week changes to extensions
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
    assignment_weeks?: AssignmentWeek[]; // Modified assignments with extensions
    extensions_applied?: ExtensionApplication[]; // Track all extensions applied
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

/**
 * The output replaces `week_schedules` with one entry per adjustment scenario,
 * so the field has to be omitted from the base before being redeclared.
 */
export interface CourseAnalysisOutput
    extends Omit<CourseAnalysisInput, "week_schedules"> {
    week_schedules: AdjustmentScenario[];
}

export interface SimulationStartResponse {
    caseId: string;
    resultsUrl: string;
}

// ============================================================================
// course_stress_prediction v1.0
// ============================================================================
//
// Everything below belongs to the shared stress model described in
// specifications/education_stress/. The legacy types above are retained for
// simulations stored before v1.0 (`stress_model.version === "legacy-0"`), which
// are still rendered by the original StressCalculator and are never recomputed.

export type {
    StressModelConfig,
    WeeklyLoad,
    WeekStressComponents,
    TrajectoryWeekInput,
    TrajectoryWeekResult,
    CourseSession,
    CourseAssignment,
    CourseExam,
    CourseDefinition,
    WeekScheduleV1,
    AssignmentExtension,
    ScheduleBuildWarning,
} from "../services/stressModel";

export type {
    AdjustmentRequest,
    AdjustmentType,
    AdjustmentOutcome,
    AdjustmentStatus,
    RedistributionFlow,
    RedistributionObjective,
    ObservedStressEntry,
    SimulationOptions,
    ScenarioContext,
    ScenarioMeta,
    ScenarioResult,
    ScenarioWarning,
    AppliedExtensionRecord,
    TrajectorySummary,
    ObjectiveMetrics,
    WeeklyResult,
} from "../services/education";

/**
 * §9 — the v1 creation payload. `week_schedules` is optional: when the main
 * application has already built the schedule we take it as the baseline and
 * diff it against our own rebuild; otherwise we build it from the course.
 */
export interface EducationSimulationV1Input {
    name: string;
    description?: string;
    course: import("../services/stressModel").CourseDefinition;
    week_schedules?: import("../services/stressModel").WeekScheduleV1[];
    observed_stress?: import("../services/education").ObservedStressEntry[];
    current_status: {
        current_week_index?: number;
        current_week_number?: number;
    };
    optimization_request?: Partial<OptimizationRequest> & {
        redistribution_objective?: import("../services/education").RedistributionObjective;
        allow_past_week_changes?: boolean;
    };
    students?: { count: number };
    metadata?: Metadata;
}

/** §10 — the body of POST /:caseId/scenarios. */
export interface ScenarioCreateInput {
    name?: string;
    description?: string;
    adjustments: import("../services/education").AdjustmentRequest[];
    options?: Partial<import("../services/education").SimulationOptions>;
}
