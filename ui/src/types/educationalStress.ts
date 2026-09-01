// ui/src/types/educationalStress.ts

/**
 * Educational Stress Types - Frontend
 * Types for course stress analysis and optimization
 */

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

export interface Extension {
    extension_id: number;
    new_end_week: number;
    reason: string;
}

export interface AssignmentWeek {
    id: number;
    start_week: number;
    end_week: number;
    extensions: Extension[];
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
    stress_threshold_warning: number;
    stress_threshold_critical: number;
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
    adjustment_id: string;
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

// Helper types for UI components
export interface StressThresholds {
    warning: number;
    critical: number;
}

export interface ChartDataPoint {
    week: number;
    averageStress: number;
    maximumStress: number;
    adjusted: boolean;
}

export type AdjustmentStrategy = "minimal" | "balanced" | "aggressive" | "extension";

export interface ScenarioComparisonData {
    scenarioId: string;
    name: string;
    averageStress: number;
    peakStress: number;
    adjustedWeeks: number;
    stressReduction: number;
}

// ============================================================================
// course_stress_prediction v1.0
// ============================================================================
//
// The types above describe pre-v1.0 cases, which are still rendered by the
// legacy view. Everything below matches the shared stress model documented in
// specifications/education_stress/.

export interface StressModelConfig {
    name: string;
    version: string;
    minimum_stress: number;
    maximum_stress: number;
    actual_stress_blend: number;
    calibration_learning_rate: number;
    maximum_calibration_bias: number;
    fatigue_carry_over: number;
    soft_cap_softness: number;
}

/** Every intermediate value of the §4 equations, for one week. */
export interface StressComponents {
    teaching_load: number;
    independent_load: number;
    total_load: number;
    base: number;
    teaching: number;
    homework: number;
    assignment: number;
    exam: number;
    overload: number;
    fatigue: number;
    raw: number;
    soft_capped: number;
    schedule_only: number;
}

export interface WeekScheduleV1 {
    week_index: number;
    week_number: number;
    week_start: string;
    week_end: string;
    adjusted: boolean;
    lecture_hours: number;
    lab_hours: number;
    homework_hours: number;
    assignment_hours: number;
    exam_hours: number;
    actual_stress: number | null;
    adjustment_details: string[];
}

export interface AssignmentExtension {
    extension_id: string;
    new_end_week: number;
    reason: string;
    weeks_extended: number;
    scenario_id: string | null;
    created_at: string;
}

export interface CourseAssignment {
    assignment_id: string;
    name: string;
    start_date: string;
    end_date: string;
    estimated_hours: number;
    extensions: AssignmentExtension[];
}

export interface CourseExam {
    exam_id: string;
    name: string;
    date_time: string;
}

export interface CourseDefinition {
    course_name: string;
    course_id: string;
    start_date: string;
    end_date: string;
    topic_difficulty: number;
    total_homework_hours: number;
    course_sessions: Session[];
    lab_sessions: Session[];
    assignments: CourseAssignment[];
    exams: CourseExam[];
}

export type AdjustmentType =
    | "cancel_lecture"
    | "cancel_lab"
    | "reduce_homework"
    | "move_homework"
    | "move_assignment"
    | "update_assignment"
    | "extend_assignment"
    | "move_exam"
    | "cancel_exam";

export interface AdjustmentRequest {
    id: string;
    type: AdjustmentType;
    reason?: string;
    source_week_index?: number;
    target_week_index?: number;
    hours?: number;
    assignment_id?: string;
    new_start_date?: string;
    new_end_date?: string;
    new_estimated_hours?: number;
    exam_id?: string;
    new_date?: string;
}

export type AdjustmentStatus = "applied" | "partially_applied" | "rejected";

export interface AdjustmentOutcome {
    adjustment_id: string;
    type: AdjustmentType | "unknown";
    status: AdjustmentStatus;
    code: string;
    message: string;
    reason?: string;
    details?: Record<string, unknown>;
}

export interface RedistributionFlow {
    source_week_index: number;
    source_week_number: number;
    target_week_index: number;
    target_week_number: number;
    hours: number;
    workload_type: "lecture_hours" | "lab_hours";
    target_stress_before: number;
    target_stress_after: number;
    impact: number;
    objective: "local_week" | "trajectory_peak";
}

export interface AppliedExtensionRecord extends AssignmentExtension {
    assignment_id: string;
    original_end_week: number;
}

export interface TrajectorySummary {
    peak_stress: number;
    peak_week_index: number;
    peak_week_number: number;
    average_stress: number;
    total_stress: number;
    warning_week_indices: number[];
    warning_week_numbers: number[];
    critical_week_indices: number[];
    critical_week_numbers: number[];
    recovery_week_number: number | null;
    band_counts: { Low: number; Moderate: number; High: number };
}

export interface ObjectiveMetrics {
    peak_stress_delta: number;
    total_stress_delta: number;
    average_stress_delta: number;
    warning_week_delta: number;
    critical_week_delta: number;
    changed_event_count: number;
    moved_workload_hours: number;
    changed_week_count: number;
    improved: boolean;
}

export interface WeeklyResultSide {
    lecture_hours: number;
    lab_hours: number;
    homework_hours: number;
    assignment_hours: number;
    exam_hours: number;
    predicted_stress: number;
    classification: "Low" | "Moderate" | "High";
    components: StressComponents;
    calibration_bias: number;
}

export interface WeeklyResult {
    week_index: number;
    week_number: number;
    week_start: string;
    week_end: string;
    adjusted: boolean;
    adjustment_details: string[];
    actual_stress: number | null;
    baseline: WeeklyResultSide;
    simulation: WeeklyResultSide;
    stress_delta: number;
}

export interface ScenarioWarning {
    code: string;
    message: string;
    subject?: string;
}

export interface TrajectoryWeekResult {
    week_index: number;
    components: StressComponents;
    observed_stress: number | null;
    observed_applied: boolean;
    calibration_bias_in: number;
    calibration_bias_out: number;
    predicted_stress: number;
}

/** §11 — the full result of one what-if simulation. */
export interface ScenarioResult {
    scenario_id: string;
    created_at: string;
    name: string | null;
    description: string | null;
    origin: "generated" | "user";
    stress_model: StressModelConfig;
    stress_model_version: string;
    redistribution_objective: "local_week" | "trajectory_peak";
    known_limitations: string[];
    current_week_index: number;
    current_week_number: number;
    baseline: {
        week_schedules: WeekScheduleV1[];
        trajectory: TrajectoryWeekResult[];
        summary: TrajectorySummary;
    };
    simulation: {
        week_schedules: WeekScheduleV1[];
        trajectory: TrajectoryWeekResult[];
        summary: TrajectorySummary;
        assignments: CourseAssignment[];
        exams: CourseExam[];
    };
    adjustments: AdjustmentRequest[];
    adjustment_outcomes: AdjustmentOutcome[];
    applied_adjustment_ids: string[];
    partially_applied_adjustment_ids: string[];
    rejected_adjustment_ids: string[];
    redistribution_flows: RedistributionFlow[];
    extensions_applied: AppliedExtensionRecord[];
    objective: ObjectiveMetrics;
    warnings: ScenarioWarning[];
    weekly_results: WeeklyResult[];
}

/** A scenario as listed by GET /:caseId/scenarios. */
export interface ScenarioListEntry {
    scenario_id: string;
    origin: "generated" | "user";
    name: string | null;
    description: string | null;
    stress_model_version: string | null;
    summary_metrics: {
        peak_stress: number;
        peak_week_number: number;
        average_stress: number;
        total_adjustments_made: number;
        extensions_used: number;
        hours_redistributed: boolean;
        total_hours_maintained: boolean;
    } | null;
    comparison: {
        baseline: TrajectorySummary;
        simulation: TrajectorySummary;
        objective: ObjectiveMetrics;
        weekly_results: WeeklyResult[];
        known_limitations: string[];
        redistribution_objective: "local_week" | "trajectory_peak";
        current_week_index: number;
    } | null;
    created_at: string;
}

/** GET /:caseId for a v1 case. */
export interface EducationCaseV1 {
    name: string;
    description: string;
    stress_model: StressModelConfig | { version: string };
    course: CourseDefinition;
    course_assignments: CourseAssignment[];
    course_exams: CourseExam[];
    baseline_schedule: WeekScheduleV1[];
    observed_stress: Array<{
        week_start?: string;
        week_index?: number;
        week_number?: number;
        value: number;
    }>;
    current_status: { current_week_index: number; current_week_number: number };
    optimization_request: Record<string, unknown>;
    students: { count: number } | null;
    metadata: Metadata;
    scenarios: ScenarioListEntry[];
}
