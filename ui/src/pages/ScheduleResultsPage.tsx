// ui/src/pages/ScheduleResultsPage.tsx

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ComparisonView } from "@/components/results/ComparisonView";
import { ScenarioView } from "@/components/scenario/ScenarioView";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, BarChart2, Clock } from "lucide-react";
import { ResultsHeader } from "@/components/results/ResultsHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseworkPlan } from "@/types/builder";
import { AIExplanationBox } from "@/components/results/AIExplanationBox";

export default function ScheduleResultsPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const [activeTab, setActiveTab] = useState("compare");
    const [plan, setPlan] = useState<CourseworkPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchPlan() {
            setIsLoading(true);
            try {
                const res = await fetch(`/data/${projectId}.json`);
                if (!res.ok) {
                    throw new Error(`Failed to fetch data: ${res.status}`);
                }
                const data = await res.json();
                setPlan(data);
                setError(null);
            } catch (err) {
                console.error("Failed to load plan data", err);
                setError("Failed to load scenarios. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchPlan();
    }, [projectId]);

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto p-6 space-y-8">
                <div className="flex items-center mb-6">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-32 ml-auto" />
                </div>
                <Skeleton className="h-14 w-full mb-8 rounded-lg" />
                <div className="flex flex-wrap gap-4 mb-6">
                    <Skeleton className="h-10 w-28 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-80 rounded-lg" />
                    <Skeleton className="h-80 rounded-lg" />
                    <Skeleton className="h-80 rounded-lg" />
                    <Skeleton className="h-80 rounded-lg" />
                </div>
            </div>
        );
    }

    if (error || !plan) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {error ||
                            "Failed to load scenarios. Please try again later."}
                    </AlertDescription>
                </Alert>
                <Button className="mt-4" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Home
                </Button>
            </div>
        );
    }

    // Calculate the feasibility stats
    const feasibleCount = plan.scenarios.filter(
        (s) => s.output?.status === "feasible"
    ).length;

    const infeasibleCount = plan.scenarios.length - feasibleCount;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="flex items-center mb-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/builder/${projectId}`)}
                    className="mr-4"
                >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back to Builder
                </Button>
                <div className="flex items-center ml-auto space-x-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Generated on {new Date().toLocaleDateString()}</span>
                </div>
            </div>

            <ResultsHeader
                title={plan.name}
                description={plan.description}
                feasibleCount={feasibleCount}
                infeasibleCount={infeasibleCount}
            />

            <AIExplanationBox plan={plan} />

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-6"
            >
                <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 flex flex-wrap">
                    <TabsTrigger
                        value="compare"
                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md"
                    >
                        <BarChart2 className="h-4 w-4 mr-2" />
                        Comparison
                    </TabsTrigger>

                    {plan.scenarios.map((s) => (
                        <TabsTrigger
                            key={s.scenarioId}
                            value={s.scenarioId.toString()}
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md"
                        >
                            Scenario {s.scenarioId}
                            {s.output?.status === "feasible" ? (
                                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
                            ) : (
                                <span className="ml-2 w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="compare" className="mt-6">
                    <ComparisonView scenarios={plan.scenarios} />
                </TabsContent>

                {plan.scenarios.map((s) => (
                    <TabsContent
                        key={s.scenarioId}
                        value={s.scenarioId.toString()}
                        className="mt-6"
                    >
                        <ScenarioView scenario={s} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
