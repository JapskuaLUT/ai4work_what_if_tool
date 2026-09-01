// ui/src/components/stress/FloatingStressChat.tsx
// Floating chat component for discussing educational stress optimization scenarios

import { useState, useEffect, useRef } from "react";
import { useOllama } from "@/hooks/useOllama";
import { useModelContext } from "@/contexts/ModelContext";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CourseAnalysisOutput } from "@/types/educationalStress";
import { getAdjustmentName } from "@/services/educationalStressService";

// Import sub-components
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessagesContainer } from "@/components/chat/ChatMessagesContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { FloatingChatButton } from "@/components/chat/FloatingChatButton";

// Import types
import { Message, type ChatMessage } from "@/types/chat";

interface FloatingStressChatProps {
    simulation: CourseAnalysisOutput;
    adjustmentId?: string;
}

export function FloatingStressChat({
    simulation,
    adjustmentId,
}: FloatingStressChatProps) {
    // Get global model from context
    const { globalModel, availableModels: contextModels } = useModelContext();

    // State
    const [model, setModel] = useState<string>("");
    const [systemPrompt, setSystemPrompt] = useState(
        createSystemPrompt(simulation, adjustmentId)
    );
    const [messages, setMessages] = useState<Message[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const chatCardRef = useRef<HTMLDivElement>(null);

    // Track currently streaming message ID
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
        null
    );

    // Initialize Ollama hook
    const {
        loading,
        error,
        streamingResponse,
        response,
        availableModels,
        loadingModels,
        streamChat,
        fetchModels,
        cancelStream,
    } = useOllama();

    // Determine if we're on a large screen
    const isLargeScreen =
        typeof window !== "undefined" ? window.innerWidth >= 1024 : false;

    // Use the global model when this component initializes
    useEffect(() => {
        if (globalModel && !model) {
            setModel(globalModel);
        }
    }, [globalModel, model]);

    // Fetch models on component mount if needed
    useEffect(() => {
        // Only fetch models if we don't have any from context
        if (contextModels.length === 0) {
            fetchModels().catch(console.error);
        }
    }, [fetchModels, contextModels]);

    // Set default model from locally fetched models if no global model
    useEffect(() => {
        if (!model && availableModels.length > 0) {
            setModel(availableModels[0].name);
        }
    }, [availableModels, model]);

    // Update system prompt when adjustmentId changes
    useEffect(() => {
        setSystemPrompt(createSystemPrompt(simulation, adjustmentId));
        setIsInitialized(false); // Reset initialization to show new welcome message
    }, [adjustmentId, simulation]);

    // Initialize with a welcome message
    useEffect(() => {
        if (!isInitialized && model && !loading && isChatOpen) {
            const initialAssistantMessage: Message = {
                id: "initial",
                role: "assistant",
                content: createWelcomeMessage(simulation, adjustmentId),
            };

            setMessages([initialAssistantMessage]);
            setIsInitialized(true);
        }
    }, [simulation, adjustmentId, model, loading, isInitialized, isChatOpen]);

    // Update the streaming message content as it comes in
    useEffect(() => {
        if (streamingMessageId && streamingResponse) {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === streamingMessageId
                        ? { ...msg, content: streamingResponse }
                        : msg
                )
            );
        }
    }, [streamingResponse, streamingMessageId]);

    // When streaming completes and we have a final response
    useEffect(() => {
        if (!loading && streamingMessageId && response) {
            // Update with final response
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === streamingMessageId
                        ? { ...msg, content: response }
                        : msg
                )
            );
            setStreamingMessageId(null);
        }
    }, [loading, response, streamingMessageId]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Don't close if clicking inside a select menu (dropdown)
            const target = event.target as HTMLElement;
            if (
                target.closest('[role="combobox"]') ||
                target.closest('[role="listbox"]')
            ) {
                return;
            }

            if (
                chatCardRef.current &&
                !chatCardRef.current.contains(event.target as Node)
            ) {
                setIsChatOpen(false);
                // Reset expanded state when closing
                setIsExpanded(false);
            }
        }

        // Attach the event listener only when chat is open
        if (isChatOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isChatOpen]);

    // Handle escape key to close chat
    useEffect(() => {
        function handleEscapeKey(event: KeyboardEvent) {
            if (event.key === "Escape" && isChatOpen) {
                setIsChatOpen(false);
                setIsExpanded(false);
            }
        }

        document.addEventListener("keydown", handleEscapeKey);

        return () => {
            document.removeEventListener("keydown", handleEscapeKey);
        };
    }, [isChatOpen]);

    // Handle chat submission
    const handleSubmit = async (message: string) => {
        if (!message.trim() || loading || !model) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: message,
        };

        setMessages((prev) => [...prev, userMessage]);

        // Create placeholder for assistant message
        const assistantMessageId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: "",
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessageId(assistantMessageId);

        try {
            // Create chat messages array with system prompt and context
            const chatMessages: ChatMessage[] = [
                {
                    role: "system" as const,
                    content:
                        systemPrompt +
                        "\n\nHere are the details of the stress analysis:\n" +
                        createSimulationContext(simulation, adjustmentId),
                },
            ];

            // Add conversation history (excluding system messages)
            messages.forEach((msg) => {
                if (msg.role === "user" || msg.role === "assistant") {
                    chatMessages.push({
                        role: msg.role,
                        content: msg.content,
                    });
                }
            });

            // Add the new user message
            chatMessages.push({
                role: "user",
                content: message,
            });

            await streamChat(chatMessages, { model });
        } catch (err) {
            console.error("Failed to generate response:", err);

            // Update the assistant message with error
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessageId
                        ? {
                              ...msg,
                              content: "Error: Failed to generate response",
                          }
                        : msg
                )
            );
            setStreamingMessageId(null);
        }
    };

    // Toggle expanded mode
    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    // Reset the chat
    const resetChat = () => {
        if (loading) {
            cancelStream();
        }

        // Create a welcome message
        const initialAssistantMessage: Message = {
            id: "initial-" + Date.now(),
            role: "assistant",
            content: createWelcomeMessage(simulation, adjustmentId),
        };

        setMessages([initialAssistantMessage]);
        setStreamingMessageId(null);
    };

    // Handle close
    const handleClose = () => {
        setIsChatOpen(false);
        setIsExpanded(false);
    };

    // Open the chat
    const openChat = () => {
        setIsChatOpen(true);
    };

    // Both modes need a *concrete* height: the Card uses `h-full` and the
    // messages region uses `flex-1 min-h-0 overflow-y-auto` to scroll, and
    // those only resolve against a parent with a defined height. With
    // `height: auto` the flex chain collapses to natural content size and
    // the scroll never engages.
    const getChatStyles = () => {
        if (!isExpanded) {
            return {
                width: "420px",
                height: "min(620px, calc(100vh - 3rem))",
            };
        }
        return {
            width: isLargeScreen ? "60%" : "92%",
            maxWidth: "1100px",
            height: "calc(100vh - 3rem)",
        };
    };

    // Combine available models from context and local fetch
    const mergedAvailableModels =
        contextModels.length > 0 ? contextModels : availableModels;
    const isLoadingModels = loadingModels && mergedAvailableModels.length === 0;

    // Get chat title based on whether we're viewing a specific adjustment
    const chatTitle = adjustmentId
        ? getAdjustmentName(adjustmentId)
        : "Stress Analysis";

    return (
        <>
            {/* Floating chat button */}
            <FloatingChatButton isChatOpen={isChatOpen} onClick={openChat} />

            {/* Chat dialog */}
            <div
                className={cn(
                    "fixed bottom-6 right-6 z-50 shadow-xl transition-all duration-300",
                    isChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                ref={chatCardRef}
                style={getChatStyles()}
            >
                <Card className="border border-indigo-200 dark:border-indigo-900 h-full flex flex-col overflow-hidden">
                    <CardHeader className="bg-indigo-50 dark:bg-indigo-900/20 py-3 px-4 border-b border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                        <ChatHeader
                            headerText={chatTitle}
                            description={simulation.course_info.course_name}
                            isExpanded={isExpanded}
                            model={model}
                            availableModels={mergedAvailableModels}
                            loadingModels={isLoadingModels}
                            onModelChange={setModel}
                            onReset={resetChat}
                            onToggleExpand={toggleExpanded}
                            onClose={handleClose}
                            loading={loading}
                        />
                    </CardHeader>

                    <CardContent className="pt-4 pb-4 flex-1 min-h-0 flex flex-col">
                        {/* Models debug info */}
                        {(isLoadingModels ||
                            mergedAvailableModels.length === 0) && (
                            <div className="mb-4 p-2 text-xs bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 flex-shrink-0">
                                {isLoadingModels
                                    ? "Loading available models..."
                                    : "No models available. Please make sure Ollama is running."}
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

// Create a system prompt for the AI based on the simulation and adjustment
function createSystemPrompt(
    simulation: CourseAnalysisOutput,
    adjustmentId?: string
): string {
    if (isV1Simulation(simulation)) {
        return createV1SystemPrompt(simulation as unknown as V1Like, adjustmentId);
    }
    if (adjustmentId) {
        return `You are an AI assistant specialized in educational stress management and course optimization. You are analyzing a specific optimization scenario "${getAdjustmentName(adjustmentId)}" for the course "${simulation.course_info.course_name}".

Your role is to help the user understand:
- How this specific optimization strategy works
- What changes were made to the weekly schedule and why
- The trade-offs and benefits of this approach
- Whether this strategy suits their teaching goals and student needs
- Suggestions for further refinements or adjustments
- How stress levels changed compared to the original schedule

Be concise, clear, and practical. Focus on actionable insights and pedagogical implications.`;
    }

    return `You are an AI assistant specialized in educational stress management and course optimization. You are analyzing stress optimization results for the course "${simulation.course_info.course_name}" with ${simulation.week_schedules.length} different optimization scenarios.

Your role is to help the user understand:
- How to compare different optimization scenarios
- Which scenario might work best for their specific situation
- The pedagogical implications of different strategies
- How to interpret stress metrics and thresholds
- Practical next steps for implementing changes
- Trade-offs between different optimization approaches

Be concise, clear, and focused on practical guidance that helps educators make informed decisions about their course structure.`;
}

// ---------------------------------------------------------------------------
// course_stress_prediction v1.0 grounding
// ---------------------------------------------------------------------------
//
// A v1 case stores a CourseDefinition in `course_info` and carries a
// `scenarios[]` array with the full comparison. The legacy builders below read
// `ects`, `total_weeks` and `stress_metrics`, none of which exist on a v1
// case, so they are branched around rather than patched — mixing the two would
// silently produce undefined values in the prompt.

type V1Like = {
    stress_model?: { version?: string };
    course?: any;
    course_assignments?: any[];
    course_exams?: any[];
    current_status?: { current_week_number?: number };
    baseline_schedule?: any[];
    scenarios?: any[];
};

function isV1Simulation(simulation: any): boolean {
    const version = simulation?.stress_model?.version;
    return Boolean(version) && version !== "legacy-0";
}

/** Grounds the model in the actual component breakdown, not just one number. */
function createV1Context(simulation: V1Like, adjustmentId?: string): string {
    const course = simulation.course ?? {};
    const scenarios = simulation.scenarios ?? [];
    const weeks = simulation.baseline_schedule ?? [];

    let context = `Course: "${course.course_name}" (${course.course_id})\n`;
    context += `Semester: ${String(course.start_date).slice(0, 10)} to ${String(course.end_date).slice(0, 10)} (${weeks.length} weeks)\n`;
    context += `Difficulty: ${course.topic_difficulty}/5\n`;
    context += `Current week: ${simulation.current_status?.current_week_number ?? 1}\n\n`;

    context += `Stress model: course_stress_prediction v${simulation.stress_model?.version}. `;
    context += `Predicted values are the course's ADDITIVE contribution to a student's stress, on top of a personal baseline of roughly 25-40 points the model cannot observe - they are not anyone's total stress level (this interpretation is the model owners' own clarification). `;
    context += `Each week's score is the sum of seven components - base load, teaching density, homework, assignment, exam, overload and a 7% fatigue carry-over from the previous week - passed through a soft cap; schedule-only output tops out near 60.45. `;
    context += `Thresholds shown in this tool are calibrated to the course-model scale (defaults: warning 45, critical 55). The specification's 75/85 belong to the total-stress scale and cannot fire on this model's output. `;
    context += `A "Moderate" band label can still be the worst week of the semester; compare weeks against each other as well as against the thresholds.\n\n`;

    if (course.assignments?.length) {
        context += `Assignments:\n`;
        for (const a of course.assignments) {
            context += `- ${a.name} (${a.assignment_id}): ${String(a.start_date).slice(0, 10)} to ${String(a.end_date).slice(0, 10)}, ${a.estimated_hours}h\n`;
        }
        context += `\n`;
    }
    if (course.exams?.length) {
        context += `Exams:\n`;
        for (const x of course.exams) {
            context += `- ${x.name} (${x.exam_id}): ${String(x.date_time).slice(0, 10)}\n`;
        }
        context += `\n`;
    }

    const scenario = adjustmentId
        ? scenarios.find((s: any) => s.scenario_id === adjustmentId)
        : undefined;

    if (scenario?.comparison) {
        const c = scenario.comparison;
        context += `Scenario under discussion: "${scenario.name ?? scenario.scenario_id}" (${scenario.origin}).\n`;
        context += `Baseline peak ${c.baseline.peak_stress.toFixed(2)} in week ${c.baseline.peak_week_number}; simulated peak ${c.simulation.peak_stress.toFixed(2)} in week ${c.simulation.peak_week_number}.\n`;
        context += `Average ${c.baseline.average_stress.toFixed(2)} -> ${c.simulation.average_stress.toFixed(2)}. `;
        context += `Warning weeks ${c.baseline.warning_week_numbers.length} -> ${c.simulation.warning_week_numbers.length}.\n`;
        context += `The scenario changed ${c.objective.changed_week_count} week(s) and ${c.objective.changed_event_count} academic event(s), moving ${c.objective.moved_workload_hours.toFixed(1)}h of workload.\n\n`;

        const changed = (c.weekly_results ?? []).filter((w: any) => w.adjusted);
        if (changed.length) {
            context += `Weeks that changed:\n`;
            for (const w of changed) {
                const sim = w.simulation;
                context += `- Week ${w.week_number}: ${w.baseline.predicted_stress.toFixed(2)} -> ${sim.predicted_stress.toFixed(2)} (${sim.classification}). `;
                context += `lecture ${sim.lecture_hours.toFixed(1)}h, lab ${sim.lab_hours.toFixed(1)}h, homework ${sim.homework_hours.toFixed(1)}h, assignment ${sim.assignment_hours.toFixed(1)}h, exam ${sim.exam_hours.toFixed(1)}. `;
                context += `Largest components: ${topComponents(sim.components)}. `;
                if (w.adjustment_details?.length) {
                    context += `Changes: ${w.adjustment_details.join("; ")}.`;
                }
                context += `\n`;
            }
        }
        return context;
    }

    context += `Scenarios available (${scenarios.length}), ranked by peak predicted stress:\n`;
    for (const s of [...scenarios].sort(
        (a: any, b: any) =>
            (a.summary_metrics?.peak_stress ?? 999) -
            (b.summary_metrics?.peak_stress ?? 999)
    )) {
        const m = s.summary_metrics;
        if (!m) continue;
        const delta = s.comparison?.objective?.peak_stress_delta ?? 0;
        context += `- "${s.name ?? s.scenario_id}" (${s.origin}): peak ${m.peak_stress.toFixed(2)} (${delta >= 0 ? "+" : ""}${delta.toFixed(2)} vs baseline), average ${m.average_stress.toFixed(2)}, ${m.total_adjustments_made} adjustment(s)\n`;
    }
    return context;
}

/** The three components contributing most to a week's raw score. */
function topComponents(components: any): string {
    const named = [
        ["base load", components.base],
        ["teaching", components.teaching],
        ["homework", components.homework],
        ["assignment", components.assignment],
        ["exam", components.exam],
        ["overload", components.overload],
        ["fatigue", components.fatigue],
    ] as Array<[string, number]>;
    return named
        .filter(([, v]) => v > 0.01)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k} ${v.toFixed(1)}`)
        .join(", ");
}

function createV1SystemPrompt(simulation: V1Like, adjustmentId?: string): string {
    const name = simulation.course?.course_name ?? "this course";
    const scope = adjustmentId
        ? `a specific what-if scenario for "${name}"`
        : `the stress trajectory and what-if scenarios for "${name}"`;

    return `You are an AI assistant specialised in course workload planning. You are analysing ${scope}.

The numbers you are given come from the course_stress_prediction model, which estimates the pressure the *course plan* adds on top of a student's personal baseline (roughly 25-40 points of health, work and life circumstances the model cannot see). It is the course's additive contribution, not a measurement of any individual student's total stress, and it is not a clinical instrument. Say so if the user starts treating it as one.

Ground every claim in the component breakdown you were given. When a week is bad, name which components drove it - exam pressure, assignment pressure, homework, overload or fatigue carried from the previous week - rather than repeating the single stress number. When a change did not help, say so plainly.

Be concise, concrete and practical.`;
}

function createV1WelcomeMessage(simulation: V1Like, adjustmentId?: string): string {
    const name = simulation.course?.course_name ?? "this course";
    const scenario = adjustmentId
        ? (simulation.scenarios ?? []).find((s: any) => s.scenario_id === adjustmentId)
        : undefined;

    if (scenario?.comparison) {
        const c = scenario.comparison;
        return `I can help you work through "${scenario.name ?? scenario.scenario_id}" for ${name}. It takes the peak from ${c.baseline.peak_stress.toFixed(1)} (week ${c.baseline.peak_week_number}) to ${c.simulation.peak_stress.toFixed(1)} (week ${c.simulation.peak_week_number}).

You can ask me about:
• Which components are driving the worst weeks
• Whether this change is worth its disruption
• What else could be moved
• How the fatigue carry-over is affecting later weeks

What would you like to know?`;
    }

    return `I can help you interpret the stress trajectory for ${name} and compare the ${(simulation.scenarios ?? []).length} scenario(s) on this case.

You can ask me about:
• Why a particular week scores the way it does
• Which scenario is the best trade-off
• What the components mean
• What to try next in the what-if builder

What would you like to know?`;
}

// Create a string representation of the simulation for context
function createSimulationContext(
    simulation: CourseAnalysisOutput,
    adjustmentId?: string
): string {
    if (isV1Simulation(simulation)) {
        return createV1Context(simulation as unknown as V1Like, adjustmentId);
    }
    let context = `Course: "${simulation.course_info.course_name}" (${simulation.course_info.course_id})\n`;
    context += `ECTS Credits: ${simulation.course_info.ects}\n`;
    context += `Total Weeks: ${simulation.course_info.total_weeks}\n`;
    context += `Current Week: ${simulation.current_status.current_week}\n`;
    context += `Number of Students: ${simulation.students.count}\n\n`;

    context += `Stress Thresholds:\n`;
    context += `- Warning Level: ${simulation.optimization_request.stress_threshold_warning}\n`;
    context += `- Critical Level: ${simulation.optimization_request.stress_threshold_critical}\n\n`;

    if (adjustmentId) {
        // Provide detailed context for specific adjustment
        const scenario = simulation.week_schedules.find(
            (s) => s.adjustment_id === adjustmentId
        );

        if (scenario) {
            context += `Optimization Scenario: ${getAdjustmentName(adjustmentId)}\n`;
            context += `Total Weeks: ${scenario.week_schedules.length}\n`;

            const adjustedWeeks = scenario.week_schedules.filter(
                (w) => w.adjusted
            );
            context += `Adjusted Weeks: ${adjustedWeeks.length}\n\n`;

            // Calculate stress statistics
            const avgStress =
                scenario.week_schedules.reduce(
                    (sum, w) =>
                        sum + (w.stress_metrics?.average_stress || 0),
                    0
                ) / scenario.week_schedules.length;

            const peakStress = Math.max(
                ...scenario.week_schedules.map(
                    (w) => w.stress_metrics?.maximum_stress || 0
                )
            );

            context += `Stress Statistics:\n`;
            context += `- Average Stress: ${avgStress.toFixed(1)}\n`;
            context += `- Peak Stress: ${peakStress.toFixed(1)}\n\n`;

            // Add week-by-week details for adjusted weeks
            if (adjustedWeeks.length > 0) {
                context += `Adjusted Weeks Details:\n`;
                adjustedWeeks.forEach((week) => {
                    context += `- Week ${week.week_number}: `;
                    context += `Teaching: ${week.teaching_hours}h, `;
                    context += `Lab: ${week.lab_hours}h, `;
                    context += `Homework: ${week.homework_hours}h, `;
                    context += `Avg Stress: ${(
                        week.stress_metrics?.average_stress || 0
                    ).toFixed(1)}, `;
                    context += `Max Stress: ${(
                        week.stress_metrics?.maximum_stress || 0
                    ).toFixed(1)}\n`;
                });
            }
        }
    } else {
        // Provide overview of all scenarios
        context += `Total Optimization Scenarios: ${simulation.week_schedules.length}\n\n`;

        context += "Scenario Summaries:\n";
        simulation.week_schedules.forEach((scenario) => {
            const adjustedWeeks = scenario.week_schedules.filter(
                (w) => w.adjusted
            );
            const avgStress =
                scenario.week_schedules.reduce(
                    (sum, w) =>
                        sum + (w.stress_metrics?.average_stress || 0),
                    0
                ) / scenario.week_schedules.length;

            const peakStress = Math.max(
                ...scenario.week_schedules.map(
                    (w) => w.stress_metrics?.maximum_stress || 0
                )
            );

            context += `- ${getAdjustmentName(scenario.adjustment_id)}:\n`;
            context += `  Adjusted Weeks: ${adjustedWeeks.length}/${scenario.week_schedules.length}\n`;
            context += `  Average Stress: ${avgStress.toFixed(1)}\n`;
            context += `  Peak Stress: ${peakStress.toFixed(1)}\n`;
        });
    }

    return context;
}

// Create a welcome message for the chat
function createWelcomeMessage(
    simulation: CourseAnalysisOutput,
    adjustmentId?: string
): string {
    if (isV1Simulation(simulation)) {
        return createV1WelcomeMessage(simulation as unknown as V1Like, adjustmentId);
    }
    if (adjustmentId) {
        const scenario = simulation.week_schedules.find(
            (s) => s.adjustment_id === adjustmentId
        );

        if (scenario) {
            const adjustedCount = scenario.week_schedules.filter(
                (w) => w.adjusted
            ).length;

            return `I'm here to help you analyze the "${getAdjustmentName(adjustmentId)}" optimization scenario for "${simulation.course_info.course_name}". This scenario adjusts ${adjustedCount} week${adjustedCount !== 1 ? "s" : ""} to optimize student stress levels.

You can ask me about:
• How this optimization strategy works
• What specific changes were made to the schedule
• The impact on student stress levels
• Trade-offs and considerations for implementation
• Suggestions for further improvements

What would you like to know about this optimization scenario?`;
        }
    }

    return `I'm here to help you analyze the stress optimization results for "${simulation.course_info.course_name}". We have ${simulation.week_schedules.length} different optimization scenarios to compare.

You can ask me about:
• Comparing different optimization strategies
• Which scenario might work best for your situation
• Understanding the stress metrics and what they mean
• Pedagogical implications of different approaches
• Implementation advice and next steps

What would you like to know about these optimization scenarios?`;
}
