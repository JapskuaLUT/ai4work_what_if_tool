// ui/src/components/yard/GenerateProposalsPanel.tsx

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Sparkles, LoaderCircle, AlertTriangle } from "lucide-react";
import { useOllama } from "@/hooks/useOllama";
import { useModelContext } from "@/contexts/ModelContext";
import {
    buildSystemPrompt,
    buildUserPrompt,
    parseProposalResponse,
    ProposalParseError
} from "./yardProposalPrompt";
import type {
    YardProposalDraft,
    YardSimulationOverview
} from "@/types/yard";
import { newDraftId } from "@/hooks/useProposalDrafts";

interface Props {
    overview: YardSimulationOverview;
    /** Draft store so we can append generated proposals directly. */
    addDrafts: (drafts: YardProposalDraft[]) => void;
    /** Pre-selected target run id (e.g. the worst run); user can change. */
    initialTargetRunId?: string | null;
}

export function GenerateProposalsPanel({
    overview,
    addDrafts,
    initialTargetRunId
}: Props) {
    const { globalModel, availableModels: contextModels } = useModelContext();
    const { chatSync, fetchModels, availableModels, loadingModels } =
        useOllama();

    // Pick a default target run: the explicit initial, then worst-by-max-wait.
    const defaultRunId = useMemo(() => {
        if (initialTargetRunId) return initialTargetRunId;
        const worst = [...overview.runs].sort(
            (a, b) =>
                b.summary_metrics.waiting_seconds.max -
                a.summary_metrics.waiting_seconds.max
        )[0];
        return worst?.run_id ?? null;
    }, [initialTargetRunId, overview.runs]);

    const [targetRunId, setTargetRunId] = useState<string | null>(
        defaultRunId
    );
    const [count, setCount] = useState<number>(3);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(
        null
    );

    useEffect(() => {
        if (contextModels.length === 0) fetchModels().catch(console.error);
    }, [fetchModels, contextModels]);

    const targetRun =
        overview.runs.find((r) => r.run_id === targetRunId) ?? null;
    const model = globalModel || availableModels[0]?.name || "";

    async function handleGenerate() {
        if (!targetRun) {
            setError("Pick a target run first.");
            return;
        }
        if (!model) {
            setError(
                "No model selected. Pick one in the top-right model picker."
            );
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const raw = await chatSync(
                [
                    { role: "system", content: buildSystemPrompt() },
                    {
                        role: "user",
                        content: buildUserPrompt({
                            overview,
                            targetRun,
                            count
                        })
                    }
                ],
                {
                    model,
                    // - `format: "json"` is intentionally NOT set: it makes
                    //   reasoning models (qwen3.5) hang because the constraint
                    //   engine can't satisfy the schema during the thinking
                    //   pass. The tolerant parser handles drift instead.
                    // - `num_predict: 2048` is a safety cap so a runaway
                    //   reasoning model can't generate for the full 10-minute
                    //   proxy timeout — caps proposal output to ~6 KB, more
                    //   than enough for 5 well-formed proposals.
                    options: { temperature: 0.3, num_predict: 2048 }
                }
            );
            const proposals = parseProposalResponse(raw);
            const now = new Date().toISOString();
            const drafts: YardProposalDraft[] = proposals.map((p) => ({
                ...p,
                target_run_id: p.target_run_id ?? targetRun.run_id,
                draft_id: newDraftId(),
                created_at: now
            }));
            addDrafts(drafts);
            setLastGeneratedAt(now);
        } catch (e) {
            console.error("Proposal generation failed:", e);
            setError(
                e instanceof ProposalParseError
                    ? `Model output couldn't be parsed: ${e.message}. Try regenerating, or pick a stronger model.`
                    : e instanceof Error
                      ? e.message
                      : "Generation failed."
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate AI suggestions
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                    The model receives this run's KPIs, bottlenecks, and yard
                    layout, and returns concrete proposals you can save and
                    later forward to the simulator. Tip: pick a non-reasoning
                    model in the top-right (phi4 or gpt-oss work well) —
                    qwen3.5 can hang on this prompt while it "thinks".
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">
                            Target run
                        </label>
                        <Select
                            value={targetRunId ?? ""}
                            onValueChange={(v) => setTargetRunId(v || null)}
                        >
                            <SelectTrigger className="w-56">
                                <SelectValue placeholder="Select a run" />
                            </SelectTrigger>
                            <SelectContent>
                                {overview.runs.map((r) => (
                                    <SelectItem
                                        key={r.run_id}
                                        value={r.run_id}
                                    >
                                        {r.label} ({r.run_id})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">
                            Number of proposals
                        </label>
                        <Select
                            value={String(count)}
                            onValueChange={(v) => setCount(Number(v))}
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                        {n}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 mb-1">
                            Model: {model || "—"}
                            {loadingModels && " (loading…)"}
                        </span>
                        <Button
                            onClick={handleGenerate}
                            disabled={busy || !targetRun || !model}
                        >
                            {busy ? (
                                <>
                                    <LoaderCircle className="h-4 w-4 mr-1 animate-spin" />
                                    Generating…
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Generate suggestions
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 text-red-800 text-sm p-2 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {!error && lastGeneratedAt && (
                    <div className="text-xs text-gray-500">
                        Last generated{" "}
                        {new Date(lastGeneratedAt).toLocaleTimeString()}.
                        Drafts appear below — they're kept locally until you
                        Save or Discard.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
