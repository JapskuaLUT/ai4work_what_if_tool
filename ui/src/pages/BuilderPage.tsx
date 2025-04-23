// ui/src/pages/BuilderPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, PlayCircle } from "lucide-react";
import { BuilderPageHeader } from "@/components/builder/BuilderPageHeader";
import { BuilderScenarioList } from "@/components/builder/BuilderScenarioList";
import { BuilderScenarioForm } from "@/components/builder/BuilderScenarioForm";
import { BuilderLoadingState } from "@/components/builder/BuilderLoadingState";
import { BuilderErrorState } from "@/components/builder/BuilderErrorState";
import { Plan, BuilderScenario, CourseScenario } from "@/types/builder";

export default function BuilderPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const [plan, setPlan] = useState<Plan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

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

    const addScenario = (newScenario: BuilderScenario | CourseScenario) => {
        if (!plan) return;
        const updatedScenarios = [...plan.scenarios, newScenario];
        setPlan({ ...plan, scenarios: updatedScenarios });
    };

    if (isLoading) {
        return <BuilderLoadingState />;
    }

    if (!plan) {
        return <BuilderErrorState onBack={() => navigate("/")} />;
    }

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-10">
            <div className="flex items-center mb-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/")}
                    className="mr-4"
                >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button
                    onClick={() => navigate(`/results/${projectId}`)}
                    className="ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                    <PlayCircle className="mr-2 h-5 w-5" /> Run Scenarios
                </Button>
            </div>

            <BuilderPageHeader
                title={plan.name}
                description={plan.description}
                scenarioCount={plan.scenarios.length}
            />

            <BuilderScenarioList scenarios={plan.scenarios} kind={plan.kind} />

            <BuilderScenarioForm
                onAddScenario={addScenario}
                scenarioType={plan.kind}
            />
        </div>
    );
}
