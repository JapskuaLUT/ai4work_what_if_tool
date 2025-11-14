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
    TrendingDown,
    Calendar,
    Users,
    BookOpen,
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
    calculateWeekSummary,
} from "@/services/educationalStressService";
import { StressTimelineChart } from "@/components/stress/StressTimelineChart";
import { WeeklyScheduleTable } from "@/components/stress/WeeklyScheduleTable";

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

    // Render overview tab
    const renderOverview = () => {
        return (
            <div className="space-y-6">
                {/* Course Information Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <BookOpen className="mr-2 h-5 w-5" />
                            Course Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    Course Name
                                </p>
                                <p className="font-medium">
                                    {simulation.course_info.course_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    Course ID
                                </p>
                                <p className="font-medium">
                                    {simulation.course_info.course_id}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    ECTS Credits
                                </p>
                                <p className="font-medium">
                                    {simulation.course_info.ects}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    Teaching Hours
                                </p>
                                <p className="font-medium">
                                    {simulation.course_info.teaching_hours}h
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    Lab Hours
                                </p>
                                <p className="font-medium">
                                    {simulation.course_info.lab_hours}h
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    Attendance Method
                                </p>
                                <Badge>
                                    {simulation.course_info.attendance_method}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Adjustment Scenarios Comparison */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <TrendingDown className="mr-2 h-5 w-5" />
                            Optimization Scenarios
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {simulation.week_schedules.map((scenario) => {
                                const summary = calculateWeekSummary(
                                    scenario.week_schedules
                                );
                                return (
                                    <Card
                                        key={scenario.adjustment_id}
                                        className="cursor-pointer hover:border-purple-300 transition-colors"
                                        onClick={() =>
                                            setActiveTab(scenario.adjustment_id)
                                        }
                                    >
                                        <CardContent className="p-4">
                                            <h4 className="font-semibold text-sm mb-2">
                                                {getAdjustmentName(
                                                    scenario.adjustment_id
                                                )}
                                            </h4>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">
                                                        Adjusted Weeks:
                                                    </span>
                                                    <span className="font-medium">
                                                        {summary.adjustedCount}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">
                                                        Avg Stress:
                                                    </span>
                                                    <span className="font-medium">
                                                        {summary.averageStress}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">
                                                        Peak Stress:
                                                    </span>
                                                    <span className="font-medium">
                                                        {summary.peakStress}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full mt-3"
                                            >
                                                View Details
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Current Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Calendar className="mr-2 h-5 w-5" />
                            Current Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">
                                    Current Week
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {simulation.current_status.current_week}
                                </p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">
                                    Total Weeks
                                </p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {simulation.course_info.total_weeks}
                                </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">
                                    Students
                                </p>
                                <p className="text-2xl font-bold text-green-600 flex items-center">
                                    <Users className="mr-2 h-5 w-5" />
                                    {simulation.students.count}
                                </p>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">
                                    Assignments
                                </p>
                                <p className="text-2xl font-bold text-amber-600">
                                    {simulation.assignment_weeks.length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
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
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{simulation.name}</h1>
                    <p className="text-gray-600 mt-1">
                        {simulation.description}
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

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
                        Overview
                    </TabsTrigger>

                    {simulation.week_schedules.map((scenario) => (
                        <TabsTrigger
                            key={scenario.adjustment_id}
                            value={scenario.adjustment_id}
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md"
                        >
                            {getAdjustmentName(scenario.adjustment_id)}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    {renderOverview()}
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
        </div>
    );
}
