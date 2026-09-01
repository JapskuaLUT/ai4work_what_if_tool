// ui/src/components/stress/EducationalStressV1View.tsx
//
// The view for cases computed with course_stress_prediction v1.0.
//
// Pre-v1.0 cases keep rendering through the original view — their stored
// numbers came from a different model and must not be shown side by side with
// v1 numbers as though they were comparable.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertTriangle,
    BarChart2,
    BookOpen,
    Check,
    ChevronLeft,
    Clock,
    FlaskConical,
    Star,
    Users,
} from "lucide-react";
import type {
    EducationCaseV1,
    ScenarioListEntry,
    ScenarioResult,
    StressModelConfig,
    StressThresholds,
} from "@/types/educationalStress";
import {
    baselineOnlyResults,
    createScenario,
    fetchScenario,
    fetchStressModel,
    hydrateStoredScenario,
    listScenarios,
    formatDate,
} from "@/services/educationalStressService";
import { StressTrajectoryChart } from "./StressTrajectoryChart";
import { WeeklyStressTable } from "./WeeklyStressTable";
import { AdjustmentBuilder } from "./AdjustmentBuilder";
import { ScenarioAuditPanel } from "./ScenarioAuditPanel";

type Props = {
    caseId: string;
    /** Lets the page ground the floating chat in whichever scenario is open. */
    onActiveScenarioChange?: (scenarioId: string | undefined) => void;
    caseData: EducationCaseV1;
    thresholds: StressThresholds;
    selectedAdjustmentId: string | null;
    onSelectAdjustment: (id: string) => void;
    isSelecting: boolean;
};

export function EducationalStressV1View({
    caseId,
    onActiveScenarioChange,
    caseData,
    thresholds,
    selectedAdjustmentId,
    onSelectAdjustment,
    isSelecting,
}: Props) {
    const navigate = useNavigate();
    const [tab, setTab] = useState("overview");
    const [scenarios, setScenarios] = useState<ScenarioListEntry[]>(
        caseData.scenarios ?? []
    );
    const [hydrated, setHydrated] = useState<Record<string, ScenarioResult>>({});
    const [model, setModel] = useState<StressModelConfig | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [runError, setRunError] = useState<string | null>(null);

    useEffect(() => {
        fetchStressModel()
            .then((m) => setModel(m.stress_model))
            .catch(() => setModel(null));
    }, []);

    const course = caseData.course;
    const currentWeekIndex = caseData.current_status?.current_week_index ?? 0;

    // Every scenario shares the same baseline, so any one of them can supply
    // the untouched trajectory for the overview.
    const baselineResults = useMemo(() => {
        const withComparison = scenarios.find((s) => s.comparison?.weekly_results?.length);
        if (!withComparison?.comparison) return [];
        return baselineOnlyResults(withComparison.comparison.weekly_results);
    }, [scenarios]);

    const baselineSummary = useMemo(() => {
        const withComparison = scenarios.find((s) => s.comparison);
        return withComparison?.comparison?.baseline ?? null;
    }, [scenarios]);

    const openScenario = async (scenarioId: string) => {
        setTab(scenarioId);
        onActiveScenarioChange?.(scenarioId);
        if (hydrated[scenarioId] || !model) return;
        try {
            const row = await fetchScenario(caseId, scenarioId);
            setHydrated((h) => ({
                ...h,
                [scenarioId]: hydrateStoredScenario(row, model),
            }));
        } catch {
            /* the tab falls back to the summary it already has */
        }
    };

    const runScenario = async (
        name: string,
        adjustments: Parameters<typeof createScenario>[1]["adjustments"],
        objective: "local_week" | "trajectory_peak"
    ) => {
        setIsRunning(true);
        setRunError(null);
        try {
            const result = await createScenario(caseId, {
                name,
                adjustments,
                options: { redistribution_objective: objective },
            });
            setHydrated((h) => ({ ...h, [result.scenario_id]: result }));
            setScenarios(await listScenarios(caseId));
            setTab(result.scenario_id);
            onActiveScenarioChange?.(result.scenario_id);
        } catch (err) {
            setRunError(
                err instanceof Error ? err.message : "Failed to simulate the scenario"
            );
        } finally {
            setIsRunning(false);
        }
    };

    const weekCount = caseData.baseline_schedule?.length ?? 0;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                        <Clock className="h-4 w-4" />
                        <span>
                            Created{" "}
                            {caseData.metadata?.created_at
                                ? new Date(caseData.metadata.created_at).toLocaleDateString()
                                : "—"}
                        </span>
                        <Badge variant="outline" className="ml-2">
                            {caseData.stress_model?.version === undefined
                                ? "unknown model"
                                : `model ${caseData.stress_model.version}`}
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-bold">{caseData.name}</h1>
                    <p className="text-gray-600 mt-1">{caseData.description}</p>
                    <p className="text-sm text-gray-500 mt-2 max-w-2xl">
                        Values shown are the course&rsquo;s estimated{" "}
                        <em>contribution</em> to student stress, on top of a
                        personal baseline the model cannot see &mdash; not
                        anyone&rsquo;s complete stress level. Thresholds are
                        calibrated to this course-model scale.
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate("/")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                        <BookOpen className="mr-2 h-5 w-5" />
                        {course.course_name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Course ID</p>
                            <p className="font-medium">{course.course_id || "—"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Semester</p>
                            <p className="font-medium">
                                {formatDate(course.start_date)} – {formatDate(course.end_date)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Current week</p>
                            <p className="font-medium">
                                {currentWeekIndex + 1} of {weekCount}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Difficulty</p>
                            <p className="font-medium">{course.topic_difficulty} / 5</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Students</p>
                            <p className="font-medium flex items-center">
                                <Users className="mr-1 h-4 w-4" />
                                {caseData.students?.count ?? "—"}
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-6">
                        <div>
                            <p className="text-sm font-medium mb-2">
                                Assignments ({course.assignments.length})
                            </p>
                            <ul className="text-sm space-y-1">
                                {course.assignments.map((a) => (
                                    <li key={a.assignment_id} className="text-gray-600">
                                        {a.name} — {formatDate(a.start_date)} to{" "}
                                        {formatDate(a.end_date)}, {a.estimated_hours}h
                                        {a.extensions?.length > 0 && (
                                            <Badge variant="outline" className="ml-2 text-xs">
                                                {a.extensions.length} extension
                                                {a.extensions.length === 1 ? "" : "s"}
                                            </Badge>
                                        )}
                                    </li>
                                ))}
                                {course.assignments.length === 0 && (
                                    <li className="text-gray-400">None</li>
                                )}
                            </ul>
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-2">
                                Exams ({course.exams.length})
                            </p>
                            <ul className="text-sm space-y-1">
                                {course.exams.map((x) => (
                                    <li key={x.exam_id} className="text-gray-600">
                                        {x.name} — {formatDate(x.date_time)}
                                    </li>
                                ))}
                                {course.exams.length === 0 && (
                                    <li className="text-gray-400">None</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {runError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{runError}</AlertDescription>
                </Alert>
            )}

            <Tabs
                value={tab}
                onValueChange={(v) => (v === "builder" ? setTab(v) : openScenario(v))}
                className="space-y-6"
            >
                <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 flex flex-wrap">
                    <TabsTrigger
                        value="overview"
                        onClick={() => {
                            setTab("overview");
                            onActiveScenarioChange?.(undefined);
                        }}
                    >
                        <BarChart2 className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    {scenarios.map((s) => (
                        <TabsTrigger key={s.scenario_id} value={s.scenario_id}>
                            <span className="flex items-center gap-1">
                                {(s.name ?? s.scenario_id).split(" - ")[0]}
                                {s.origin === "user" && (
                                    <Badge variant="outline" className="ml-1 text-[10px] px-1">
                                        yours
                                    </Badge>
                                )}
                                {selectedAdjustmentId === s.scenario_id && (
                                    <Star className="h-3 w-3 fill-green-600 text-green-600" />
                                )}
                            </span>
                        </TabsTrigger>
                    ))}
                    <TabsTrigger
                        value="builder"
                        onClick={() => {
                            setTab("builder");
                            onActiveScenarioChange?.(undefined);
                        }}
                    >
                        <FlaskConical className="h-4 w-4 mr-2" />
                        New what-if
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {baselineSummary && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Baseline trajectory</CardTitle>
                                <p className="text-sm text-gray-500">
                                    The course as planned: peak{" "}
                                    {baselineSummary.peak_stress.toFixed(2)} in week{" "}
                                    {baselineSummary.peak_week_number}, average{" "}
                                    {baselineSummary.average_stress.toFixed(2)}.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="h-96">
                                    <StressTrajectoryChart
                                        weeklyResults={baselineResults}
                                        thresholds={thresholds}
                                        showBaseline={false}
                                        currentWeekNumber={currentWeekIndex + 1}
                                        maximumStress={model?.maximum_stress ?? 90}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Scenarios</CardTitle>
                            <p className="text-sm text-gray-500">
                                Ranked by peak predicted stress, the primary optimisation
                                objective.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left p-2">Scenario</th>
                                            <th className="text-left p-2">Origin</th>
                                            <th className="text-right p-2">Peak</th>
                                            <th className="text-right p-2">vs baseline</th>
                                            <th className="text-right p-2">Average</th>
                                            <th className="text-right p-2">Changes</th>
                                            <th className="p-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...scenarios]
                                            .sort(
                                                (a, b) =>
                                                    (a.summary_metrics?.peak_stress ?? 999) -
                                                    (b.summary_metrics?.peak_stress ?? 999)
                                            )
                                            .map((s) => {
                                                const delta =
                                                    s.comparison?.objective?.peak_stress_delta ?? 0;
                                                const isSelected =
                                                    selectedAdjustmentId === s.scenario_id;
                                                return (
                                                    <tr
                                                        key={s.scenario_id}
                                                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                                        onClick={() => openScenario(s.scenario_id)}
                                                    >
                                                        <td className="p-2 font-medium">
                                                            {s.name ?? s.scenario_id}
                                                        </td>
                                                        <td className="p-2">
                                                            <Badge variant="outline">
                                                                {s.origin}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-2 text-right font-semibold">
                                                            {s.summary_metrics?.peak_stress.toFixed(
                                                                2
                                                            ) ?? "—"}
                                                        </td>
                                                        <td
                                                            className={`p-2 text-right ${
                                                                delta < -1e-6
                                                                    ? "text-green-600"
                                                                    : delta > 1e-6
                                                                      ? "text-red-600"
                                                                      : "text-gray-400"
                                                            }`}
                                                        >
                                                            {Math.abs(delta) < 1e-6
                                                                ? "—"
                                                                : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`}
                                                        </td>
                                                        <td className="p-2 text-right">
                                                            {s.summary_metrics?.average_stress.toFixed(
                                                                2
                                                            ) ?? "—"}
                                                        </td>
                                                        <td className="p-2 text-right">
                                                            {s.summary_metrics
                                                                ?.total_adjustments_made ?? 0}
                                                        </td>
                                                        <td className="p-2 text-right">
                                                            <Button
                                                                size="sm"
                                                                variant={
                                                                    isSelected ? "outline" : "default"
                                                                }
                                                                disabled={isSelecting || isSelected}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectAdjustment(s.scenario_id);
                                                                }}
                                                            >
                                                                {isSelected ? (
                                                                    <>
                                                                        <Check className="mr-1 h-3 w-3" />
                                                                        Selected
                                                                    </>
                                                                ) : (
                                                                    "Select"
                                                                )}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {scenarios.map((s) => {
                    const result = hydrated[s.scenario_id];
                    return (
                        <TabsContent
                            key={s.scenario_id}
                            value={s.scenario_id}
                            className="space-y-6"
                        >
                            {!result ? (
                                <p className="text-sm text-gray-500">Loading scenario…</p>
                            ) : result.weekly_results.length === 0 ? (
                                <>
                                    <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>
                                            This scenario has no stored week-by-week
                                            comparison, so its chart and table cannot be
                                            drawn.
                                        </AlertDescription>
                                    </Alert>
                                    <ScenarioAuditPanel result={result} />
                                </>
                            ) : (
                                <>
                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle>
                                                        {result.name ?? result.scenario_id}
                                                    </CardTitle>
                                                    {result.description && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {result.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    onClick={() =>
                                                        onSelectAdjustment(result.scenario_id)
                                                    }
                                                    disabled={
                                                        isSelecting ||
                                                        selectedAdjustmentId === result.scenario_id
                                                    }
                                                    variant={
                                                        selectedAdjustmentId === result.scenario_id
                                                            ? "outline"
                                                            : "default"
                                                    }
                                                >
                                                    {selectedAdjustmentId === result.scenario_id ? (
                                                        <>
                                                            <Check className="mr-2 h-4 w-4" />
                                                            Selected
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Star className="mr-2 h-4 w-4" />
                                                            Select this scenario
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-96">
                                                <StressTrajectoryChart
                                                    weeklyResults={result.weekly_results}
                                                    thresholds={thresholds}
                                                    currentWeekNumber={
                                                        result.current_week_number
                                                    }
                                                    maximumStress={model?.maximum_stress ?? 90}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <ScenarioAuditPanel result={result} />

                                    <WeeklyStressTable
                                        weeklyResults={result.weekly_results}
                                        thresholds={thresholds}
                                    />
                                </>
                            )}
                        </TabsContent>
                    );
                })}

                <TabsContent value="builder">
                    <AdjustmentBuilder
                        weeks={caseData.baseline_schedule ?? []}
                        assignments={course.assignments}
                        exams={course.exams}
                        currentWeekIndex={currentWeekIndex}
                        isRunning={isRunning}
                        onSimulate={runScenario}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
