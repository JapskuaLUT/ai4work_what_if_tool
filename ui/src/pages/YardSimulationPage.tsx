// ui/src/pages/YardSimulationPage.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertTriangle,
    BarChart2,
    ChevronLeft,
    Star,
    Truck
} from "lucide-react";

import {
    fetchYardSimulation,
    fetchYardRun,
    selectYardRun
} from "@/services/yardSimulationService";
import type {
    YardRunDetail,
    YardSimulationOverview
} from "@/types/yard";
import { RunComparisonTable } from "@/components/yard/RunComparisonTable";
import { RunSummaryCard } from "@/components/yard/RunSummaryCard";
import { BottlenecksList } from "@/components/yard/BottlenecksList";
import { OccupancyTimelineChart } from "@/components/yard/OccupancyTimelineChart";
import { TruckGanttChart } from "@/components/yard/TruckGanttChart";
import { YardMap } from "@/components/yard/YardMap";
import { FloatingYardChat } from "@/components/yard/FloatingYardChat";

export default function YardSimulationPage() {
    const { caseId } = useParams<{ caseId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [overview, setOverview] = useState<YardSimulationOverview | null>(
        null
    );
    const [runDetail, setRunDetail] = useState<YardRunDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingRun, setIsLoadingRun] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        if (!caseId) {
            setError("Case ID is missing.");
            setIsLoading(false);
            return;
        }
        let cancelled = false;
        async function load() {
            setIsLoading(true);
            try {
                const o = await fetchYardSimulation(caseId!);
                if (cancelled) return;
                setOverview(o);
                setError(null);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load yard simulation."
                    );
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [caseId]);

    // Load run detail when a non-overview tab becomes active
    useEffect(() => {
        if (!caseId || activeTab === "overview") {
            setRunDetail(null);
            setSelectedEntity(null);
            return;
        }
        let cancelled = false;
        async function loadRun() {
            setIsLoadingRun(true);
            try {
                const d = await fetchYardRun(caseId!, activeTab);
                if (cancelled) return;
                setRunDetail(d);
                setSelectedEntity(
                    d.summary_metrics.bottlenecks[0]?.entity ?? null
                );
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load run."
                    );
                }
            } finally {
                if (!cancelled) setIsLoadingRun(false);
            }
        }
        loadRun();
        return () => {
            cancelled = true;
        };
    }, [caseId, activeTab]);

    const handleSelectRun = async (runId: string) => {
        if (!caseId) return;
        setIsSelecting(true);
        try {
            await selectYardRun(caseId, runId);
            setOverview((prev) =>
                prev
                    ? {
                          ...prev,
                          selected_run_id: runId,
                          selected_at: new Date().toISOString()
                      }
                    : prev
            );
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to select run."
            );
        } finally {
            setIsSelecting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-96 w-full rounded-lg" />
            </div>
        );
    }

    if (error || !overview) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {error ?? "Failed to load yard simulation."}
                    </AlertDescription>
                </Alert>
                <Button className="mt-4" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Home
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Truck className="h-7 w-7" />
                        {overview.name}
                    </h1>
                    {overview.description && (
                        <p className="text-gray-600 mt-1">
                            {overview.description}
                        </p>
                    )}
                </div>
                <Button variant="outline" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            {/* Yard map + entity counts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <YardMap
                        imagePath={overview.yard_image_path}
                        name="Yard layout"
                    />
                </div>
                <YardEntitySummary overview={overview} />
            </div>

            {/* Tabs */}
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
                    {overview.runs.map((r) => {
                        const isSel = overview.selected_run_id === r.run_id;
                        return (
                            <TabsTrigger
                                key={r.run_id}
                                value={r.run_id}
                                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md"
                            >
                                <span className="flex items-center gap-1">
                                    {r.label}
                                    {isSel && (
                                        <Star className="h-3 w-3 fill-green-600 text-green-600" />
                                    )}
                                </span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                <TabsContent value="overview">
                    <RunComparisonTable
                        runs={overview.runs}
                        selectedRunId={overview.selected_run_id}
                        onSelect={handleSelectRun}
                        isSelecting={isSelecting}
                    />
                </TabsContent>

                {overview.runs.map((r) => (
                    <TabsContent key={r.run_id} value={r.run_id}>
                        {isLoadingRun || !runDetail ? (
                            <Skeleton className="h-96 w-full rounded-lg" />
                        ) : runDetail.run_id !== r.run_id ? null : (
                            <RunDetailContent
                                detail={runDetail}
                                selectedEntity={selectedEntity}
                                onSelectEntity={setSelectedEntity}
                            />
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            <FloatingYardChat
                overview={overview}
                activeRun={
                    activeTab !== "overview" && runDetail
                        ? runDetail
                        : null
                }
            />
        </div>
    );
}

function YardEntitySummary({
    overview
}: {
    overview: YardSimulationOverview;
}) {
    const e = overview.yard_structure?.Entities;
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Yard contents</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
                {e ? (
                    <>
                        <Row label="Terminals" v={e.Terminals.length} />
                        <Row label="Parking areas" v={e.ParkingAreas.length} />
                        <Row label="Scales" v={e.Scales.length} />
                        <Row label="Storages" v={e.Storages.length} />
                        <Row label="Crossings" v={e.Crossings.length} />
                        <Row
                            label="Streets"
                            v={overview.yard_structure?.Streets.length ?? 0}
                        />
                    </>
                ) : (
                    <p className="text-gray-500">
                        Yard structure not loaded — run-level only.
                    </p>
                )}
                <Row label="Runs" v={overview.runs.length} />
            </CardContent>
        </Card>
    );
}

function Row({ label, v }: { label: string; v: number }) {
    return (
        <div className="flex justify-between">
            <span className="text-gray-600">{label}</span>
            <span className="font-medium">{v}</span>
        </div>
    );
}

function RunDetailContent({
    detail,
    selectedEntity,
    onSelectEntity
}: {
    detail: YardRunDetail;
    selectedEntity: string | null;
    onSelectEntity: (e: string) => void;
}) {
    return (
        <div className="space-y-6">
            <RunSummaryCard metrics={detail.summary_metrics} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <BottlenecksList
                        bottlenecks={detail.summary_metrics.bottlenecks}
                        selected={selectedEntity}
                        onSelect={onSelectEntity}
                    />
                </div>
                <div className="lg:col-span-2">
                    <OccupancyTimelineChart
                        caseId={detail.case_id}
                        runId={detail.run_id}
                        entity={selectedEntity}
                    />
                </div>
            </div>
            <TruckGanttChart
                measurements={detail.measurements.Measurements}
            />
        </div>
    );
}
