// ui/src/components/yard/ProposalCard.tsx

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Save,
    Trash2,
    Send,
    Sparkles,
    User,
    AlertTriangle,
    Info,
    MessageCircle
} from "lucide-react";
import type {
    ProposalChange,
    ProposalValidation,
    YardProposal,
    YardProposalDraft
} from "@/types/yard";

type Source = "ai-draft" | "saved";

interface CommonProps {
    /** Optional inline validation feedback (errors/warnings) to render. */
    validation?: ProposalValidation;
    /** True while a save/delete operation is in flight. */
    busy?: boolean;
}

interface DraftProps extends CommonProps {
    kind: "draft";
    draft: YardProposalDraft;
    onSave: (d: YardProposalDraft) => void;
    onDiscard: (d: YardProposalDraft) => void;
}

interface SavedProps extends CommonProps {
    kind: "saved";
    proposal: YardProposal;
    onDelete: (p: YardProposal) => void;
    /** Optional: open the floating chat preloaded with this proposal. */
    onDiscuss?: (p: YardProposal) => void;
}

type Props = DraftProps | SavedProps;

export function ProposalCard(props: Props) {
    const isDraft = props.kind === "draft";
    const data = isDraft ? props.draft : props.proposal;
    const sourceTag: Source =
        isDraft || data.source === "ai" ? "ai-draft" : "saved";

    return (
        <Card
            className={
                isDraft
                    ? "border-amber-300 bg-amber-50/30"
                    : "border-gray-200"
            }
        >
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                            <SourceBadge
                                source={data.source ?? "ai"}
                                isDraft={isDraft}
                            />
                            {data.title}
                        </CardTitle>
                        <div className="text-xs text-gray-500 mt-1">
                            {data.target_run_id && (
                                <span className="mr-3">
                                    Target run:{" "}
                                    <span className="font-medium">
                                        {data.target_run_id}
                                    </span>
                                </span>
                            )}
                            {data.target_bottleneck && (
                                <span>
                                    Bottleneck:{" "}
                                    <span className="font-medium">
                                        {data.target_bottleneck}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {isDraft ? (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => props.onSave(props.draft)}
                                    disabled={props.busy}
                                >
                                    <Save className="mr-1 h-3 w-3" />
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        props.onDiscard(props.draft)
                                    }
                                    disabled={props.busy}
                                >
                                    Discard
                                </Button>
                            </>
                        ) : (
                            <>
                                {props.onDiscuss && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            props.onDiscuss!(props.proposal)
                                        }
                                        disabled={props.busy}
                                    >
                                        <MessageCircle className="mr-1 h-3 w-3" />
                                        Discuss
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled
                                    title="Available when the simulator API is wired up"
                                >
                                    <Send className="mr-1 h-3 w-3" />
                                    Send to simulator
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => props.onDelete(props.proposal)}
                                    disabled={props.busy}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-gray-700">{data.summary}</p>

                <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Changes
                    </div>
                    <ul className="space-y-1">
                        {data.changes.map((c, i) => (
                            <li
                                key={i}
                                className="text-sm border rounded px-2 py-1 bg-white"
                            >
                                <ChangeSummary change={c} />
                            </li>
                        ))}
                    </ul>
                </div>

                {data.expected_impact && (
                    <DetailRow
                        label="Expected impact"
                        value={data.expected_impact}
                    />
                )}
                {data.risks && (
                    <DetailRow
                        label="Risks / caveats"
                        value={data.risks}
                        warn
                    />
                )}

                {props.validation &&
                    (props.validation.errors.length > 0 ||
                        props.validation.warnings.length > 0) && (
                        <ValidationBlock validation={props.validation} />
                    )}

                {sourceTag === "ai-draft" && isDraft && (
                    <div className="text-xs text-gray-500 pt-1 border-t flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Draft — kept locally until you save or discard.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SourceBadge({
    source,
    isDraft
}: {
    source: string;
    isDraft: boolean;
}) {
    if (isDraft) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-800 bg-amber-100 rounded-full">
                <Sparkles className="h-3 w-3" />
                AI draft
            </span>
        );
    }
    if (source === "manual") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                <User className="h-3 w-3" />
                Manual
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-purple-800 bg-purple-100 rounded-full">
            <Sparkles className="h-3 w-3" />
            AI
        </span>
    );
}

function ChangeSummary({ change }: { change: ProposalChange }) {
    switch (change.kind) {
        case "capacity":
            return (
                <span>
                    <Tag>capacity</Tag>{" "}
                    <span className="font-medium">{change.entity}</span>:{" "}
                    {change.from} → {change.to}
                    {change.note && (
                        <span className="text-gray-500"> — {change.note}</span>
                    )}
                </span>
            );
        case "stagger_orders":
            return (
                <span>
                    <Tag>stagger</Tag> {change.description}
                    {typeof change.target_arrivals_per_min === "number" && (
                        <span className="text-gray-500">
                            {" "}
                            (target {change.target_arrivals_per_min}/min)
                        </span>
                    )}
                </span>
            );
        case "reroute":
            return (
                <span>
                    <Tag>reroute</Tag> material{" "}
                    <span className="font-medium">{change.material}</span>:{" "}
                    {change.from_storage} → {change.to_storage}
                </span>
            );
        case "add_entity":
            return (
                <span>
                    <Tag>add</Tag> {change.entity_type}
                    {change.terminal_typ ? ` (${change.terminal_typ})` : ""}{" "}
                    <span className="font-medium">{change.name}</span>
                    {change.connects && change.connects.length > 0 && (
                        <span className="text-gray-500">
                            {" "}
                            via {change.connects.join(", ")}
                        </span>
                    )}
                </span>
            );
    }
}

function Tag({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase bg-gray-100 text-gray-600 rounded mr-1">
            {children}
        </span>
    );
}

function DetailRow({
    label,
    value,
    warn
}: {
    label: string;
    value: string;
    warn?: boolean;
}) {
    return (
        <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {label}
            </div>
            <div
                className={`text-sm ${warn ? "text-amber-800" : "text-gray-700"}`}
            >
                {value}
            </div>
        </div>
    );
}

function ValidationBlock({ validation }: { validation: ProposalValidation }) {
    const hasErr = validation.errors.length > 0;
    const hasWarn = validation.warnings.length > 0;
    return (
        <div
            className={`rounded-md p-2 text-xs space-y-1 ${
                hasErr
                    ? "bg-red-50 border border-red-200 text-red-800"
                    : hasWarn
                      ? "bg-amber-50 border border-amber-200 text-amber-800"
                      : ""
            }`}
        >
            {validation.errors.map((e, i) => (
                <div key={`e${i}`} className="flex gap-1">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{e}</span>
                </div>
            ))}
            {validation.warnings.map((w, i) => (
                <div key={`w${i}`} className="flex gap-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{w}</span>
                </div>
            ))}
        </div>
    );
}
