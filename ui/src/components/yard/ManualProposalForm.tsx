// ui/src/components/yard/ManualProposalForm.tsx

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { AlertTriangle, X } from "lucide-react";
import type {
    ProposalChange,
    ProposalValidation,
    YardProposal,
    YardSimulationOverview
} from "@/types/yard";
import { saveYardProposal } from "@/services/yardSimulationService";

interface Props {
    overview: YardSimulationOverview;
    onSaved: (p: YardProposal) => void;
    onCancel: () => void;
}

const DRAFT_KEY_PREFIX = "yard-proposal-manual-form:";

interface FormState {
    title: string;
    summary: string;
    target_run_id: string;
    target_bottleneck: string;
    expected_impact: string;
    risks: string;
    changes: ProposalChange[];
}

const EMPTY_STATE: FormState = {
    title: "",
    summary: "",
    target_run_id: "",
    target_bottleneck: "",
    expected_impact: "",
    risks: "",
    changes: []
};

export function ManualProposalForm({ overview, onSaved, onCancel }: Props) {
    const draftKey = `${DRAFT_KEY_PREFIX}${overview.case_id}`;
    const [state, setState] = useState<FormState>(() => {
        if (typeof window === "undefined") return EMPTY_STATE;
        try {
            const raw = window.localStorage.getItem(draftKey);
            if (raw) return { ...EMPTY_STATE, ...JSON.parse(raw) };
        } catch {
            /* ignore */
        }
        return EMPTY_STATE;
    });
    const [busy, setBusy] = useState(false);
    const [validation, setValidation] = useState<ProposalValidation | null>(
        null
    );
    const [error, setError] = useState<string | null>(null);

    // Autosave the in-progress form
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (
            !state.title &&
            !state.summary &&
            state.changes.length === 0
        ) {
            window.localStorage.removeItem(draftKey);
            return;
        }
        try {
            window.localStorage.setItem(draftKey, JSON.stringify(state));
        } catch {
            /* ignore */
        }
    }, [draftKey, state]);

    function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
        setState((s) => ({ ...s, [key]: value }));
    }

    async function handleSave() {
        setBusy(true);
        setError(null);
        setValidation(null);
        try {
            const { proposal } = await saveYardProposal(overview.case_id, {
                title: state.title,
                summary: state.summary,
                target_run_id: state.target_run_id || null,
                target_bottleneck: state.target_bottleneck || null,
                expected_impact: state.expected_impact || null,
                risks: state.risks || null,
                changes: state.changes,
                source: "manual"
            });
            // Clear form draft on success
            window.localStorage.removeItem(draftKey);
            onSaved(proposal);
        } catch (e) {
            const v = (e as Error & { validation?: ProposalValidation })
                .validation;
            if (v) setValidation(v);
            setError(e instanceof Error ? e.message : "Failed to save");
        } finally {
            setBusy(false);
        }
    }

    function addChange() {
        patch("changes", [
            ...state.changes,
            {
                kind: "capacity",
                entity: "",
                from: 0,
                to: 0
            }
        ]);
    }

    function updateChange(idx: number, next: ProposalChange) {
        patch(
            "changes",
            state.changes.map((c, i) => (i === idx ? next : c))
        );
    }

    function removeChange(idx: number) {
        patch(
            "changes",
            state.changes.filter((_, i) => i !== idx)
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Add manual proposal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <Label>Title</Label>
                        <Input
                            value={state.title}
                            onChange={(e) => patch("title", e.target.value)}
                            placeholder="e.g. Double parking capacity"
                        />
                    </div>
                    <div>
                        <Label>Target run</Label>
                        <Select
                            value={state.target_run_id}
                            onValueChange={(v) =>
                                patch("target_run_id", v === "__none__" ? "" : v)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="(any run)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">
                                    (any run)
                                </SelectItem>
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
                    <div className="md:col-span-2">
                        <Label>Summary</Label>
                        <Textarea
                            value={state.summary}
                            onChange={(e) => patch("summary", e.target.value)}
                            rows={2}
                            placeholder="Why this change, and what it does."
                        />
                    </div>
                    <div>
                        <Label>Target bottleneck</Label>
                        <Input
                            value={state.target_bottleneck}
                            onChange={(e) =>
                                patch("target_bottleneck", e.target.value)
                            }
                            placeholder="e.g. B010"
                        />
                    </div>
                    <div>
                        <Label>Expected impact</Label>
                        <Input
                            value={state.expected_impact}
                            onChange={(e) =>
                                patch("expected_impact", e.target.value)
                            }
                            placeholder="e.g. halves max wait at B010"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Label>Risks / caveats</Label>
                        <Textarea
                            value={state.risks}
                            onChange={(e) => patch("risks", e.target.value)}
                            rows={2}
                            placeholder="Honest caveats."
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Changes</Label>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={addChange}
                        >
                            Add change
                        </Button>
                    </div>
                    {state.changes.length === 0 && (
                        <p className="text-xs text-gray-500">
                            At least one change is required.
                        </p>
                    )}
                    {state.changes.map((c, i) => (
                        <ChangeEditor
                            key={i}
                            change={c}
                            onChange={(next) => updateChange(i, next)}
                            onRemove={() => removeChange(i)}
                        />
                    ))}
                </div>

                {(error || validation) && (
                    <div className="rounded-md border border-red-200 bg-red-50 text-red-800 text-sm p-2 space-y-1">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                        {validation?.errors.map((e, i) => (
                            <div key={i} className="text-xs ml-6">
                                · {e}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={onCancel} disabled={busy}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={busy}>
                        {busy ? "Saving…" : "Save proposal"}
                    </Button>
                </div>
                <p className="text-xs text-gray-500">
                    Form contents auto-save locally — close and reopen safely.
                </p>
            </CardContent>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Per-change editor
// ---------------------------------------------------------------------------

function ChangeEditor({
    change,
    onChange,
    onRemove
}: {
    change: ProposalChange;
    onChange: (next: ProposalChange) => void;
    onRemove: () => void;
}) {
    return (
        <div className="border rounded p-3 space-y-2 bg-gray-50">
            <div className="flex items-center justify-between">
                <Select
                    value={change.kind}
                    onValueChange={(kind) =>
                        onChange(emptyChangeOf(kind as ProposalChange["kind"]))
                    }
                >
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="capacity">capacity</SelectItem>
                        <SelectItem value="stagger_orders">
                            stagger_orders
                        </SelectItem>
                        <SelectItem value="reroute">reroute</SelectItem>
                        <SelectItem value="add_entity">add_entity</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onRemove}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>

            {change.kind === "capacity" && (
                <div className="grid grid-cols-3 gap-2">
                    <Field label="Entity">
                        <Input
                            value={change.entity}
                            onChange={(e) =>
                                onChange({ ...change, entity: e.target.value })
                            }
                            placeholder="e.g. P010"
                        />
                    </Field>
                    <Field label="From">
                        <Input
                            type="number"
                            value={change.from}
                            onChange={(e) =>
                                onChange({
                                    ...change,
                                    from: Number(e.target.value)
                                })
                            }
                        />
                    </Field>
                    <Field label="To">
                        <Input
                            type="number"
                            value={change.to}
                            onChange={(e) =>
                                onChange({
                                    ...change,
                                    to: Number(e.target.value)
                                })
                            }
                        />
                    </Field>
                </div>
            )}

            {change.kind === "stagger_orders" && (
                <Field label="Description">
                    <Textarea
                        value={change.description}
                        onChange={(e) =>
                            onChange({
                                ...change,
                                description: e.target.value
                            })
                        }
                        rows={2}
                        placeholder="What to change about order arrival timing."
                    />
                </Field>
            )}

            {change.kind === "reroute" && (
                <div className="grid grid-cols-3 gap-2">
                    <Field label="Material">
                        <Input
                            value={change.material}
                            onChange={(e) =>
                                onChange({
                                    ...change,
                                    material: e.target.value
                                })
                            }
                            placeholder="e.g. 186"
                        />
                    </Field>
                    <Field label="From storage">
                        <Input
                            value={change.from_storage}
                            onChange={(e) =>
                                onChange({
                                    ...change,
                                    from_storage: e.target.value
                                })
                            }
                            placeholder="e.g. SL729"
                        />
                    </Field>
                    <Field label="To storage">
                        <Input
                            value={change.to_storage}
                            onChange={(e) =>
                                onChange({
                                    ...change,
                                    to_storage: e.target.value
                                })
                            }
                            placeholder="e.g. SL35"
                        />
                    </Field>
                </div>
            )}

            {change.kind === "add_entity" && (
                <div className="grid grid-cols-2 gap-2">
                    <Field label="Entity type">
                        <Select
                            value={change.entity_type}
                            onValueChange={(v) =>
                                onChange({
                                    ...change,
                                    entity_type:
                                        v as typeof change.entity_type
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(
                                    [
                                        "Terminal",
                                        "ParkingArea",
                                        "Scale",
                                        "Storage",
                                        "Crossing"
                                    ] as const
                                ).map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Name">
                        <Input
                            value={change.name}
                            onChange={(e) =>
                                onChange({
                                    ...change,
                                    name: e.target.value
                                })
                            }
                            placeholder="e.g. B020"
                        />
                    </Field>
                    {change.entity_type === "Terminal" && (
                        <Field label="Terminal type">
                            <Select
                                value={change.terminal_typ ?? ""}
                                onValueChange={(v) =>
                                    onChange({
                                        ...change,
                                        terminal_typ:
                                            v as typeof change.terminal_typ
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(
                                        [
                                            "CheckIn",
                                            "CheckOut",
                                            "Waagenterminal",
                                            "Schrankenterminal"
                                        ] as const
                                    ).map((t) => (
                                        <SelectItem key={t} value={t}>
                                            {t}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    )}
                </div>
            )}
        </div>
    );
}

function Field({
    label,
    children
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <Label className="text-xs">{label}</Label>
            {children}
        </div>
    );
}

function emptyChangeOf(kind: ProposalChange["kind"]): ProposalChange {
    switch (kind) {
        case "capacity":
            return { kind: "capacity", entity: "", from: 0, to: 0 };
        case "stagger_orders":
            return { kind: "stagger_orders", description: "" };
        case "reroute":
            return {
                kind: "reroute",
                material: "",
                from_storage: "",
                to_storage: ""
            };
        case "add_entity":
            return {
                kind: "add_entity",
                entity_type: "Terminal",
                terminal_typ: "Schrankenterminal",
                name: ""
            };
    }
}
