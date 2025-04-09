// ui/src/components/scenario/FloatingScenarioChat.tsx
// Main component that orchestrates the chat functionality

import { useState, useEffect, useRef } from "react";
import { useOllama } from "@/hooks/useOllama";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Scenario } from "@/types/scenario";

// Import sub-components
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessagesContainer } from "@/components/chat/ChatMessagesContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { FloatingChatButton } from "@/components/chat/FloatingChatButton";

// Import types and utilities
import { Message } from "@/types/chat";
import {
    createScenarioContext,
    createSystemPrompt,
    getChatStyles,
    createWelcomeMessage
} from "@/components/chat/chatUtils";

interface FloatingScenarioChatProps {
    scenario: Scenario;
}

export function FloatingScenarioChat({ scenario }: FloatingScenarioChatProps) {
    // State
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("");
    const [systemPrompt, setSystemPrompt] = useState(
        createSystemPrompt(scenario)
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

    // Initialize with a starter message about the scenario
    useEffect(() => {
        if (!isInitialized && model && !loading && isChatOpen) {
            // Create a welcome message
            const initialAssistantMessage: Message = {
                id: "initial",
                role: "assistant",
                content: createWelcomeMessage(scenario)
            };

            setMessages([initialAssistantMessage]);
            setIsInitialized(true);
        }
    }, [scenario, model, loading, isInitialized, isChatOpen]);

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
                        "\n\nHere are the details of the scenario:\n" +
                        createScenarioContext(scenario)
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
            content: createWelcomeMessage(scenario)
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
                style={getChatStyles(isExpanded, isLargeScreen)}
            >
                <Card className="border border-blue-200 dark:border-blue-900 h-full">
                    <CardHeader className="bg-blue-50 dark:bg-blue-900/20 py-3 px-4 border-b border-blue-100 dark:border-blue-800">
                        <ChatHeader
                            headerText={`Scenario ${scenario.scenarioId}`}
                            description={scenario.description}
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
