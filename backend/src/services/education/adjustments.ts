// backend/src/services/education/adjustments.ts
//
// §10 — the adjustment request contract, plus structural validation.
//
// Semantic validation (does this assignment exist? is this week in the past?)
// happens in simulate.ts where the course context is available. This module
// only checks that a request is *shaped* correctly, so the API can reject
// malformed bodies before any simulation work starts.

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

export const ADJUSTMENT_TYPES: AdjustmentType[] = [
    "cancel_lecture",
    "cancel_lab",
    "reduce_homework",
    "move_homework",
    "move_assignment",
    "update_assignment",
    "extend_assignment",
    "move_exam",
    "cancel_exam",
];

/** Adjustments that change assignments or exams, and therefore force a §3 rebuild. */
export const DOMAIN_ADJUSTMENT_TYPES: AdjustmentType[] = [
    "move_assignment",
    "update_assignment",
    "extend_assignment",
    "move_exam",
    "cancel_exam",
];

export interface AdjustmentBase {
    id: string;
    type: AdjustmentType;
    reason?: string;
}

export interface CancelLectureAdjustment extends AdjustmentBase {
    type: "cancel_lecture";
    source_week_index: number;
}

export interface CancelLabAdjustment extends AdjustmentBase {
    type: "cancel_lab";
    source_week_index: number;
}

export interface ReduceHomeworkAdjustment extends AdjustmentBase {
    type: "reduce_homework";
    source_week_index: number;
    hours: number;
}

export interface MoveHomeworkAdjustment extends AdjustmentBase {
    type: "move_homework";
    source_week_index: number;
    target_week_index: number;
    hours: number;
}

export interface MoveAssignmentAdjustment extends AdjustmentBase {
    type: "move_assignment";
    assignment_id: string;
    new_start_date: string;
    new_end_date: string;
}

export interface UpdateAssignmentAdjustment extends AdjustmentBase {
    type: "update_assignment";
    assignment_id: string;
    new_start_date?: string;
    new_end_date?: string;
    new_estimated_hours?: number;
}

export interface ExtendAssignmentAdjustment extends AdjustmentBase {
    type: "extend_assignment";
    assignment_id: string;
    new_end_date: string;
}

export interface MoveExamAdjustment extends AdjustmentBase {
    type: "move_exam";
    exam_id: string;
    new_date: string;
}

export interface CancelExamAdjustment extends AdjustmentBase {
    type: "cancel_exam";
    exam_id: string;
}

export type AdjustmentRequest =
    | CancelLectureAdjustment
    | CancelLabAdjustment
    | ReduceHomeworkAdjustment
    | MoveHomeworkAdjustment
    | MoveAssignmentAdjustment
    | UpdateAssignmentAdjustment
    | ExtendAssignmentAdjustment
    | MoveExamAdjustment
    | CancelExamAdjustment;

/** §12.9 — every request produces one of these. Nothing fails silently. */
export type AdjustmentStatus = "applied" | "partially_applied" | "rejected";

export interface AdjustmentOutcome {
    adjustment_id: string;
    type: AdjustmentType | "unknown";
    status: AdjustmentStatus;
    /** Machine-readable reason. "ok" on a clean apply. */
    code: string;
    message: string;
    reason?: string;
    details?: Record<string, unknown>;
}

export const OUTCOME_CODES = {
    OK: "ok",
    UNKNOWN_TYPE: "unknown_adjustment_type",
    MALFORMED: "malformed_adjustment",
    DUPLICATE_ID: "duplicate_adjustment_id",
    ASSIGNMENT_NOT_FOUND: "assignment_not_found",
    EXAM_NOT_FOUND: "exam_not_found",
    DOMAIN_UNAVAILABLE: "domain_objects_unavailable",
    WEEK_OUT_OF_RANGE: "week_out_of_range",
    WEEK_IN_PAST: "week_in_past",
    SAME_WEEK: "source_equals_target",
    NON_POSITIVE_HOURS: "non_positive_hours",
    NEGATIVE_HOURS: "negative_hours",
    INSUFFICIENT_HOMEWORK: "insufficient_homework",
    NO_LECTURE_HOURS: "no_lecture_hours",
    NO_LAB_HOURS: "no_lab_hours",
    INVALID_DATE: "invalid_date",
    DATE_OUTSIDE_SEMESTER: "date_outside_semester",
    START_AFTER_END: "start_after_end",
    EXTENSION_NOT_LATER: "extension_not_later",
    EXTENSION_LIMIT: "extension_limit_reached",
    NOTHING_TO_CHANGE: "nothing_to_change",
    PARTIAL_REDISTRIBUTION: "partial_redistribution",
} as const;

function isFiniteNumber(v: unknown): v is number {
    return typeof v === "number" && Number.isFinite(v);
}

function isNonEmptyString(v: unknown): v is string {
    return typeof v === "string" && v.trim().length > 0;
}

export interface ShapeValidation {
    valid: boolean;
    errors: string[];
}

/**
 * Structural check of one raw adjustment. Returns every problem found rather
 * than the first, so a caller fixing a payload sees the whole list at once.
 */
export function validateAdjustmentShape(raw: unknown): ShapeValidation {
    const errors: string[] = [];

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { valid: false, errors: ["adjustment is not an object"] };
    }
    const a = raw as Record<string, unknown>;

    if (!isNonEmptyString(a.id)) errors.push("id is required and must be a non-empty string");
    if (!ADJUSTMENT_TYPES.includes(a.type as AdjustmentType)) {
        errors.push(
            `unknown type "${String(a.type)}" (expected one of: ${ADJUSTMENT_TYPES.join(", ")})`
        );
        return { valid: false, errors };
    }
    if (a.reason !== undefined && typeof a.reason !== "string") {
        errors.push("reason must be a string when present");
    }

    const requireWeek = (field: string) => {
        if (!isFiniteNumber(a[field])) {
            errors.push(`${field} is required and must be a finite number`);
        } else if (!Number.isInteger(a[field] as number) || (a[field] as number) < 0) {
            errors.push(`${field} must be a non-negative integer week index`);
        }
    };
    const requireHours = (field: string) => {
        if (!isFiniteNumber(a[field])) {
            errors.push(`${field} is required and must be a finite number`);
        } else if ((a[field] as number) <= 0) {
            errors.push(`${field} must be greater than zero`);
        }
    };
    const requireDate = (field: string) => {
        if (!isNonEmptyString(a[field])) {
            errors.push(`${field} is required and must be an ISO date string`);
        } else if (Number.isNaN(new Date(a[field] as string).getTime())) {
            errors.push(`${field} "${String(a[field])}" is not a valid date`);
        }
    };
    const requireId = (field: string) => {
        if (!isNonEmptyString(a[field])) {
            errors.push(`${field} is required and must be a non-empty string`);
        }
    };

    switch (a.type as AdjustmentType) {
        case "cancel_lecture":
        case "cancel_lab":
            requireWeek("source_week_index");
            break;
        case "reduce_homework":
            requireWeek("source_week_index");
            requireHours("hours");
            break;
        case "move_homework":
            requireWeek("source_week_index");
            requireWeek("target_week_index");
            requireHours("hours");
            break;
        case "move_assignment":
            requireId("assignment_id");
            requireDate("new_start_date");
            requireDate("new_end_date");
            break;
        case "update_assignment": {
            requireId("assignment_id");
            const touched =
                a.new_start_date !== undefined ||
                a.new_end_date !== undefined ||
                a.new_estimated_hours !== undefined;
            if (!touched) {
                errors.push(
                    "update_assignment requires at least one of new_start_date, new_end_date, new_estimated_hours"
                );
            }
            if (a.new_start_date !== undefined) requireDate("new_start_date");
            if (a.new_end_date !== undefined) requireDate("new_end_date");
            if (a.new_estimated_hours !== undefined) {
                if (!isFiniteNumber(a.new_estimated_hours)) {
                    errors.push("new_estimated_hours must be a finite number");
                } else if ((a.new_estimated_hours as number) < 0) {
                    errors.push("new_estimated_hours must not be negative");
                }
            }
            break;
        }
        case "extend_assignment":
            requireId("assignment_id");
            requireDate("new_end_date");
            break;
        case "move_exam":
            requireId("exam_id");
            requireDate("new_date");
            break;
        case "cancel_exam":
            requireId("exam_id");
            break;
    }

    return { valid: errors.length === 0, errors };
}

/** True when this adjustment mutates assignments or exams (§6.4 step 2). */
export function isDomainAdjustment(adjustment: AdjustmentRequest): boolean {
    return DOMAIN_ADJUSTMENT_TYPES.includes(adjustment.type);
}
