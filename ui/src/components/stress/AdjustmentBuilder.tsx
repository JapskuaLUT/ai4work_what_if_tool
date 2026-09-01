// ui/src/components/stress/AdjustmentBuilder.tsx
//
// Compose a what-if by hand: pick adjustments against weeks, assignments and
// exams, then simulate. This is the first place the tool lets a user *author*
// a scenario rather than choose among generated ones.
//
// Validation is deliberately light here. The engine reports the outcome of
// every adjustment individually (§12.9), so a request that is wrong in one
// place still returns a useful comparison plus a precise reason — much more
// helpful than a form that refuses to submit.

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Play, AlertTriangle } from "lucide-react";
import type {
    AdjustmentRequest,
    AdjustmentType,
    CourseAssignment,
    CourseExam,
    WeekScheduleV1,
} from "@/types/educationalStress";
import {
    adjustmentTypeLabel,
    describeAdjustment,
    formatDate,
} from "@/services/educationalStressService";

type Props = {
    weeks: WeekScheduleV1[];
    assignments: CourseAssignment[];
    exams: CourseExam[];
    currentWeekIndex: number;
    isRunning: boolean;
    onSimulate: (
        name: string,
        adjustments: AdjustmentRequest[],
        objective: "local_week" | "trajectory_peak"
    ) => void;
};

const WEEK_TYPES: AdjustmentType[] = [
    "cancel_lecture",
    "cancel_lab",
    "reduce_homework",
    "move_homework",
];
const ASSIGNMENT_TYPES: AdjustmentType[] = [
    "move_assignment",
    "update_assignment",
    "extend_assignment",
];
const EXAM_TYPES: AdjustmentType[] = ["move_exam", "cancel_exam"];

const select =
    "w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700";

export function AdjustmentBuilder({
    weeks,
    assignments,
    exams,
    currentWeekIndex,
    isRunning,
    onSimulate,
}: Props) {
    const [scenarioName, setScenarioName] = useState("");
    const [objective, setObjective] = useState<"local_week" | "trajectory_peak">(
        "local_week"
    );
    const [pending, setPending] = useState<AdjustmentRequest[]>([]);
    const [type, setType] = useState<AdjustmentType>("move_homework");
    const [draft, setDraft] = useState<Partial<AdjustmentRequest>>({
        source_week_index: currentWeekIndex,
        target_week_index: Math.min(currentWeekIndex + 1, weeks.length - 1),
        hours: 2,
        assignment_id: assignments[0]?.assignment_id,
        exam_id: exams[0]?.exam_id,
    });
    const [formError, setFormError] = useState<string | null>(null);

    const availableTypes = [
        ...WEEK_TYPES,
        ...(assignments.length > 0 ? ASSIGNMENT_TYPES : []),
        ...(exams.length > 0 ? EXAM_TYPES : []),
    ];

    const needs = (field: string): boolean => {
        switch (type) {
            case "cancel_lecture":
            case "cancel_lab":
                return field === "source_week_index";
            case "reduce_homework":
                return field === "source_week_index" || field === "hours";
            case "move_homework":
                return (
                    field === "source_week_index" ||
                    field === "target_week_index" ||
                    field === "hours"
                );
            case "move_assignment":
                return (
                    field === "assignment_id" ||
                    field === "new_start_date" ||
                    field === "new_end_date"
                );
            case "update_assignment":
                return (
                    field === "assignment_id" ||
                    field === "new_start_date" ||
                    field === "new_end_date" ||
                    field === "new_estimated_hours"
                );
            case "extend_assignment":
                return field === "assignment_id" || field === "new_end_date";
            case "move_exam":
                return field === "exam_id" || field === "new_date";
            case "cancel_exam":
                return field === "exam_id";
            default:
                return false;
        }
    };

    const addAdjustment = () => {
        setFormError(null);
        const id = `adj-${String(pending.length + 1).padStart(3, "0")}`;
        const next: AdjustmentRequest = { id, type, reason: draft.reason || undefined };

        for (const field of [
            "source_week_index",
            "target_week_index",
            "hours",
            "assignment_id",
            "new_start_date",
            "new_end_date",
            "new_estimated_hours",
            "exam_id",
            "new_date",
        ] as const) {
            if (!needs(field)) continue;
            const value = (draft as Record<string, unknown>)[field];
            if (value === undefined || value === "" || value === null) {
                // update_assignment only needs one of its optional fields.
                if (type === "update_assignment") continue;
                setFormError(`"${field.replace(/_/g, " ")}" is required for ${adjustmentTypeLabel(type)}.`);
                return;
            }
            (next as unknown as Record<string, unknown>)[field] = value;
        }

        if (
            type === "update_assignment" &&
            next.new_start_date === undefined &&
            next.new_end_date === undefined &&
            next.new_estimated_hours === undefined
        ) {
            setFormError(
                "Update assignment needs at least one of: new start date, new end date, estimated hours."
            );
            return;
        }

        setPending([...pending, next]);
    };

    const weekLabel = (w: WeekScheduleV1) =>
        `Week ${w.week_number}${w.week_index < currentWeekIndex ? " (past)" : ""}`;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Build a what-if</CardTitle>
                    <p className="text-sm text-gray-500">
                        Adjustments are applied in a fixed order: assignment and exam
                        changes first, then the weekly schedule is rebuilt, then
                        lecture, lab and homework changes. That ordering is what stops
                        a rebuild from quietly discarding a week-level edit.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="adj-type">Adjustment</Label>
                            <select
                                id="adj-type"
                                className={select}
                                value={type}
                                onChange={(e) => {
                                    setType(e.target.value as AdjustmentType);
                                    setFormError(null);
                                }}
                            >
                                {availableTypes.map((t) => (
                                    <option key={t} value={t}>
                                        {adjustmentTypeLabel(t)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {needs("source_week_index") && (
                            <div>
                                <Label htmlFor="src">From week</Label>
                                <select
                                    id="src"
                                    className={select}
                                    value={draft.source_week_index}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            source_week_index: Number(e.target.value),
                                        })
                                    }
                                >
                                    {weeks.map((w) => (
                                        <option key={w.week_index} value={w.week_index}>
                                            {weekLabel(w)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {needs("target_week_index") && (
                            <div>
                                <Label htmlFor="tgt">To week</Label>
                                <select
                                    id="tgt"
                                    className={select}
                                    value={draft.target_week_index}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            target_week_index: Number(e.target.value),
                                        })
                                    }
                                >
                                    {weeks.map((w) => (
                                        <option key={w.week_index} value={w.week_index}>
                                            {weekLabel(w)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {needs("hours") && (
                            <div>
                                <Label htmlFor="hours">Hours</Label>
                                <Input
                                    id="hours"
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={draft.hours ?? ""}
                                    onChange={(e) =>
                                        setDraft({ ...draft, hours: Number(e.target.value) })
                                    }
                                />
                            </div>
                        )}

                        {needs("assignment_id") && (
                            <div>
                                <Label htmlFor="assignment">Assignment</Label>
                                <select
                                    id="assignment"
                                    className={select}
                                    value={draft.assignment_id}
                                    onChange={(e) =>
                                        setDraft({ ...draft, assignment_id: e.target.value })
                                    }
                                >
                                    {assignments.map((a) => (
                                        <option key={a.assignment_id} value={a.assignment_id}>
                                            {a.name} ({formatDate(a.start_date)} –{" "}
                                            {formatDate(a.end_date)}, {a.estimated_hours}h)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {needs("exam_id") && (
                            <div>
                                <Label htmlFor="exam">Exam</Label>
                                <select
                                    id="exam"
                                    className={select}
                                    value={draft.exam_id}
                                    onChange={(e) =>
                                        setDraft({ ...draft, exam_id: e.target.value })
                                    }
                                >
                                    {exams.map((x) => (
                                        <option key={x.exam_id} value={x.exam_id}>
                                            {x.name} ({formatDate(x.date_time)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {needs("new_start_date") && (
                            <div>
                                <Label htmlFor="start">
                                    New start date
                                    {type === "update_assignment" && " (optional)"}
                                </Label>
                                <Input
                                    id="start"
                                    type="date"
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            new_start_date: e.target.value
                                                ? `${e.target.value}T00:00:00Z`
                                                : undefined,
                                        })
                                    }
                                />
                            </div>
                        )}

                        {needs("new_end_date") && (
                            <div>
                                <Label htmlFor="end">
                                    New end date
                                    {type === "update_assignment" && " (optional)"}
                                </Label>
                                <Input
                                    id="end"
                                    type="date"
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            new_end_date: e.target.value
                                                ? `${e.target.value}T23:59:59Z`
                                                : undefined,
                                        })
                                    }
                                />
                            </div>
                        )}

                        {needs("new_date") && (
                            <div>
                                <Label htmlFor="newdate">New exam date</Label>
                                <Input
                                    id="newdate"
                                    type="date"
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            new_date: e.target.value
                                                ? `${e.target.value}T09:00:00Z`
                                                : undefined,
                                        })
                                    }
                                />
                            </div>
                        )}

                        {needs("new_estimated_hours") && (
                            <div>
                                <Label htmlFor="est">Estimated hours (optional)</Label>
                                <Input
                                    id="est"
                                    type="number"
                                    min={0}
                                    step={1}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            new_estimated_hours:
                                                e.target.value === ""
                                                    ? undefined
                                                    : Number(e.target.value),
                                        })
                                    }
                                />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <Label htmlFor="reason">Reason</Label>
                            <Input
                                id="reason"
                                placeholder="Why are you making this change?"
                                value={draft.reason ?? ""}
                                onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                            />
                        </div>
                    </div>

                    {formError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{formError}</AlertDescription>
                        </Alert>
                    )}

                    <Button onClick={addAdjustment} variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Add adjustment
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        Scenario ({pending.length}{" "}
                        {pending.length === 1 ? "adjustment" : "adjustments"})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pending.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            Nothing queued yet. Add at least one adjustment, or simulate
                            an empty list to reproduce the baseline.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {pending.map((a, i) => (
                                <li
                                    key={a.id}
                                    className="flex items-center justify-between gap-3 border rounded-md p-3 border-gray-200 dark:border-gray-700"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{a.id}</Badge>
                                            <span className="font-medium">
                                                {adjustmentTypeLabel(a.type)}
                                            </span>
                                            <span className="text-sm text-gray-500 truncate">
                                                {describeAdjustment(a)}
                                            </span>
                                        </div>
                                        {a.reason && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {a.reason}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setPending(pending.filter((_, j) => j !== i))
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="scenario-name">Scenario name</Label>
                            <Input
                                id="scenario-name"
                                placeholder="Move the exam off week 11"
                                value={scenarioName}
                                onChange={(e) => setScenarioName(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="objective">Redistribution rule</Label>
                            <select
                                id="objective"
                                className={select}
                                value={objective}
                                onChange={(e) =>
                                    setObjective(
                                        e.target.value as "local_week" | "trajectory_peak"
                                    )
                                }
                            >
                                <option value="local_week">
                                    Local week — matches the main application
                                </option>
                                <option value="trajectory_peak">
                                    Whole trajectory — minimises peak stress
                                </option>
                            </select>
                        </div>
                    </div>

                    <Button
                        onClick={() =>
                            onSimulate(
                                scenarioName || "Untitled what-if",
                                pending,
                                objective
                            )
                        }
                        disabled={isRunning}
                    >
                        <Play className="mr-2 h-4 w-4" />
                        {isRunning ? "Simulating…" : "Simulate"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
