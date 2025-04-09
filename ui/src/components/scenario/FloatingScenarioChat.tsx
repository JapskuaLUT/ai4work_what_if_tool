// ui/src/components/scenario/FloatingScenarioChat.tsx
// This component provides a floating chat button that expands into a scenario-specific chat

import { useState, useEffect, useRef } from "react";
import { useOllama } from "@/hooks/useOllama";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    LoaderCircle,
    Send,
    User,
    Bot,
    ChevronDown,
    ChevronUp,
    RotateCcw,
    Square,
    X,
    MessageCircle,
    Maximize2,
    Minimize2
} from "lucide-react";
import { MarkdownDisplay } from "@/components/MarkdownDisplay/MarkdownDisplay";
import { Scenario } from "@/types/scenario";
import { cn } from "@/lib/utils";

type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
};

interface FloatingScenarioChatProps {
    scenario: Scenario;
}

export function FloatingScenarioChat({ scenario }: FloatingScenarioChatProps) {
    // State
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("");
    const [systemPrompt, setSystemPrompt] = useState(
        `You are an AI assistant specialized in academic scheduling. You are analyzing Scenario ${scenario.scenarioId}: "${scenario.description}". Provide helpful explanations and suggestions about this specific scenario. Keep your answers focused on this scenario's tasks, constraints, and schedule.`
    );
    const [messages, setMessages] = useState<Message[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
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

    // Fetch models on component mount - without circular dependencies
    useEffect(() => {
        // Only fetch models once when the component mounts
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
                content: `I'm analyzing Scenario ${scenario.scenarioId}: "${
                    scenario.description
                }". This scenario is ${
                    scenario.output?.status === "feasible"
                        ? "feasible"
                        : "infeasible"
                }. What would you like to know about it?`
            };

            setMessages([initialAssistantMessage]);
            setIsInitialized(true);
        }
    }, [scenario, model, loading, isInitialized, isChatOpen]);

    // Scroll to bottom when messages change
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingResponse]);

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

    // Determine if we're on a large screen
    const isLargeScreen =
        typeof window !== "undefined" ? window.innerWidth >= 1024 : false;

    const createScenarioContext = () => {
        // Create a stringified version of the scenario for context
        let scenarioContext = `Scenario ${scenario.scenarioId}: "${scenario.description}"\n\n`;

        // Add status
        scenarioContext += `Status: ${
            scenario.output?.status === "feasible" ? "Feasible" : "Infeasible"
        }\n\n`;

        // Add tasks
        scenarioContext += "Tasks:\n";
        scenarioContext += `- Lectures: ${scenario.input.tasks.lectures.join(
            ", "
        )}\n`;
        scenarioContext += `- Exercise Hours: ${scenario.input.tasks.exercisesHours}\n`;
        scenarioContext += `- Project Hours: ${scenario.input.tasks.projectHours}\n`;
        scenarioContext += `- Self-learning Hours: ${scenario.input.tasks.selfLearningHours}\n\n`;

        // Add constraints
        scenarioContext += "Constraints:\n";
        scenario.input.constraints.forEach((constraint, index) => {
            scenarioContext += `${index + 1}. ${constraint}\n`;
        });

        // Add schedule if available
        if (
            scenario.output?.status === "feasible" &&
            scenario.output.schedule
        ) {
            scenarioContext += "\nSchedule:\n";
            scenario.output.schedule.forEach((day) => {
                scenarioContext += `${day.day}: `;
                const blocks = day.timeBlocks
                    .map((block) => `${block.time} ${block.task}`)
                    .join(", ");
                scenarioContext += blocks + "\n";
            });
        }

        return scenarioContext;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!prompt.trim() || loading || !model) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: prompt
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
        setPrompt("");

        try {
            // Create chat messages array
            const chatMessages = [
                {
                    role: "system" as const,
                    content:
                        systemPrompt +
                        "\n\nHere are the details of the scenario:\n" +
                        createScenarioContext()
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
                content: prompt
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
            content: `I'm analyzing Scenario ${scenario.scenarioId}: "${
                scenario.description
            }". This scenario is ${
                scenario.output?.status === "feasible"
                    ? "feasible"
                    : "infeasible"
            }. What would you like to know about it?`
        };

        setMessages([initialAssistantMessage]);
        setStreamingMessageId(null);
    };

    // Get dynamic styles based on expanded state
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

    // Get message container height based on expanded state
    const getMessageContainerHeight = () => {
        return isExpanded ? "400px" : "320px";
    };

    return (
        <>
            {/* Floating chat button */}
            <Button
                className={cn(
                    "fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg",
                    isChatOpen ? "hidden" : "flex"
                )}
                onClick={() => setIsChatOpen(true)}
            >
                <MessageCircle className="h-6 w-6" />
            </Button>

            {/* Chat dialog */}
            <div
                className={cn(
                    "fixed bottom-6 right-6 z-50 shadow-xl transition-all duration-300",
                    isChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                ref={chatCardRef}
                style={getChatStyles()}
            >
                <Card className="border border-blue-200 dark:border-blue-900 h-full">
                    <CardHeader className="bg-blue-50 dark:bg-blue-900/20 py-3 px-4 border-b border-blue-100 dark:border-blue-800">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <Bot className="mr-2 h-5 w-5 text-blue-600" />
                                <div>
                                    <CardTitle className="text-lg">
                                        Scenario {scenario.scenarioId} Chat
                                    </CardTitle>
                                    <CardDescription className="text-xs line-clamp-1">
                                        Ask about "{scenario.description}"
                                    </CardDescription>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Select
                                    value={model}
                                    onValueChange={(value) => setModel(value)}
                                    disabled={
                                        loadingModels ||
                                        availableModels.length === 0
                                    }
                                    // Prevent event propagation when clicking the select or its dropdown
                                    onOpenChange={(open) => {
                                        // If necessary, we can do additional handling here
                                    }}
                                >
                                    <SelectTrigger
                                        className={cn(
                                            "h-8",
                                            isExpanded
                                                ? "w-32 text-sm"
                                                : "w-24 text-xs"
                                        )}
                                    >
                                        <SelectValue placeholder="Model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {loadingModels ? (
                                            <SelectItem value="loading">
                                                Loading models...
                                            </SelectItem>
                                        ) : availableModels.length === 0 ? (
                                            <SelectItem value="none">
                                                No models found
                                            </SelectItem>
                                        ) : (
                                            availableModels.map((m) => (
                                                <SelectItem
                                                    key={m.name}
                                                    value={m.name}
                                                >
                                                    {m.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={resetChat}
                                    title="Reset conversation"
                                    disabled={loading}
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={toggleExpanded}
                                    title={
                                        isExpanded
                                            ? "Collapse chat"
                                            : "Expand chat"
                                    }
                                >
                                    {isExpanded ? (
                                        <Minimize2 className="h-4 w-4" />
                                    ) : (
                                        <Maximize2 className="h-4 w-4" />
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                        setIsChatOpen(false);
                                        setIsExpanded(false);
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
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

                        {/* Chat messages */}
                        <div
                            className="bg-slate-50 dark:bg-slate-900 rounded-md p-2 overflow-y-auto border border-slate-200 dark:border-slate-700 transition-all duration-300"
                            style={{ height: getMessageContainerHeight() }}
                        >
                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${
                                            message.role === "user"
                                                ? "justify-end"
                                                : "justify-start"
                                        }`}
                                    >
                                        <div
                                            className={`flex max-w-[90%] ${
                                                message.role === "user"
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-slate-200 dark:bg-slate-800"
                                            } p-3 rounded-lg`}
                                        >
                                            {message.role === "user" ? (
                                                <div className="flex">
                                                    <div className="mr-2 mt-0.5">
                                                        <User size={16} />
                                                    </div>
                                                    <div
                                                        className={
                                                            isExpanded
                                                                ? "text-base"
                                                                : "text-sm"
                                                        }
                                                    >
                                                        {message.content}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex">
                                                    <div className="mr-2 mt-0.5">
                                                        <Bot size={16} />
                                                    </div>
                                                    <div
                                                        className={`max-w-full ${
                                                            isExpanded
                                                                ? "text-base"
                                                                : "text-sm"
                                                        }`}
                                                    >
                                                        <MarkdownDisplay
                                                            content={
                                                                message.content ||
                                                                ""
                                                            }
                                                        />
                                                        {message.id ===
                                                            streamingMessageId &&
                                                            loading && (
                                                                <LoaderCircle className="h-3 w-3 animate-spin mt-1" />
                                                            )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={endOfMessagesRef} />
                            </div>
                        </div>

                        {/* Error display */}
                        {error && (
                            <div className="text-red-500 text-xs p-2">
                                Error: {error.message}
                            </div>
                        )}

                        {/* Prompt input */}
                        <form onSubmit={handleSubmit} className="relative mt-4">
                            <Textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ask about this scenario..."
                                className={`pr-12 resize-none ${
                                    isExpanded
                                        ? "min-h-16 text-base"
                                        : "min-h-12 text-sm"
                                }`}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                            />
                            {loading ? (
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="destructive"
                                    className={`absolute right-2 bottom-2 ${
                                        isExpanded ? "h-8 w-8" : "h-6 w-6"
                                    }`}
                                    onClick={cancelStream}
                                    title="Stop generation"
                                >
                                    <Square
                                        className={
                                            isExpanded ? "h-4 w-4" : "h-3 w-3"
                                        }
                                    />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    size="icon"
                                    className={`absolute right-2 bottom-2 ${
                                        isExpanded ? "h-8 w-8" : "h-6 w-6"
                                    }`}
                                    disabled={!prompt.trim() || !model}
                                >
                                    <Send
                                        className={
                                            isExpanded ? "h-4 w-4" : "h-3 w-3"
                                        }
                                    />
                                </Button>
                            )}
                        </form>
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
