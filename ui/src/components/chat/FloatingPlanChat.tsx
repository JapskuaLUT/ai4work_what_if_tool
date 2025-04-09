// ui/src/components/chat/FloatingPlanChat.tsx
// Floating chat component for discussing the overall plan with multiple scenarios

import { useState, useEffect, useRef } from "react";
import { useOllama } from "@/hooks/useOllama";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CourseworkPlan } from "@/types/builder";

// Import sub-components
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessagesContainer } from "@/components/chat/ChatMessagesContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { FloatingChatButton } from "@/components/chat/FloatingChatButton";

// Import types and utilities
import { Message } from "@/types/chat";

interface FloatingPlanChatProps {
    plan: CourseworkPlan;
}

export function FloatingPlanChat({ plan }: FloatingPlanChatProps) {
    // State
    const [model, setModel] = useState("");
    const [systemPrompt, setSystemPrompt] = useState(createSystemPrompt(plan));
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
        cancelStream
    } = useOllama();

    // Determine if we're on a large screen
    const isLargeScreen =
        typeof window !== "undefined" ? window.innerWidth >= 1024 : false;

    // Fetch models on component mount
    useEffect(() => {
        fetchModels().catch(console.error);
    }, [fetchModels]);

    // Set default model after models are loaded
    useEffect(() => {
        if (availableModels.length > 0 && !model) {
            setModel(availableModels[0].name);
        }
    }, [availableModels, model]);

    // Initialize with a starter message about the plan
    useEffect(() => {
        if (!isInitialized && model && !loading && isChatOpen) {
            // Create a welcome message
            const initialAssistantMessage: Message = {
                id: "initial",
                role: "assistant",
                content: createWelcomeMessage(plan)
            };

            setMessages([initialAssistantMessage]);
            setIsInitialized(true);
        }
    }, [plan, model, loading, isInitialized, isChatOpen]);

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
            content: message
        };

        setMessages((prev) => [...prev, userMessage]);

        // Create placeholder for assistant message
        const assistantMessageId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: ""
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessageId(assistantMessageId);

        try {
            // Create chat messages array
            const chatMessages = [
                {
                    role: "system" as const,
                    content:
                        systemPrompt +
                        "\n\nHere are the details of the plan:\n" +
                        createPlanContext(plan)
                }
            ];

            // Add conversation history
            messages.forEach((msg) => {
                if (msg.role !== "system") {
                    chatMessages.push({
                        role: msg.role as "user" | "assistant",
                        content: msg.content
                    });
                }
            });

            // Add the new user message
            chatMessages.push({
                role: "user" as const,
                content: message
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
                              content: "Error: Failed to generate response"
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
            content: createWelcomeMessage(plan)
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
                width: "400px", // Wider than before but still compact
                height: "auto"
            };
        }

        // If expanded, take up more space (responsive)
        return {
            width: isLargeScreen ? "50%" : "90%",
            height: "auto",
            maxWidth: "800px" // Cap the maximum width
        };
    };

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
                            headerText="Scenario Comparison" // We're not dealing with a specific scenario
                            description={plan.name}
                            isExpanded={isExpanded}
                            model={model}
                            availableModels={availableModels}
                            loadingModels={loadingModels}
                            onModelChange={setModel}
                            onReset={resetChat}
                            onToggleExpand={toggleExpanded}
                            onClose={handleClose}
                            loading={loading}
                        />
                    </CardHeader>

                    <CardContent className="pt-4 pb-4">
                        {/* Models debug info - will be removed in production */}
                        {(loadingModels || availableModels.length === 0) && (
                            <div className="mb-4 p-2 text-xs bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
                                {loadingModels
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

// Create a system prompt for the AI based on the plan
function createSystemPrompt(plan: CourseworkPlan): string {
    return `You are an AI assistant specialized in academic scheduling and planning. You are analyzing a course plan titled "${plan.name}" which contains ${plan.scenarios.length} different scheduling scenarios.

Your role is to help the user understand the overall plan, compare scenarios, and provide insights about what makes schedules feasible or infeasible. You can explain constraints, suggest improvements, and analyze patterns across scenarios.

Be concise, clear, and focused on the scheduling aspects. Use your expertise to highlight important patterns and trade-offs in the different scenarios.`;
}

// Create a string representation of the plan for context
function createPlanContext(plan: CourseworkPlan): string {
    let planContext = `Plan: "${plan.name}"\n`;
    planContext += `Description: ${plan.description}\n\n`;

    planContext += `Total Scenarios: ${plan.scenarios.length}\n`;
    planContext += `Feasible Scenarios: ${
        plan.scenarios.filter((s) => s.output?.status === "feasible").length
    }\n`;
    planContext += `Infeasible Scenarios: ${
        plan.scenarios.filter((s) => s.output?.status === "infeasible").length
    }\n\n`;

    // Add a summary of each scenario
    planContext += "Scenario Summaries:\n";
    plan.scenarios.forEach((scenario) => {
        planContext += `- Scenario ${scenario.scenarioId}: "${
            scenario.description
        }" (${scenario.output?.status || "unknown"})\n`;
        planContext += `  Lectures: ${scenario.input.tasks.lectures.length}, Exercise Hours: ${scenario.input.tasks.exercisesHours}, Project Hours: ${scenario.input.tasks.projectHours}, Self-learning Hours: ${scenario.input.tasks.selfLearningHours}\n`;
        planContext += `  Constraints: ${scenario.input.constraints.length}\n`;
    });

    return planContext;
}

// Create a welcome message for the chat
function createWelcomeMessage(plan: CourseworkPlan): string {
    const feasibleCount = plan.scenarios.filter(
        (s) => s.output?.status === "feasible"
    ).length;
    const infeasibleCount = plan.scenarios.length - feasibleCount;

    return `I'm here to help you analyze the "${plan.name}" plan containing ${plan.scenarios.length} scenarios (${feasibleCount} feasible, ${infeasibleCount} infeasible). You can ask me about:

• Overall patterns and insights across scenarios
• Comparison between different scenarios
• What makes certain scenarios feasible or infeasible
• Suggestions for improving infeasible scenarios
• Analysis of constraints and their impact

What would you like to know about this coursework plan?`;
}
