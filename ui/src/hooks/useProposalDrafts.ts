// ui/src/hooks/useProposalDrafts.ts
//
// Persists generated-but-unsaved improvement proposals to localStorage so
// they survive accidental refresh / tab switch. Saved proposals (i.e.
// already in the DB) are NOT cached here — those come from the API.

import { useCallback, useEffect, useState } from "react";
import type { YardProposalDraft } from "@/types/yard";

const STORAGE_PREFIX = "yard-proposals-drafts:";

function storageKey(caseId: string) {
    return `${STORAGE_PREFIX}${caseId}`;
}

function readDrafts(caseId: string): YardProposalDraft[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(storageKey(caseId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as YardProposalDraft[]) : [];
    } catch (e) {
        console.warn("Failed to read proposal drafts:", e);
        return [];
    }
}

function writeDrafts(caseId: string, drafts: YardProposalDraft[]) {
    if (typeof window === "undefined") return;
    try {
        if (drafts.length === 0) {
            window.localStorage.removeItem(storageKey(caseId));
        } else {
            window.localStorage.setItem(
                storageKey(caseId),
                JSON.stringify(drafts)
            );
        }
    } catch (e) {
        console.warn("Failed to write proposal drafts:", e);
    }
}

export function newDraftId(): string {
    return (
        "draft_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 8)
    );
}

export interface UseProposalDraftsResult {
    drafts: YardProposalDraft[];
    addDrafts: (drafts: YardProposalDraft[]) => void;
    updateDraft: (
        draftId: string,
        patch: Partial<YardProposalDraft>
    ) => void;
    removeDraft: (draftId: string) => void;
    clearDrafts: () => void;
}

/**
 * Single source of truth for unsaved proposal drafts on a given case.
 * State lives in React; localStorage is a mirror that's read once on
 * mount and rewritten on every change.
 */
export function useProposalDrafts(
    caseId: string | undefined
): UseProposalDraftsResult {
    const [drafts, setDrafts] = useState<YardProposalDraft[]>([]);

    // Load from localStorage when caseId becomes available
    useEffect(() => {
        if (!caseId) {
            setDrafts([]);
            return;
        }
        setDrafts(readDrafts(caseId));
    }, [caseId]);

    // Mirror to localStorage on every change
    useEffect(() => {
        if (!caseId) return;
        writeDrafts(caseId, drafts);
    }, [caseId, drafts]);

    const addDrafts = useCallback((incoming: YardProposalDraft[]) => {
        setDrafts((prev) => [...incoming, ...prev]);
    }, []);

    const updateDraft = useCallback(
        (draftId: string, patch: Partial<YardProposalDraft>) => {
            setDrafts((prev) =>
                prev.map((d) =>
                    d.draft_id === draftId ? { ...d, ...patch } : d
                )
            );
        },
        []
    );

    const removeDraft = useCallback((draftId: string) => {
        setDrafts((prev) => prev.filter((d) => d.draft_id !== draftId));
    }, []);

    const clearDrafts = useCallback(() => {
        setDrafts([]);
    }, []);

    return { drafts, addDrafts, updateDraft, removeDraft, clearDrafts };
}
