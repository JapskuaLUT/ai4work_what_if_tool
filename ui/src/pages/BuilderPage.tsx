// ui/src/pages/BuilderPage.tsx

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    CalendarDays,
    Clock,
    BookOpen,
    Code,
    GraduationCap,
    ListChecks,
    AlertTriangle,
    Plus,
    PlayCircle,
    ChevronLeft
} from "lucide-react";

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
};

type CourseworkPlan = {
    name: string;
    description: string;
    scenarios: Scenario[];
};

export default function BuilderPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const [plan, setPlan] = useState<CourseworkPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const [newScenario, setNewScenario] = useState<Scenario>({
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

    useEffect(() => {
        async function fetchPlan() {
            setIsLoading(true);
            try {
                const res = await fetch(`/data/${projectId}.json`);
                const data = await res.json();
                setPlan(data);
            } catch (error) {
                console.error("Failed to fetch plan:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchPlan();
    }, [projectId]);

    const addScenario = () => {
        if (!plan) return;

        // Validate form
        if (!newScenario.description) {
            alert("Please add a scenario description");
            return;
        }

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
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg font-medium text-gray-700">
                        Loading coursework plan...
                    </p>
                </div>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load coursework plan. Please try again later.
                    </AlertDescription>
                </Alert>
                <Button className="mt-4" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Home
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-10">
            <header className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/")}
                            className="mb-4"
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" /> Back
                        </Button>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {plan.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            {plan.description}
                        </p>
                    </div>
                    <Button
                        size="lg"
                        onClick={() => navigate(`/results/${projectId}`)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                        <PlayCircle className="mr-2 h-5 w-5" /> Run Scenarios
                    </Button>
                </div>
                <div className="flex items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                    <Badge variant="outline" className="mr-2">
                        {plan.scenarios.length} scenarios
                    </Badge>
                    <CalendarDays className="h-4 w-4 mr-1" /> Weekly Schedule
                    Builder
                </div>
            </header>

            {plan.scenarios.length > 0 ? (
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold flex items-center">
                            <ListChecks className="mr-2 h-5 w-5 text-blue-600" />{" "}
                            Existing Scenarios
                        </h2>
                        <Badge variant="outline" className="text-sm">
                            {plan.scenarios.length} total
                        </Badge>
                    </div>
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                        {plan.scenarios.map((s) => (
                            <Card
                                key={s.scenarioId}
                                className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <CardHeader className="bg-slate-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg text-gray-900 dark:text-gray-100">
                                            Scenario {s.scenarioId}
                                        </CardTitle>
                                        <Badge
                                            className={
                                                s.description.includes(
                                                    "infeasible"
                                                )
                                                    ? "bg-red-100 text-red-800 hover:bg-red-200"
                                                    : "bg-green-100 text-green-800 hover:bg-green-200"
                                            }
                                        >
                                            {s.description.includes(
                                                "infeasible"
                                            )
                                                ? "Infeasible"
                                                : "Feasible"}
                                        </Badge>
                                    </div>
                                    <CardDescription className="font-medium">
                                        {s.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-2">
                                                <BookOpen className="mr-2 h-4 w-4 text-blue-600" />{" "}
                                                Lectures
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {s.input.tasks.lectures.map(
                                                    (lecture, idx) => (
                                                        <Badge
                                                            key={idx}
                                                            variant="secondary"
                                                            className="text-xs"
                                                        >
                                                            {lecture}
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center">
                                                <Clock className="h-4 w-4 mr-2 text-indigo-600" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Exercise Hours:
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="ml-2"
                                                >
                                                    {
                                                        s.input.tasks
                                                            .exercisesHours
                                                    }
                                                </Badge>
                                            </div>

                                            <div className="flex items-center">
                                                <Code className="h-4 w-4 mr-2 text-indigo-600" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Project Hours:
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="ml-2"
                                                >
                                                    {s.input.tasks.projectHours}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center">
                                                <GraduationCap className="h-4 w-4 mr-2 text-indigo-600" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Self-learning Hours:
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="ml-2"
                                                >
                                                    {
                                                        s.input.tasks
                                                            .selfLearningHours
                                                    }
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="my-4" />

                                    <div>
                                        <h3 className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300 mb-2">
                                            <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />{" "}
                                            Constraints
                                        </h3>
                                        <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600 dark:text-gray-400">
                                            {s.input.constraints.map(
                                                (constraint, idx) => (
                                                    <li key={idx}>
                                                        {constraint}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto text-blue-500 mb-2" />
                    <h3 className="text-lg font-semibold text-blue-800">
                        No scenarios yet
                    </h3>
                    <p className="text-blue-600 mb-4">
                        Create your first scenario using the form below
                    </p>
                </div>
            )}

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
                                                projectHours: Number(
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
                                value={
                                    newScenario.input.tasks.selfLearningHours
                                }
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
                        <Button
                            variant="outline"
                            onClick={() => {
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
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={addScenario}
                            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Scenario
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
