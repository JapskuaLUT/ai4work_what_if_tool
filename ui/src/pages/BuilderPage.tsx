import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Tasks = {
    lectures: string[];
    exercisesHours: number;
    projectHours: number;
    selfLearningHours: number;
};

type ScenarioInput = {
    tasks: Tasks;
    constraints: string[];
};

type Scenario = {
    scenarioId: number;
    description: string;
    input: ScenarioInput;
    output: { status: string };
};

type CourseworkPlan = {
    name: string;
    description: string;
    scenarios: Scenario[];
};

export default function BuilderPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const [plan, setPlan] = useState<CourseworkPlan | null>(null);
    const navigate = useNavigate();
    const [newScenario, setNewScenario] = useState<Scenario>({
        scenarioId: Date.now(), // simple unique ID
        description: "",
        input: {
            tasks: {
                lectures: [],
                exercisesHours: 0,
                projectHours: 0,
                selfLearningHours: 0
            },
            constraints: []
        },
        output: { status: "feasible" }
    });

    useEffect(() => {
        async function fetchPlan() {
            const res = await fetch(`/data/${projectId}.json`);
            const data = await res.json();
            setPlan(data);
        }

        fetchPlan();
    }, []);

    const addScenario = () => {
        if (!plan) return;
        const updatedScenarios = [...plan.scenarios, newScenario];
        setPlan({ ...plan, scenarios: updatedScenarios });

        // reset form
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
            },
            output: { status: "feasible" }
        });
    };

    if (!plan) return <div className="p-4">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-10">
            <header>
                <h1 className="text-3xl font-bold">{plan.name}</h1>
                <p className="text-gray-600">{plan.description}</p>
                <Button
                    className="mt-4"
                    onClick={() => {
                        navigate(`/results/${projectId}`);
                    }}
                >
                    Run Scenarios
                </Button>
            </header>

            <section className="space-y-6">
                <h2 className="text-2xl font-semibold">Existing Scenarios</h2>
                {plan.scenarios.map((s) => (
                    <Card key={s.scenarioId}>
                        <CardHeader>
                            <CardTitle>
                                Scenario {s.scenarioId}: {s.description}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Status: <strong>{s.output.status}</strong>
                            </p>
                        </CardHeader>
                        <CardContent>
                            <p>
                                <strong>Lectures:</strong>{" "}
                                {s.input.tasks.lectures.join(", ")}
                            </p>
                            <p>
                                <strong>Exercise Hours:</strong>{" "}
                                {s.input.tasks.exercisesHours}
                            </p>
                            <p>
                                <strong>Project Hours:</strong>{" "}
                                {s.input.tasks.projectHours}
                            </p>
                            <p>
                                <strong>Self-learning Hours:</strong>{" "}
                                {s.input.tasks.selfLearningHours}
                            </p>
                            <p>
                                <strong>Constraints:</strong>{" "}
                                {s.input.constraints.join("; ")}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">Add New Scenario</h2>

                <div>
                    <Label>Description</Label>
                    <Input
                        value={newScenario.description}
                        onChange={(e) =>
                            setNewScenario({
                                ...newScenario,
                                description: e.target.value
                            })
                        }
                    />
                </div>

                <div>
                    <Label>Lectures (comma separated)</Label>
                    <Input
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
                                    }
                                }
                            })
                        }
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <Label>Exercise Hours</Label>
                        <Input
                            type="number"
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
                        />
                    </div>
                    <div>
                        <Label>Project Hours</Label>
                        <Input
                            type="number"
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
                        />
                    </div>
                    <div>
                        <Label>Self-learning Hours</Label>
                        <Input
                            type="number"
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
                        />
                    </div>
                </div>

                <div>
                    <Label>Constraints (one per line)</Label>
                    <Textarea
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
                                }
                            })
                        }
                    />
                </div>

                <Button onClick={addScenario}>Add Scenario</Button>
            </section>
        </div>
    );
}
