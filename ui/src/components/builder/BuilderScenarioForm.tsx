// ui/src/components/builder/BuilderScenarioForm.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

type BuilderScenarioFormProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onAddScenario: (scenario: any) => void;
    scenarioType: "coursework" | "stress";
};

export function BuilderScenarioForm({
    onAddScenario,
    scenarioType
}: BuilderScenarioFormProps) {
    const [isFormVisible, setIsFormVisible] = useState(false);

    // Create an empty form state for the specified scenario type
    const getEmptyFormState = () => {
        if (scenarioType === "stress") {
            return {
                scenarioId: Date.now(),
                description: "",
                course_info: {
                    course_name: "",
                    course_id: "",
                    teaching: {
                        total_hours: 24,
                        days: ["Monday", "Wednesday"],
                        time: "10:00-12:00"
                    },
                    lab: {
                        total_hours: 12,
                        days: ["Tuesday"],
                        time: "14:00-16:00"
                    },
                    ects: 6,
                    topic_difficulty: 5,
                    prerequisites: false,
                    weekly_homework_hours: 4,
                    total_weeks: 12,
                    attendance_method: "hybrid",
                    success_rate_percent: 75.0,
                    average_grade: 3.0
                },
                assignments: [
                    {
                        id: 1,
                        start_week: 3,
                        end_week: 5,
                        hours_per_week: 4
                    }
                ],
                current_status: {
                    current_week: 3,
                    total_weeks: 12
                },
                hours_distribution: {
                    next_week: {
                        teaching_hours: 4,
                        lab_hours: 2,
                        homework_hours: 4,
                        assignment_hours: 4
                    },
                    remaining: {
                        teaching_hours: 36,
                        lab_hours: 18,
                        homework_hours: 36,
                        assignment_hours: 36
                    }
                },
                students: {
                    count: 50
                },
                stress_metrics: {
                    current_week: {
                        average: 5.0,
                        maximum: 7.0
                    },
                    predicted_next_week: {
                        average: 5.5,
                        maximum: 7.5
                    }
                }
            };
        } else {
            // Default coursework scenario template
            return {
                scenarioId: Date.now(),
                description: "",
                input: {
                    tasks: {
                        lectures: ["Mon 9–11", "Wed 14–16"],
                        exercisesHours: 4,
                        projectHours: 6,
                        selfLearningHours: 4
                    },
                    constraints: [
                        "Max 6 hours per day",
                        "At least one free afternoon",
                        "No overlapping tasks"
                    ]
                }
            };
        }
    };

    const [formState, setFormState] = useState(getEmptyFormState());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddScenario(formState);
        setFormState(getEmptyFormState());
        setIsFormVisible(false);
    };

    const updateFormField = (field: string, value: string) => {
        setFormState((prev) => {
            if (scenarioType === "stress") {
                return { ...prev, [field]: value };
            } else {
                return { ...prev, [field]: value };
            }
        });
    };

    if (!isFormVisible) {
        return (
            <Button
                onClick={() => setIsFormVisible(true)}
                className="w-full py-8 border-dashed border-2"
                variant="outline"
            >
                <Plus className="mr-2 h-5 w-5" />
                Add New {scenarioType === "stress"
                    ? "Course"
                    : "Coursework"}{" "}
                Scenario
            </Button>
        );
    }

    return (
        <Card className="border-2 border-blue-200 dark:border-blue-900">
            <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                <CardTitle>
                    New {scenarioType === "stress" ? "Course" : "Coursework"}{" "}
                    Scenario
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">
                            Scenario Description
                        </Label>
                        <Textarea
                            id="description"
                            value={formState.description}
                            onChange={(e) =>
                                updateFormField("description", e.target.value)
                            }
                            placeholder={`Describe your ${
                                scenarioType === "stress"
                                    ? "course"
                                    : "coursework"
                            } scenario...`}
                            required
                        />
                    </div>

                    {scenarioType === "stress" ? (
                        <>
                            {/* Course Info Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="courseName">
                                        Course Name
                                    </Label>
                                    <Input
                                        id="courseName"
                                        value={
                                            formState.course_info
                                                ?.course_name || ""
                                        }
                                        onChange={(e) =>
                                            setFormState({
                                                ...formState,
                                                course_info: {
                                                    ...formState.course_info,
                                                    course_name: e.target.value
                                                }
                                            })
                                        }
                                        placeholder="e.g., Introduction to Computer Science"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="courseId">Course ID</Label>
                                    <Input
                                        id="courseId"
                                        value={
                                            formState.course_info?.course_id ||
                                            ""
                                        }
                                        onChange={(e) =>
                                            setFormState({
                                                ...formState,
                                                course_info: {
                                                    ...formState.course_info,
                                                    course_id: e.target.value
                                                }
                                            })
                                        }
                                        placeholder="e.g., CS101"
                                        required
                                    />
                                </div>
                            </div>

                            {/* More course-specific fields would go here */}
                            {/* This is simplified for brevity */}
                        </>
                    ) : (
                        <>
                            {/* Original coursework fields would go here */}
                            <div className="space-y-2">
                                <Label htmlFor="lectures">
                                    Lectures (comma separated)
                                </Label>
                                <Input
                                    id="lectures"
                                    value={
                                        formState.input?.tasks?.lectures?.join(
                                            ", "
                                        ) || ""
                                    }
                                    onChange={(e) => {
                                        const lectures = e.target.value
                                            .split(",")
                                            .map((l) => l.trim());
                                        setFormState({
                                            ...formState,
                                            input: {
                                                ...formState.input,
                                                tasks: {
                                                    ...formState.input.tasks,
                                                    lectures
                                                }
                                            }
                                        });
                                    }}
                                    placeholder="e.g., Mon 9-11, Wed 14-16"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end space-x-4 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsFormVisible(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">Add Scenario</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
