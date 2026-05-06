// ui/src/components/yard/FloatingYardChat.tsx
// Floating chat for discussing yard logistics simulator runs.

import { useState, useEffect, useRef } from "react";
import { useOllama } from "@/hooks/useOllama";
import { useModelContext } from "@/contexts/ModelContext";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessagesContainer } from "@/components/chat/ChatMessagesContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { FloatingChatButton } from "@/components/chat/FloatingChatButton";
import { Message } from "@/types/chat";
import type {
    ProposalChange,
    YardProposal,
    YardRunDetail,
    YardRunSummary,
    YardSimulationOverview
} from "@/types/yard";
import { formatSeconds } from "@/services/yardSimulationService";

interface Props {
    overview: YardSimulationOverview;
    /** When the user has a specific run tab open, the model gets focused
     *  context for that run; null/undefined → comparison-mode context. */
    activeRun?: YardRunDetail | null;
    /** When set, the chat opens automatically with the proposal injected
     *  into the system context. The chat is in "discuss this proposal"
     *  mode until the user closes it (which fires onClearDiscussion). */
    discussionProposal?: YardProposal | null;
    onClearDiscussion?: () => void;
}

export function FloatingYardChat({
    overview,
    activeRun,
    discussionProposal,
    onClearDiscussion
}: Props) {
    const { globalModel, availableModels: contextModels } = useModelContext();

    const [model, setModel] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
        null
    );
    const chatCardRef = useRef<HTMLDivElement>(null);

    const {
        loading,
        error,
        streamingResponse,
        response,
        availableModels,
        loadingModels,
        streamChat,
        fetchModels,
        cancelStream
    } = useOllama();

    const isLargeScreen =
        typeof window !== "undefined" ? window.innerWidth >= 1024 : false;

    useEffect(() => {
        if (globalModel && !model) setModel(globalModel);
    }, [globalModel, model]);

    useEffect(() => {
        if (contextModels.length === 0) fetchModels().catch(console.error);
    }, [fetchModels, contextModels]);

    useEffect(() => {
        if (!model && availableModels.length > 0) {
            setModel(availableModels[0].name);
        }
    }, [availableModels, model]);

    // Re-issue welcome whenever the focus changes (run, case, or discussion)
    useEffect(() => {
        setIsInitialized(false);
    }, [activeRun?.run_id, overview.case_id, discussionProposal?.id]);

    // Auto-open the chat when a discussion target is set
    useEffect(() => {
        if (discussionProposal) setIsChatOpen(true);
    }, [discussionProposal?.id]);

    useEffect(() => {
        if (!isInitialized && model && !loading && isChatOpen) {
            setMessages([
                {
                    id: "initial-" + Date.now(),
                    role: "assistant",
                    content: createWelcomeMessage(
                        overview,
                        activeRun,
                        discussionProposal
                    )
                }
            ]);
            setIsInitialized(true);
        }
    }, [
        overview,
        activeRun,
        discussionProposal,
        model,
        loading,
        isInitialized,
        isChatOpen
    ]);

    // Stream the in-flight assistant message
    useEffect(() => {
        if (streamingMessageId && streamingResponse) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === streamingMessageId
                        ? { ...m, content: streamingResponse }
                        : m
                )
            );
        }
    }, [streamingResponse, streamingMessageId]);

    useEffect(() => {
        if (!loading && streamingMessageId && response) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === streamingMessageId
                        ? { ...m, content: response }
                        : m
                )
            );
            setStreamingMessageId(null);
        }
    }, [loading, response, streamingMessageId]);

    // Click outside / Escape to close. Both paths also end any active
    // proposal discussion, matching the explicit close button.
    const closeAndClearDiscussion = () => {
        setIsChatOpen(false);
        setIsExpanded(false);
        if (discussionProposal && onClearDiscussion) onClearDiscussion();
    };

    useEffect(() => {
        function onClick(e: MouseEvent) {
            const target = e.target as HTMLElement;
            if (
                target.closest('[role="combobox"]') ||
                target.closest('[role="listbox"]')
            ) {
                return;
            }
            if (
                chatCardRef.current &&
                !chatCardRef.current.contains(e.target as Node)
            ) {
                closeAndClearDiscussion();
            }
        }
        if (isChatOpen) document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
        // closeAndClearDiscussion captures latest discussionProposal via render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isChatOpen, discussionProposal?.id]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape" && isChatOpen) {
                closeAndClearDiscussion();
            }
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isChatOpen, discussionProposal?.id]);

    const handleSubmit = async (message: string) => {
        if (!message.trim() || loading || !model) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: message
        };
        setMessages((prev) => [...prev, userMessage]);

        const assistantMessageId = (Date.now() + 1).toString();
        setMessages((prev) => [
            ...prev,
            { id: assistantMessageId, role: "assistant", content: "" }
        ]);
        setStreamingMessageId(assistantMessageId);

        try {
            const chatMessages = [
                {
                    role: "system" as const,
                    content:
                        createSystemPrompt(
                            overview,
                            activeRun,
                            discussionProposal
                        ) +
                        "\n\nHere is the current data:\n" +
                        createYardContext(
                            overview,
                            activeRun,
                            discussionProposal
                        )
                },
                ...messages
                    .filter(
                        (m) => m.role === "user" || m.role === "assistant"
                    )
                    .map((m) => ({
                        role: m.role as "user" | "assistant",
                        content: m.content
                    })),
                { role: "user" as const, content: message }
            ];
            await streamChat(chatMessages, { model });
        } catch (err) {
            console.error("Failed to generate response:", err);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantMessageId
                        ? { ...m, content: "Error: failed to generate response" }
                        : m
                )
            );
            setStreamingMessageId(null);
        }
    };

    const resetChat = () => {
        if (loading) cancelStream();
        setMessages([
            {
                id: "initial-" + Date.now(),
                role: "assistant",
                content: createWelcomeMessage(
                    overview,
                    activeRun,
                    discussionProposal
                )
            }
        ]);
        setStreamingMessageId(null);
    };

    const handleClose = () => {
        setIsChatOpen(false);
        setIsExpanded(false);
        // Closing the chat ends a proposal discussion — re-opening the
        // floating button gives a fresh chat.
        if (discussionProposal && onClearDiscussion) onClearDiscussion();
    };

    // Both modes need a *concrete* height: the Card uses `h-full` and the
    // messages region uses `flex-1 min-h-0 overflow-y-auto` to scroll, and
    // those only resolve against a parent with a defined height. With
    // `height: auto` the flex chain collapses to natural content size and
    // the scroll never engages. So compact mode picks a comfortable fixed
    // height (capped to viewport on tiny screens); expanded mode fills the
    // viewport.
    const getStyles = () => {
        if (!isExpanded) {
            return {
                width: "420px",
                height: "min(620px, calc(100vh - 3rem))"
            };
        }
        return {
            width: isLargeScreen ? "60%" : "92%",
            maxWidth: "1100px",
            height: "calc(100vh - 3rem)"
        };
    };

    const mergedAvailableModels =
        contextModels.length > 0 ? contextModels : availableModels;
    const isLoadingModels =
        loadingModels && mergedAvailableModels.length === 0;
    const chatTitle = discussionProposal
        ? `Discuss: ${truncateForTitle(discussionProposal.title)}`
        : activeRun
          ? `${activeRun.label} run`
          : "Yard comparison";

    return (
        <>
            <FloatingChatButton
                isChatOpen={isChatOpen}
                onClick={() => setIsChatOpen(true)}
            />
            <div
                className={cn(
                    "fixed bottom-6 right-6 z-50 shadow-xl transition-all duration-300",
                    isChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                ref={chatCardRef}
                style={getStyles()}
            >
                <Card className="border border-indigo-200 dark:border-indigo-900 h-full flex flex-col overflow-hidden">
                    <CardHeader className="bg-indigo-50 dark:bg-indigo-900/20 py-3 px-4 border-b border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                        <ChatHeader
                            headerText={chatTitle}
                            description={overview.name}
                            isExpanded={isExpanded}
                            model={model}
                            availableModels={mergedAvailableModels}
                            loadingModels={isLoadingModels}
                            onModelChange={setModel}
                            onReset={resetChat}
                            onToggleExpand={() => setIsExpanded(!isExpanded)}
                            onClose={handleClose}
                            loading={loading}
                        />
                    </CardHeader>
                    <CardContent className="pt-4 pb-4 flex-1 min-h-0 flex flex-col">
                        {(isLoadingModels ||
                            mergedAvailableModels.length === 0) && (
                            <div className="mb-4 p-2 text-xs bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 flex-shrink-0">
                                {isLoadingModels
                                    ? "Loading available models..."
                                    : "No models available. Make sure Ollama is running on the host."}
                            </div>
                        )}
                        {/* Scrolls when the conversation is longer than the card height */}
                        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                            <ChatMessagesContainer
                                messages={messages}
                                isExpanded={isExpanded}
                                isLoading={loading}
                                streamingMessageId={streamingMessageId}
                                error={error}
                            />
                        </div>
                        <div className="mt-3 flex-shrink-0">
                            <ChatInput
                                onSubmit={handleSubmit}
                                onStop={cancelStream}
                                isLoading={loading}
                                isExpanded={isExpanded}
                                disabled={!model}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="pt-0 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex-shrink-0">
                        <div className="text-xs text-slate-500">
                            Shift+Enter for new line
                        </div>
                        {isExpanded && (
                            <div className="text-xs text-slate-500 ml-auto">
                                Press ESC to close
                            </div>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Prompt + context builders
// ---------------------------------------------------------------------------

function createSystemPrompt(
    overview: YardSimulationOverview,
    activeRun?: YardRunDetail | null,
    discussionProposal?: YardProposal | null
): string {
    const base = `You are a yard-logistics analyst helping the user reason about simulator outputs for a truck-yard comparison set ("${overview.name}").

The yard is a directed graph of entities — Terminals (CheckIn/CheckOut/scale/barrier), ParkingArea, Scales, Storages (silos with materials), Crossings — connected by Streets. Trucks arrive following an Order list (offsetMinutes, license plate, material, action, kg) and follow Process recipes (CheckIn → Park → Authenticate → Loading/Unloading → CheckOut). The simulator emits per-truck timelines with WaitingTime / DrivingTime and a global Summary (orders completed/incomplete/unhandled).

When you reason:
- Cite numbers and entity names from the supplied data; do not invent metrics.
- For run-vs-run comparisons, use the ComparisonInformation hashes — equal hash means that block is identical between runs (yard layout, process recipes, or order list). Most "what changed?" questions are answered by which hash differs.
- Bottleneck rule: an entity is saturated when max_concurrent > max_occupancy (queue_score > 1.0). Surface that and explain consequences.
- Special bottleneck "(off-yard waiting)" with type ExternalWait represents trucks queued *outside* the yard because their first required entity (typically a CheckIn terminal) was occupied. Treat its peak as an arrival-rate vs check-in-capacity problem; fixing it usually means more CheckIn capacity or staggered order arrivals, not internal yard layout changes.
- Be concrete about what would help: capacity (more parking, second barrier/scale), order pacing (stagger offsetMinutes), or routing (different storage assignments).
- Do not invent simulator features the user has not mentioned (this app only ingests results; it does not yet run the simulator).
`;

    if (discussionProposal) {
        return (
            base +
            `\nThe user is now discussing a specific improvement proposal (see "PROPOSAL UNDER DISCUSSION" in the data block). Default your answers to that proposal: critique it, predict its impact, surface risks, suggest alternatives, and tell the user what the simulator is most likely to show. The proposal is advisory — it has NOT been validated by the simulator yet. If the user asks comparative questions, answer those honestly using the runs' summaries below.`
        );
    }

    if (activeRun) {
        return (
            base +
            `\nThe user is currently focused on the "${activeRun.label}" run. Default your answers to that run unless they ask comparatively.`
        );
    }
    return (
        base +
        `\nThe user is on the comparison overview across all runs. Default to comparative answers and call out which run is best/worst on the dimension being asked about.`
    );
}

function createYardContext(
    overview: YardSimulationOverview,
    activeRun?: YardRunDetail | null,
    discussionProposal?: YardProposal | null
): string {
    const lines: string[] = [];

    // When discussing a proposal, lead with the proposal block — it's the
    // most relevant context for every question that follows.
    if (discussionProposal) {
        lines.push(...formatProposalBlock(discussionProposal, overview));
        lines.push("");
    }

    // Yard layout summary (when present)
    const e = overview.yard_structure?.Entities;
    if (e) {
        lines.push(
            `Yard layout: ${e.Terminals.length} terminals, ${e.ParkingAreas.length} parking, ${e.Scales.length} scales, ${e.Storages.length} storages, ${e.Crossings.length} crossings, ${overview.yard_structure?.Streets.length ?? 0} streets.`
        );
        const checkin = e.Terminals.find((t) => t.Typ === "CheckIn");
        const checkout = e.Terminals.find((t) => t.Typ === "CheckOut");
        const barrier = e.Terminals.find(
            (t) => t.Typ === "Schrankenterminal"
        );
        const named: string[] = [];
        if (checkin) named.push(`check-in ${checkin.Name}`);
        if (checkout) named.push(`check-out ${checkout.Name}`);
        if (barrier) named.push(`barrier ${barrier.Name}`);
        for (const p of e.ParkingAreas)
            named.push(`parking ${p.Name} (cap ${p.Capacity})`);
        for (const sc of e.Scales) named.push(`scale ${sc.Name}`);
        if (named.length) lines.push("Key entities: " + named.join(", ") + ".");
    }
    lines.push("");

    // Per-run summary table (always included; the model uses this for comparison)
    lines.push(`Runs (${overview.runs.length}):`);
    for (const r of overview.runs) {
        const m = r.summary_metrics;
        lines.push(
            `- ${r.label} [run_id=${r.run_id}]:`
        );
        lines.push(
            `    orders: ${m.orders.completed}/${m.orders.overall} completed (${m.orders.incomplete} incomplete, ${m.orders.unhandled} unhandled)`
        );
        lines.push(
            `    waiting: total=${formatSeconds(m.waiting_seconds.total)}, avg=${formatSeconds(m.waiting_seconds.avg)}, max=${formatSeconds(m.waiting_seconds.max)}, p95=${formatSeconds(m.waiting_seconds.p95)}`
        );
        lines.push(
            `    driving: total=${formatSeconds(m.driving_seconds.total)}, avg=${formatSeconds(m.driving_seconds.avg)}`
        );
        lines.push(
            `    throughput: ${m.throughput.orders_per_hour.toFixed(1)} orders/hour over ${Math.round(m.throughput.last_completion_min - m.throughput.first_order_min)} min`
        );
        if (m.bottlenecks.length) {
            const b = m.bottlenecks
                .slice(0, 3)
                .map(
                    (x) =>
                        `${x.entity}(${x.type}, ${x.max_concurrent}/${x.max_occupancy}, score ${x.queue_score.toFixed(2)})`
                )
                .join(", ");
            lines.push(`    top bottlenecks: ${b}`);
        }
        lines.push(
            `    hashes: yard=${shortHash(r.yard_hash)} processes=${shortHash(r.processes_hash)} orders=${shortHash(r.orders_hash)}`
        );
    }
    lines.push("");

    // Hash-based delta summary
    const hashSummary = describeHashDeltas(overview);
    if (hashSummary) {
        lines.push("What differs between runs:");
        lines.push(hashSummary);
        lines.push("");
    }

    // Active run focus (when one tab is open)
    if (activeRun) {
        lines.push(`Focus run: ${activeRun.label}`);
        lines.push(`  orders received: ${activeRun.orders.length}`);
        const offsetSpan =
            activeRun.orders.length > 0
                ? Math.max(...activeRun.orders.map((o) => o.offsetMinutes)) -
                  Math.min(...activeRun.orders.map((o) => o.offsetMinutes))
                : 0;
        lines.push(
            `  arrival window: ${offsetSpan} min (offsetMinutes range)`
        );
        // Material breakdown
        const byMaterial = new Map<string, number>();
        for (const o of activeRun.orders) {
            byMaterial.set(o.material, (byMaterial.get(o.material) ?? 0) + 1);
        }
        const mats = [...byMaterial.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([m, n]) => `${m}×${n}`)
            .join(", ");
        if (mats) lines.push(`  materials: ${mats}`);
    }

    return lines.join("\n");
}

function describeHashDeltas(overview: YardSimulationOverview): string | null {
    if (overview.runs.length < 2) return null;
    const first = overview.runs[0];
    const yardSame = overview.runs.every(
        (r) => r.yard_hash === first.yard_hash
    );
    const procSame = overview.runs.every(
        (r) => r.processes_hash === first.processes_hash
    );
    const ordersSame = overview.runs.every(
        (r) => r.orders_hash === first.orders_hash
    );
    const parts: string[] = [];
    if (yardSame) parts.push("- Yard layout: identical across all runs.");
    else parts.push("- Yard layout: differs between runs.");
    if (procSame) parts.push("- Processes: identical across all runs.");
    else parts.push("- Processes: differ between runs.");
    if (ordersSame) parts.push("- Orders: identical across all runs.");
    else parts.push("- Orders: differ between runs (this is usually the driver of waiting-time differences).");
    return parts.join("\n");
}

function shortHash(h: string | null): string {
    if (!h) return "—";
    return h.slice(0, 8);
}

function createWelcomeMessage(
    overview: YardSimulationOverview,
    activeRun?: YardRunDetail | null,
    discussionProposal?: YardProposal | null
): string {
    if (discussionProposal) {
        const targetRun = discussionProposal.target_run_id
            ? overview.runs.find(
                  (r) => r.run_id === discussionProposal.target_run_id
              )
            : null;
        const changeBullets = discussionProposal.changes
            .map((c) => `• ${formatChange(c)}`)
            .join("\n");
        return `Let's pick apart **${discussionProposal.title}**${targetRun ? ` for the **${targetRun.label}** run` : ""}.

Proposed changes:
${changeBullets}
${discussionProposal.expected_impact ? `\n_Expected impact:_ ${discussionProposal.expected_impact}` : ""}
${discussionProposal.risks ? `\n_Risks:_ ${discussionProposal.risks}` : ""}

Things you might ask:
- *How confident are you that this fixes the bottleneck?*
- *What could go wrong — second-order effects on other entities?*
- *What would the simulator most likely show when this runs?*
- *Are there cheaper alternatives that get most of the benefit?*
- *Which numbers in the data support or contradict the expected impact?*

Reminder: this proposal hasn't been validated by the simulator yet — your answers are hypotheses based on the run data.`;
    }
    if (activeRun) {
        const m = activeRun.summary_metrics;
        const top = m.bottlenecks[0];
        return `I'm looking at the **${activeRun.label}** run. Quick facts:
• ${m.orders.completed}/${m.orders.overall} orders completed
• max wait ${formatSeconds(m.waiting_seconds.max)}, total wait ${formatSeconds(m.waiting_seconds.total)}
• throughput ${m.throughput.orders_per_hour.toFixed(1)} orders/hour
${top ? `• top bottleneck: **${top.entity}** (${top.max_concurrent}/${top.max_occupancy})` : ""}

Things you might ask:
- *Why is ${top?.entity ?? "this entity"} the bottleneck?*
- *Which trucks waited the longest, and where?*
- *If I added another ${top?.type === "Terminal" ? "barrier" : top?.type?.toLowerCase() ?? "resource"}, would the bottleneck shift?*
- *How does this run compare to the others?*`;
    }
    return `I'm looking at the **${overview.name}** comparison set with ${overview.runs.length} runs: ${overview.runs.map((r) => r.label).join(", ")}.

Things you might ask:
- *Which run is best, and why?*
- *What single change would help the worst run the most?*
- *What actually changed between runs — the layout, the processes, or just the orders?*
- *Are any runs hitting the same bottleneck for different reasons?*`;
}

// ---------------------------------------------------------------------------
// Proposal-discussion helpers
// ---------------------------------------------------------------------------

function truncateForTitle(s: string): string {
    return s.length <= 36 ? s : s.slice(0, 33) + "…";
}

function formatChange(c: ProposalChange): string {
    switch (c.kind) {
        case "capacity":
            return `[capacity] ${c.entity}: ${c.from} → ${c.to}${c.note ? ` — ${c.note}` : ""}`;
        case "stagger_orders":
            return `[stagger] ${c.description}${typeof c.target_arrivals_per_min === "number" ? ` (target ${c.target_arrivals_per_min}/min)` : ""}`;
        case "reroute":
            return `[reroute] material ${c.material}: ${c.from_storage} → ${c.to_storage}`;
        case "add_entity":
            return `[add] ${c.entity_type}${c.terminal_typ ? `(${c.terminal_typ})` : ""} ${c.name}${c.connects?.length ? ` via ${c.connects.join(", ")}` : ""}`;
    }
}

function formatProposalBlock(
    p: YardProposal,
    overview: YardSimulationOverview
): string[] {
    const lines: string[] = [];
    lines.push("PROPOSAL UNDER DISCUSSION");
    lines.push(`  title: ${p.title}`);
    lines.push(`  source: ${p.source}`);
    if (p.target_bottleneck) {
        lines.push(`  target_bottleneck: ${p.target_bottleneck}`);
    }
    if (p.target_run_id) {
        const run = overview.runs.find(
            (r) => r.run_id === p.target_run_id
        ) as YardRunSummary | undefined;
        lines.push(`  target_run: ${p.target_run_id}`);
        if (run) {
            const m = run.summary_metrics;
            const top = m.bottlenecks[0];
            lines.push(
                `  target_run KPIs: ${m.orders.completed}/${m.orders.overall} orders, max wait ${formatSeconds(m.waiting_seconds.max)}, total wait ${formatSeconds(m.waiting_seconds.total)}, throughput ${m.throughput.orders_per_hour.toFixed(1)}/h`
            );
            if (top) {
                lines.push(
                    `  target_run top bottleneck: ${top.entity} (${top.type}, ${top.max_concurrent}/${top.max_occupancy}, queue_score ${top.queue_score.toFixed(2)})`
                );
            }
        }
    }
    lines.push(`  summary: ${p.summary}`);
    if (p.expected_impact) lines.push(`  expected_impact: ${p.expected_impact}`);
    if (p.risks) lines.push(`  risks: ${p.risks}`);
    lines.push("  changes:");
    for (const c of p.changes) lines.push(`    - ${formatChange(c)}`);
    return lines;
}
