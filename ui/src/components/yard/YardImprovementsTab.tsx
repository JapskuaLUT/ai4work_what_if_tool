// ui/src/components/yard/YardImprovementsTab.tsx

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Inbox, Plus } from "lucide-react";

import {
    deleteYardProposal,
    listYardProposals,
    saveYardProposal
} from "@/services/yardSimulationService";
import { useProposalDrafts } from "@/hooks/useProposalDrafts";
import type {
    ProposalValidation,
    YardProposal,
    YardProposalDraft,
    YardSimulationOverview
} from "@/types/yard";
import { ProposalCard } from "./ProposalCard";
import { GenerateProposalsPanel } from "./GenerateProposalsPanel";
import { ManualProposalForm } from "./ManualProposalForm";
import { Button } from "@/components/ui/button";

interface Props {
    overview: YardSimulationOverview;
    /** Open the floating chat preloaded with the given proposal. */
    onDiscussProposal?: (p: YardProposal) => void;
}

export function YardImprovementsTab({ overview, onDiscussProposal }: Props) {
    const caseId = overview.case_id;
    const { drafts, addDrafts, updateDraft, removeDraft } =
        useProposalDrafts(caseId);

    const [saved, setSaved] = useState<YardProposal[] | null>(null);
    const [loadingSaved, setLoadingSaved] = useState(true);
    const [savedError, setSavedError] = useState<string | null>(null);
    const [busyDraftId, setBusyDraftId] = useState<string | null>(null);
    const [busySavedId, setBusySavedId] = useState<number | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);

    const refreshSaved = useCallback(async () => {
        setLoadingSaved(true);
        try {
            const list = await listYardProposals(caseId);
            setSaved(list);
            setSavedError(null);
        } catch (e) {
            setSavedError(
                e instanceof Error ? e.message : "Failed to load proposals"
            );
        } finally {
            setLoadingSaved(false);
        }
    }, [caseId]);

    useEffect(() => {
        refreshSaved();
    }, [refreshSaved]);

    const handleSaveDraft = async (d: YardProposalDraft) => {
        setBusyDraftId(d.draft_id);
        try {
            const { proposal } = await saveYardProposal(caseId, {
                target_run_id: d.target_run_id ?? null,
                title: d.title,
                summary: d.summary,
                target_bottleneck: d.target_bottleneck ?? null,
                changes: d.changes,
                expected_impact: d.expected_impact ?? null,
                risks: d.risks ?? null,
                source: d.source ?? "ai"
            });
            // Remove the draft, prepend the new saved row.
            removeDraft(d.draft_id);
            setSaved((prev) =>
                prev ? [proposal, ...prev] : [proposal]
            );
        } catch (e) {
            const validation = (e as Error & { validation?: ProposalValidation })
                .validation;
            if (validation) {
                updateDraft(d.draft_id, { last_validation: validation });
            } else {
                updateDraft(d.draft_id, {
                    last_validation: {
                        valid: false,
                        errors: [
                            e instanceof Error ? e.message : String(e)
                        ],
                        warnings: []
                    }
                });
            }
        } finally {
            setBusyDraftId(null);
        }
    };

    const handleDeleteSaved = async (p: YardProposal) => {
        if (!confirm(`Delete proposal "${p.title}"?`)) return;
        setBusySavedId(p.id);
        try {
            await deleteYardProposal(caseId, p.id);
            setSaved((prev) =>
                prev ? prev.filter((x) => x.id !== p.id) : prev
            );
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : String(e));
        } finally {
            setBusySavedId(null);
        }
    };

    return (
        <div className="space-y-6">
            <GenerateProposalsPanel
                overview={overview}
                addDrafts={addDrafts}
            />

            {/* Drafts */}
            {drafts.length > 0 && (
                <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                        Drafts ({drafts.length})
                        <span className="text-xs font-normal text-gray-500 normal-case">
                            kept locally until saved
                        </span>
                    </h3>
                    <div className="space-y-3">
                        {drafts.map((d) => (
                            <ProposalCard
                                key={d.draft_id}
                                kind="draft"
                                draft={d}
                                onSave={handleSaveDraft}
                                onDiscard={(d) => removeDraft(d.draft_id)}
                                busy={busyDraftId === d.draft_id}
                                validation={d.last_validation}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Saved */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Saved proposals
                        {saved !== null && ` (${saved.length})`}
                    </h3>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowManualForm((v) => !v)}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        {showManualForm ? "Cancel" : "Add manual proposal"}
                    </Button>
                </div>

                {showManualForm && (
                    <ManualProposalForm
                        overview={overview}
                        onSaved={(p) => {
                            setSaved((prev) =>
                                prev ? [p, ...prev] : [p]
                            );
                            setShowManualForm(false);
                        }}
                        onCancel={() => setShowManualForm(false)}
                    />
                )}

                {savedError && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{savedError}</AlertDescription>
                    </Alert>
                )}
                {loadingSaved && saved === null && (
                    <Skeleton className="h-32 w-full" />
                )}
                {!loadingSaved && saved && saved.length === 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2 text-gray-500">
                                <Inbox className="h-4 w-4" />
                                No saved proposals yet
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600">
                                Generate AI suggestions above, then click
                                <span className="font-medium"> Save</span> on
                                any draft to keep it. You can also add a
                                proposal manually.
                            </p>
                        </CardContent>
                    </Card>
                )}
                {saved && saved.length > 0 && (
                    <div className="space-y-3">
                        {saved.map((p) => (
                            <ProposalCard
                                key={p.id}
                                kind="saved"
                                proposal={p}
                                onDelete={handleDeleteSaved}
                                onDiscuss={onDiscussProposal}
                                busy={busySavedId === p.id}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
