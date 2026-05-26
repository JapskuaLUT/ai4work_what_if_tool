// ui/src/components/logisticLogs/FloatingLogsChat.tsx
//
// Floating chat for asking the LLM about the LT 010 check-in logs.
// Mirrors FloatingYardChat in structure; the prompt + context builders
// know about the kiosk vocabulary and the glossary used in the UI so
// the model can speak the same language as what the user sees on screen.

import { useEffect, useRef, useState } from "react";
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
    LogOverview,
    LogSession,
    StepAggregate
} from "@/types/logisticLogs";
import { formatDuration } from "@/services/logisticLogsService";
import { describeStep, phaseStyle } from "@/services/logisticLogsGlossary";

interface Props {
    overview: LogOverview | null;
    sessions: LogSession[];
    aggregates: StepAggregate[];
    /** Currently drilled-in session (gets included as focused context). */
    selectedSession: LogSession | null;
}

export function FloatingLogsChat({
    overview,
    sessions,
    aggregates,
    selectedSession
}: Props) {
    const { globalModel, availableModels: contextModels } = useModelContext();

    const [model, setModel] = useState("");
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

    // Re-seed welcome when scope changes
    useEffect(() => {
        setIsInitialized(false);
    }, [selectedSession?.processId, overview?.sessionCount]);

    useEffect(() => {
        if (!isInitialized && model && !loading && isChatOpen && overview) {
            setMessages([
                {
                    id: "initial-" + Date.now(),
                    role: "assistant",
                    content: welcomeMessage(overview, selectedSession)
                }
            ]);
            setIsInitialized(true);
        }
    }, [
        overview,
        selectedSession,
        model,
        loading,
        isInitialized,
        isChatOpen
    ]);

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

    const closeChat = () => {
        setIsChatOpen(false);
        setIsExpanded(false);
    };

    useEffect(() => {
        function onClick(e: MouseEvent) {
            const target = e.target as HTMLElement;
            if (
                target.closest('[role="combobox"]') ||
                target.closest('[role="listbox"]')
            )
                return;
            if (
                chatCardRef.current &&
                !chatCardRef.current.contains(e.target as Node)
            ) {
                closeChat();
            }
        }
        if (isChatOpen) document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [isChatOpen]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape" && isChatOpen) closeChat();
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isChatOpen]);

    const handleSubmit = async (message: string) => {
        if (!message.trim() || loading || !model || !overview) return;
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
                        systemPrompt() +
                        "\n\nHere is the current data:\n" +
                        buildContext(
                            overview,
                            sessions,
                            aggregates,
                            selectedSession
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
            await streamChat(chatMessages, {
                model,
                options: { temperature: 0.3, num_predict: 1024 }
            });
        } catch (err) {
            console.error("Failed to generate response:", err);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantMessageId
                        ? {
                              ...m,
                              content: "Error: failed to generate response"
                          }
                        : m
                )
            );
            setStreamingMessageId(null);
        }
    };

    const resetChat = () => {
        if (loading) cancelStream();
        if (!overview) return;
        setMessages([
            {
                id: "initial-" + Date.now(),
                role: "assistant",
                content: welcomeMessage(overview, selectedSession)
            }
        ]);
        setStreamingMessageId(null);
    };

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

    const chatTitle = selectedSession
        ? `Session #${selectedSession.processId}`
        : "Kiosk logs";

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
                            description={
                                overview
                                    ? `${overview.location} · ${overview.sessionCount} sessions`
                                    : ""
                            }
                            isExpanded={isExpanded}
                            model={model}
                            availableModels={mergedAvailableModels}
                            loadingModels={isLoadingModels}
                            onModelChange={setModel}
                            onReset={resetChat}
                            onToggleExpand={() => setIsExpanded(!isExpanded)}
                            onClose={closeChat}
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
                                disabled={!model || !overview}
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

function systemPrompt(): string {
    return `You are an analyst helping a planner interpret process-mining data from an LT 010 truck check-in kiosk.

DOMAIN
- The kiosk runs a fixed flow: language → ident-code → vehicle/driver info → safety acks → prior-load history → cleaning history → documents/signature → completion.
- Step names in the raw data are German operator vocabulary (e.g. "SPRACHAUSWAHL", "EINGABE KENNZEICHEN"). The supplied data block translates each step to English and tags it with a workflow phase. **Always speak English to the user, but reference the German label in parentheses on first mention** so they can correlate.
- "DIALOG" steps are driver-facing inputs; "PROCESS" steps are internal state transitions. Driver-perceived delays only happen during DIALOG steps and the gaps between them.
- "PII" tag flags steps whose captured values include personal data (driver name, signature). Never quote masked PII verbatim — describe it categorically.

WHEN YOU ANSWER
- Cite numbers from the supplied data block; don't invent metrics.
- Distinguish "typical" (p50) from "tail" (p95) explicitly. Long tails (p95 >> p50) usually mean a driver walked away or got stuck mid-dialog.
- Be concrete about which dialog or phase a problem lives in. If asked "what should we improve?", propose changes on the slowest dialogs first.
- If a session reached "Show closing screen" (ANZEIGE SCHLUSSBILD) it completed; otherwise it may have been abandoned.
- Keep answers under ~6 short paragraphs unless asked for more depth.`;
}

function buildContext(
    overview: LogOverview,
    sessions: LogSession[],
    aggregates: StepAggregate[],
    selectedSession: LogSession | null
): string {
    const lines: string[] = [];

    lines.push("=== OVERVIEW ===");
    lines.push(
        `  location: ${overview.location} · topic: ${overview.topic}`
    );
    lines.push(
        `  events: ${overview.rowCount} · sessions: ${overview.sessionCount}`
    );
    lines.push(
        `  date range: ${overview.earliestDate} → ${overview.latestDate}`
    );
    lines.push(
        `  session duration:  min ${formatDuration(overview.durationStats.minSec)}  median ${formatDuration(overview.durationStats.medianSec)}  p95 ${formatDuration(overview.durationStats.p95Sec)}  max ${formatDuration(overview.durationStats.maxSec)}`
    );
    lines.push(
        `  events/session:    min ${overview.eventStats.min}  median ${overview.eventStats.median}  p95 ${overview.eventStats.p95}  max ${overview.eventStats.max}`
    );
    lines.push("");

    // Top dialogs by p50
    lines.push("=== TOP DIALOGS BY MEDIAN TIME (English / German / phase / count / p50 / p95) ===");
    const dialogs = aggregates.filter((a) => a.type === "DIALOG").slice(0, 20);
    for (const d of dialogs) {
        const g = describeStep(d.stepInfo);
        lines.push(
            `  ${g.en}  /  ${d.stepInfo}  /  ${phaseStyle(g.phase).label}  /  n=${d.count}  p50=${formatDuration(d.p50Sec)}  p95=${formatDuration(d.p95Sec)}`
        );
    }
    lines.push("");

    // Slowest sessions
    const slowest = [...sessions]
        .sort((a, b) => b.durationSec - a.durationSec)
        .slice(0, 5);
    lines.push("=== 5 SLOWEST SESSIONS ===");
    for (const s of slowest) {
        const completed = s.rows.some(
            (r) => r.procstepinfo === "ANZEIGE SCHLUSSBILD"
        )
            ? "completed"
            : "may-be-abandoned";
        lines.push(
            `  #${s.processId}  started ${s.startedAt}  ${formatDuration(s.durationSec)}  events=${s.eventCount}  stepKinds=${s.stepCount}  ${completed}`
        );
    }
    lines.push("");

    // Focus session
    if (selectedSession) {
        const s = selectedSession;
        lines.push("=== FOCUS SESSION ===");
        lines.push(
            `  #${s.processId}  ${s.startedAt} → ${s.endedAt}  duration ${formatDuration(s.durationSec)}  events ${s.eventCount}  distinct steps ${s.stepCount}`
        );
        lines.push(
            `  license plate: ${s.licensePlate ?? "—"}  ·  captured values: ${s.capturedValues.length}`
        );
        // Per-phase totals for this session
        const phaseTotals = new Map<string, number>();
        const open = new Map<string, number>();
        for (const r of s.rows) {
            if (r.procstepaction === "Start") {
                open.set(r.procstepinfo, Date.parse(r.date));
            } else if (open.has(r.procstepinfo)) {
                const dur =
                    (Date.parse(r.date) -
                        (open.get(r.procstepinfo) ?? Date.parse(r.date))) /
                    1000;
                const phase = phaseStyle(describeStep(r.procstepinfo).phase)
                    .label;
                phaseTotals.set(
                    phase,
                    (phaseTotals.get(phase) ?? 0) + Math.max(0, dur)
                );
                open.delete(r.procstepinfo);
            }
        }
        if (phaseTotals.size > 0) {
            lines.push("  per-phase totals:");
            for (const [phase, sec] of [...phaseTotals.entries()].sort(
                (a, b) => b[1] - a[1]
            )) {
                lines.push(`    ${phase}: ${formatDuration(sec)}`);
            }
        }
    }

    return lines.join("\n");
}

function welcomeMessage(
    overview: LogOverview,
    selectedSession: LogSession | null
): string {
    if (selectedSession) {
        return `I'm focused on **session #${selectedSession.processId}** (${formatDuration(
            selectedSession.durationSec
        )}, ${selectedSession.eventCount} events).

Things you might ask:
- *Where did this driver spend most of their time?*
- *Did anything go wrong, or look like a stall?*
- *How does this session compare to typical sessions?*
- *Which dialog tends to take longest across all sessions?*`;
    }
    return `I'm looking at **${overview.sessionCount} sessions** at the **${overview.location}** check-in kiosk (median ${formatDuration(
        overview.durationStats.medianSec
    )}/session, p95 ${formatDuration(overview.durationStats.p95Sec)}).

Things you might ask:
- *Which dialogs take the longest, and what does that imply for the driver experience?*
- *Are there sessions that look abandoned?*
- *Where in the flow do most drivers struggle?*
- *What would a simple kiosk UX change improve the most?*`;
}
