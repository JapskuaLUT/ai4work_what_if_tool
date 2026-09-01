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
import {
    ChevronLeft,
    AlertTriangle,
    Users,
    BookOpen,
    Clock,
    BarChart2,
    Check,
    Star,
} from "lucide-react";
import type {
    CourseAnalysisOutput,
    StressThresholds,
} from "@/types/educationalStress";
import {
    COURSE_MODEL_THRESHOLDS,
    fetchEducationalSimulation,
    getAdjustmentName,
    getAdjustmentDescription,
    isV1Case,
    selectAdjustment,
    getSelectedAdjustment,
} from "@/services/educationalStressService";
import type { EducationCaseV1 } from "@/types/educationalStress";
import { EducationalStressV1View } from "@/components/stress/EducationalStressV1View";
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<
        string | null
    >(null);
    const [isSelectingAdjustment, setIsSelectingAdjustment] = useState(false);
    // Which v1 scenario tab is open, so the floating chat can be grounded in it.
    const [activeScenarioId, setActiveScenarioId] = useState<string | undefined>(
        undefined
    );

    // Fallbacks differ by model generation: v1 cases display the calibrated
    // course-model thresholds (decisions.md §1); pre-v1.0 cases keep the 75/85
    // their 0-100 calculator was built around. Stored per-case values always
    // win over either fallback.
    const caseIsV1 = isV1Case(
        simulation as unknown as { stress_model?: { version?: string } }
    );
    const thresholds: StressThresholds = {
        warning:
            simulation?.optimization_request?.stress_threshold_warning ||
            (caseIsV1 ? COURSE_MODEL_THRESHOLDS.warning : 75),
        critical:
            simulation?.optimization_request?.stress_threshold_critical ||
            (caseIsV1 ? COURSE_MODEL_THRESHOLDS.critical : 85),
    };

    // Fetch simulation data and selection on mount
    useEffect(() => {
        async function loadSimulation() {
            if (!caseId) {
                setError("Case ID is missing.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const [data, selectionData] = await Promise.all([
                    fetchEducationalSimulation(caseId),
                    getSelectedAdjustment(caseId),
                ]);
                setSimulation(data);
                setSelectedAdjustmentId(
                    selectionData.hasSelection
                        ? selectionData.selectedAdjustmentId
                        : null
                );
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

    // Handle adjustment selection
    const handleSelectAdjustment = async (adjustmentId: string) => {
        if (!caseId) return;

        setIsSelectingAdjustment(true);
        try {
            await selectAdjustment(caseId, adjustmentId);
            setSelectedAdjustmentId(adjustmentId);
        } catch (err) {
            console.error("Failed to select adjustment:", err);
            setError("Failed to select adjustment. Please try again.");
        } finally {
            setIsSelectingAdjustment(false);
        }
    };

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

    // Cases computed with course_stress_prediction v1.0 get the v1 view: five
    // separate workload variables, a baseline-vs-simulation comparison, the
    // audit trail, and the what-if builder. Pre-v1.0 cases keep the original
    // view below — their stored numbers came from a different model and must
    // not be presented as comparable.
    if (caseIsV1) {
        const v1 = simulation as unknown as EducationCaseV1;
        return (
            <>
                <EducationalStressV1View
                    caseId={caseId!}
                    caseData={v1}
                    thresholds={thresholds}
                    selectedAdjustmentId={selectedAdjustmentId}
                    onSelectAdjustment={handleSelectAdjustment}
                    isSelecting={isSelectingAdjustment}
                    onActiveScenarioChange={setActiveScenarioId}
                />
                <FloatingStressChat
                    simulation={simulation}
                    adjustmentId={activeScenarioId}
                />
            </>
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

        const isSelected = selectedAdjustmentId === adjustmentId;

        return (
            <div className="space-y-6">
                {/* Scenario Description with Selection */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="flex items-center gap-2">
                                    {getAdjustmentName(adjustmentId)}
                                    {isSelected && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                            <Star className="h-3 w-3 fill-current" />
                                            Selected
                                        </span>
                                    )}
                                </CardTitle>
                                <p className="text-sm text-gray-600 mt-2">
                                    {getAdjustmentDescription(adjustmentId)}
                                </p>
                            </div>
                            <Button
                                onClick={() => handleSelectAdjustment(adjustmentId)}
                                disabled={isSelectingAdjustment || isSelected}
                                variant={isSelected ? "outline" : "default"}
                                className="ml-4"
                            >
                                {isSelected ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Selected
                                    </>
                                ) : (
                                    <>
                                        <Star className="mr-2 h-4 w-4" />
                                        Select This Scenario
                                    </>
                                )}
                            </Button>
                        </div>
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

                    {simulation.week_schedules.map((scenario) => {
                        const isSelected =
                            selectedAdjustmentId === scenario.adjustment_id;
                        return (
                            <TabsTrigger
                                key={scenario.adjustment_id}
                                value={scenario.adjustment_id}
                                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md"
                            >
                                <span className="flex items-center gap-1">
                                    {getAdjustmentName(
                                        scenario.adjustment_id
                                    ).split(" - ")[0]}
                                    {isSelected && (
                                        <Star className="h-3 w-3 fill-green-600 text-green-600" />
                                    )}
                                </span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <EducationalStressComparisonView
                        simulation={simulation}
                        thresholds={thresholds}
                        selectedAdjustmentId={selectedAdjustmentId}
                        onSelectAdjustment={handleSelectAdjustment}
                        isSelecting={isSelectingAdjustment}
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
