// ui/src/pages/EducationalStressPage.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    AlertTriangle,
    Calendar,
    Users,
    BookOpen,
    Clock,
    BarChart2,
} from "lucide-react";
import type {
    CourseAnalysisOutput,
    AdjustmentDetail,
    StressThresholds,
} from "@/types/educationalStress";
import {
    fetchEducationalSimulation,
    fetchAdjustmentDetails,
    getAdjustmentName,
    getAdjustmentDescription,
} from "@/services/educationalStressService";
import { StressTimelineChart } from "@/components/stress/StressTimelineChart";
import { WeeklyScheduleTable } from "@/components/stress/WeeklyScheduleTable";
import { EducationalStressComparisonView } from "@/components/stress/EducationalStressComparisonView";
import { FloatingStressChat } from "@/components/stress/FloatingStressChat";
import { AIExplanationBox } from "@/components/results/AIExplanationBox";

export default function EducationalStressPage() {
    const { caseId } = useParams<{ caseId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");
    const [simulation, setSimulation] = useState<CourseAnalysisOutput | null>(
        null
    );
    const [selectedAdjustment, setSelectedAdjustment] =
        useState<AdjustmentDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const thresholds: StressThresholds = {
        warning:
            simulation?.optimization_request?.stress_threshold_warning || 75,
        critical:
            simulation?.optimization_request?.stress_threshold_critical || 85,
    };

    // Fetch simulation data on mount
    useEffect(() => {
        async function loadSimulation() {
            if (!caseId) {
                setError("Case ID is missing.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const data = await fetchEducationalSimulation(caseId);
                setSimulation(data);
                setError(null);
            } catch (err) {
                console.error("Failed to load simulation:", err);
                setError("Failed to load simulation. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        }

        loadSimulation();
    }, [caseId]);

    // Fetch adjustment details when tab changes
    useEffect(() => {
        async function loadAdjustmentDetails() {
            if (
                !caseId ||
                !activeTab ||
                activeTab === "overview" ||
                activeTab === "comparison" ||
                !simulation
            ) {
                return;
            }

            try {
                const adjustmentId = activeTab;
                const details = await fetchAdjustmentDetails(
                    caseId,
                    adjustmentId
                );
                setSelectedAdjustment(details);
            } catch (err) {
                console.error("Failed to load adjustment details:", err);
            }
        }

        loadAdjustmentDetails();
    }, [activeTab, caseId, simulation]);

    // Loading state
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-6 space-y-8">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <div className="flex flex-wrap gap-4">
                    <Skeleton className="h-10 w-32 rounded-full" />
                    <Skeleton className="h-10 w-32 rounded-full" />
                    <Skeleton className="h-10 w-32 rounded-full" />
                </div>
                <Skeleton className="h-96 w-full rounded-lg" />
            </div>
        );
    }

    // Error state
    if (error || !simulation) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {error ||
                            "Failed to load simulation. Please try again later."}
                    </AlertDescription>
                </Alert>
                <Button className="mt-4" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Home
                </Button>
            </div>
        );
    }

    // Convert simulation to Plan format for AI explanation
    const simulationAsPlan = {
        name: simulation.name,
        description: simulation.description,
        kind: "educational_stress" as const,
        scenarios: simulation.week_schedules.map((s) => ({
            scenarioId: s.adjustment_id,
            description: getAdjustmentName(s.adjustment_id),
            data: s.week_schedules,
        })),
        metadata: simulation.metadata,
    };

    // Render individual adjustment scenario
    const renderAdjustmentScenario = (adjustmentId: string) => {
        const scenario = simulation.week_schedules.find(
            (s) => s.adjustment_id === adjustmentId
        );

        if (!scenario) {
            return (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Adjustment scenario not found.
                    </AlertDescription>
                </Alert>
            );
        }

        return (
            <div className="space-y-6">
                {/* Scenario Description */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {getAdjustmentName(adjustmentId)}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                            {getAdjustmentDescription(adjustmentId)}
                        </p>
                    </CardHeader>
                </Card>

                {/* Stress Timeline Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Stress Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-96">
                            <StressTimelineChart
                                weekSchedules={scenario.week_schedules}
                                thresholds={thresholds}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Weekly Schedule Table */}
                <WeeklyScheduleTable
                    weekSchedules={scenario.week_schedules}
                    thresholds={thresholds}
                />
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                        <Clock className="h-4 w-4" />
                        <span>
                            Created on{" "}
                            {new Date(
                                simulation.metadata.created_at
                            ).toLocaleDateString()}
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold">{simulation.name}</h1>
                    <p className="text-gray-600 mt-1">
                        {simulation.description}
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            {/* Course Info Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                        <BookOpen className="mr-2 h-5 w-5" />
                        {simulation.course_info.course_name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Course ID</p>
                            <p className="font-medium">
                                {simulation.course_info.course_id}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">ECTS Credits</p>
                            <p className="font-medium">
                                {simulation.course_info.ects}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">
                                Current Week
                            </p>
                            <p className="font-medium">
                                {simulation.current_status.current_week} of{" "}
                                {simulation.course_info.total_weeks}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Students</p>
                            <p className="font-medium flex items-center">
                                <Users className="mr-1 h-4 w-4" />
                                {simulation.students.count}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* AI Analysis */}
            <AIExplanationBox plan={simulationAsPlan as any} />

            {/* Tabs for different scenarios */}
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-6"
            >
                <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 flex flex-wrap">
                    <TabsTrigger
                        value="overview"
                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md"
                    >
                        <BarChart2 className="h-4 w-4 mr-2" />
                        Comparison
                    </TabsTrigger>

                    {simulation.week_schedules.map((scenario) => (
                        <TabsTrigger
                            key={scenario.adjustment_id}
                            value={scenario.adjustment_id}
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md"
                        >
                            {getAdjustmentName(scenario.adjustment_id).split(
                                " - "
                            )[0]}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <EducationalStressComparisonView
                        simulation={simulation}
                        thresholds={thresholds}
                    />
                </TabsContent>

                {simulation.week_schedules.map((scenario) => (
                    <TabsContent
                        key={scenario.adjustment_id}
                        value={scenario.adjustment_id}
                        className="mt-6"
                    >
                        {renderAdjustmentScenario(scenario.adjustment_id)}
                    </TabsContent>
                ))}
            </Tabs>

            {/* Floating Chat */}
            <FloatingStressChat
                simulation={simulation}
                adjustmentId={
                    activeTab !== "overview" ? activeTab : undefined
                }
            />
        </div>
    );
}
