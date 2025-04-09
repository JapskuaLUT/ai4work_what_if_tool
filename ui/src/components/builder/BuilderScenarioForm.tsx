// ui/src/components/builder/BuilderScenarioForm.tsx

import { useState } from "react";
import {
    BookOpen,
    Clock,
    Code,
    GraduationCap,
    AlertTriangle,
    Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BuilderScenario } from "@/types/builder";

type BuilderScenarioFormProps = {
    onAddScenario: (scenario: BuilderScenario) => void;
};

export function BuilderScenarioForm({
    onAddScenario
}: BuilderScenarioFormProps) {
    const [newScenario, setNewScenario] = useState<BuilderScenario>({
        scenarioId: Date.now(),
        description: "",
        input: {
            tasks: {
                lectures: [],
                exercisesHours: 0,
                projectHours: 0,
                selfLearningHours: 0
            },
            constraints: []
        }
    });

    const handleSubmit = () => {
        // Validate form
        if (!newScenario.description) {
            alert("Please add a scenario description");
            return;
        }

        // Call the parent handler to add the scenario
        onAddScenario(newScenario);

        // Reset form
        setNewScenario({
            scenarioId: Date.now(),
            description: "",
            input: {
                tasks: {
                    lectures: [],
                    exercisesHours: 0,
                    projectHours: 0,
                    selfLearningHours: 0
                },
                constraints: []
            }
        });
    };

    const resetForm = () => {
        setNewScenario({
            scenarioId: Date.now(),
            description: "",
            input: {
                tasks: {
                    lectures: [],
                    exercisesHours: 0,
                    projectHours: 0,
                    selfLearningHours: 0
                },
                constraints: []
            }
        });
    };

    return (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-2xl font-semibold flex items-center mb-6">
                <Plus className="mr-2 h-5 w-5 text-green-600" /> Add New
                Scenario
            </h2>

            <div className="space-y-6">
                <div>
                    <Label htmlFor="description" className="text-base">
                        Description
                    </Label>
                    <Input
                        id="description"
                        placeholder="E.g., Balanced workload with morning lectures"
                        value={newScenario.description}
                        onChange={(e) =>
                            setNewScenario({
                                ...newScenario,
                                description: e.target.value
                            })
                        }
                        className="mt-1"
                    />
                </div>

                <div>
                    <Label
                        htmlFor="lectures"
                        className="text-base flex items-center"
                    >
                        <BookOpen className="mr-2 h-4 w-4 text-blue-600" />{" "}
                        Lectures (comma separated)
                    </Label>
                    <Input
                        id="lectures"
                        placeholder="E.g., Mon 9-11, Tue 10-12, Wed 14-16"
                        value={newScenario.input.tasks.lectures.join(", ")}
                        onChange={(e) =>
                            setNewScenario({
                                ...newScenario,
                                input: {
                                    ...newScenario.input,
                                    tasks: {
                                        ...newScenario.input.tasks,
                                        lectures: e.target.value
                                            .split(",")
                                            .map((l) => l.trim())
                                            .filter((l) => l)
                                    }
                                }
                            })
                        }
                        className="mt-1"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <Label
                            htmlFor="exerciseHours"
                            className="text-base flex items-center"
                        >
                            <Clock className="mr-2 h-4 w-4 text-indigo-600" />{" "}
                            Exercise Hours
                        </Label>
                        <Input
                            id="exerciseHours"
                            type="number"
                            min="0"
                            value={newScenario.input.tasks.exercisesHours}
                            onChange={(e) =>
                                setNewScenario({
                                    ...newScenario,
                                    input: {
                                        ...newScenario.input,
                                        tasks: {
                                            ...newScenario.input.tasks,
                                            exercisesHours: Number(
                                                e.target.value
                                            )
                                        }
                                    }
                                })
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label
                            htmlFor="projectHours"
                            className="text-base flex items-center"
                        >
                            <Code className="mr-2 h-4 w-4 text-indigo-600" />{" "}
                            Project Hours
                        </Label>
                        <Input
                            id="projectHours"
                            type="number"
                            min="0"
                            value={newScenario.input.tasks.projectHours}
                            onChange={(e) =>
                                setNewScenario({
                                    ...newScenario,
                                    input: {
                                        ...newScenario.input,
                                        tasks: {
                                            ...newScenario.input.tasks,
                                            projectHours: Number(e.target.value)
                                        }
                                    }
                                })
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label
                            htmlFor="selfLearningHours"
                            className="text-base flex items-center"
                        >
                            <GraduationCap className="mr-2 h-4 w-4 text-indigo-600" />{" "}
                            Self-learning Hours
                        </Label>
                        <Input
                            id="selfLearningHours"
                            type="number"
                            min="0"
                            value={newScenario.input.tasks.selfLearningHours}
                            onChange={(e) =>
                                setNewScenario({
                                    ...newScenario,
                                    input: {
                                        ...newScenario.input,
                                        tasks: {
                                            ...newScenario.input.tasks,
                                            selfLearningHours: Number(
                                                e.target.value
                                            )
                                        }
                                    }
                                })
                            }
                            className="mt-1"
                        />
                    </div>
                </div>

                <div>
                    <Label
                        htmlFor="constraints"
                        className="text-base flex items-center"
                    >
                        <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />{" "}
                        Constraints (one per line)
                    </Label>
                    <Textarea
                        id="constraints"
                        placeholder="E.g., Max 6 hours per day&#10;At least one free afternoon&#10;No work after 18:00"
                        rows={4}
                        value={newScenario.input.constraints.join("\n")}
                        onChange={(e) =>
                            setNewScenario({
                                ...newScenario,
                                input: {
                                    ...newScenario.input,
                                    constraints: e.target.value
                                        .split("\n")
                                        .map((l) => l.trim())
                                        .filter((l) => l)
                                }
                            })
                        }
                        className="mt-1"
                    />
                </div>

                <div className="flex justify-end space-x-4 pt-2">
                    <Button variant="outline" onClick={resetForm}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Scenario
                    </Button>
                </div>
            </div>
        </section>
    );
}
