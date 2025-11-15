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
import { Message } from "@/types/chat";

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
            const chatMessages = [
                {
                    role: "system" as const,
                    content:
                        systemPrompt +
                        "\n\nHere are the details of the stress analysis:\n" +
                        createSimulationContext(simulation, adjustmentId),
                },
            ];

            // Add conversation history
            messages.forEach((msg) => {
                if (msg.role !== "system") {
                    chatMessages.push({
                        role: msg.role as "user" | "assistant",
                        content: msg.content,
                    });
                }
            });

            // Add the new user message
            chatMessages.push({
                role: "user" as const,
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

    // Get chat component styles based on expanded state
    const getChatStyles = () => {
        // Base position is bottom-right
        if (!isExpanded) {
            return {
                width: "400px",
                height: "auto",
            };
        }

        // If expanded, take up more space (responsive)
        return {
            width: isLargeScreen ? "50%" : "90%",
            height: "auto",
            maxWidth: "800px",
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
                <Card className="border border-indigo-200 dark:border-indigo-900 h-full">
                    <CardHeader className="bg-indigo-50 dark:bg-indigo-900/20 py-3 px-4 border-b border-indigo-100 dark:border-indigo-800">
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

                    <CardContent className="pt-4 pb-4">
                        {/* Models debug info */}
                        {(isLoadingModels ||
                            mergedAvailableModels.length === 0) && (
                            <div className="mb-4 p-2 text-xs bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
                                {isLoadingModels
                                    ? "Loading available models..."
                                    : "No models available. Please make sure Ollama is running."}
                            </div>
                        )}

                        <ChatMessagesContainer
                            messages={messages}
                            isExpanded={isExpanded}
                            isLoading={loading}
                            streamingMessageId={streamingMessageId}
                            error={error}
                        />

                        <ChatInput
                            onSubmit={handleSubmit}
                            onStop={cancelStream}
                            isLoading={loading}
                            isExpanded={isExpanded}
                            disabled={!model}
                        />
                    </CardContent>

                    <CardFooter className="pt-0 border-t border-slate-200 dark:border-slate-700 px-4 py-2">
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

// Create a string representation of the simulation for context
function createSimulationContext(
    simulation: CourseAnalysisOutput,
    adjustmentId?: string
): string {
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

            if (scenario.optimization_summary) {
                context += `\nOptimization Summary:\n`;
                context += `${JSON.stringify(scenario.optimization_summary, null, 2)}\n`;
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
