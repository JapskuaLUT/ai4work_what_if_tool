// ui/src/components/results/ScenarioChat.tsx
// This component provides an AI chat interface for discussing specific scenarios

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
    Square
} from "lucide-react";
import { MarkdownDisplay } from "@/components/MarkdownDisplay/MarkdownDisplay";
import { Scenario } from "@/types/scenario";

type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
};

interface ScenarioChatProps {
    scenario: Scenario;
}

export function ScenarioChat({ scenario }: ScenarioChatProps) {
    // State
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("");
    const [systemPrompt, setSystemPrompt] = useState(
        `You are an AI assistant specialized in academic scheduling. You are analyzing Scenario ${scenario.scenarioId}: "${scenario.description}". Provide helpful explanations and suggestions about this specific scenario. Keep your answers focused on this scenario's tasks, constraints, and schedule.`
    );
    const [messages, setMessages] = useState<Message[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

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
        if (!isInitialized && model && !loading) {
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
    }, [scenario, model, loading, isInitialized]);

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

    // Debug information
    console.log("Available models:", availableModels);
    console.log("Current model:", model);
    console.log("Loading models:", loadingModels);

    return (
        <Card className="mt-6 border border-blue-200 dark:border-blue-900 shadow-sm">
            <CardHeader className="bg-blue-50 dark:bg-blue-900/20 pb-2 border-b border-blue-100 dark:border-blue-800">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg flex items-center">
                            <Bot className="mr-2 h-5 w-5 text-blue-600" />
                            Chat about this Scenario
                        </CardTitle>
                        <CardDescription>
                            Ask questions about Scenario {scenario.scenarioId}{" "}
                            and get AI-powered insights
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={model}
                            onValueChange={(value) => {
                                console.log("Setting model to:", value);
                                setModel(value);
                            }}
                            disabled={
                                loadingModels || availableModels.length === 0
                            }
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Select model" />
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
                                        <SelectItem key={m.name} value={m.name}>
                                            {m.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            title={isExpanded ? "Collapse chat" : "Expand chat"}
                        >
                            {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetChat}
                            title="Reset conversation"
                            disabled={loading}
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent
                className={`pt-4 transition-all duration-300 ${
                    isExpanded ? "pb-4" : "pb-0"
                }`}
            >
                {/* Models debug info - will be removed in production */}
                {(loadingModels || availableModels.length === 0) && (
                    <div className="mb-4 p-2 text-sm bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
                        {loadingModels
                            ? "Loading available models..."
                            : "No models available. Please make sure Ollama is running and has models installed."}
                    </div>
                )}

                {/* Chat messages */}
                <div
                    className={`bg-slate-50 dark:bg-slate-900 rounded-md p-2 overflow-y-auto border border-slate-200 dark:border-slate-700 transition-all duration-300 ${
                        isExpanded ? "h-96" : "h-32"
                    }`}
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
                                    className={`flex max-w-[80%] ${
                                        message.role === "user"
                                            ? "bg-blue-500 text-white"
                                            : "bg-slate-200 dark:bg-slate-800"
                                    } p-3 rounded-lg`}
                                >
                                    {message.role === "user" ? (
                                        <div className="flex">
                                            <div className="mr-2">
                                                <User size={20} />
                                            </div>
                                            <div>{message.content}</div>
                                        </div>
                                    ) : (
                                        <div className="flex">
                                            <div className="mr-2">
                                                <Bot size={20} />
                                            </div>
                                            <div className="max-w-full">
                                                <MarkdownDisplay
                                                    content={
                                                        message.content || ""
                                                    }
                                                />
                                                {message.id ===
                                                    streamingMessageId &&
                                                    loading && (
                                                        <LoaderCircle className="h-4 w-4 animate-spin mt-2" />
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
                    <div className="text-red-500 text-sm p-2">
                        Error: {error.message}
                    </div>
                )}

                {/* Prompt input */}
                <form onSubmit={handleSubmit} className="relative mt-4">
                    <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask about this scenario..."
                        className="pr-12 min-h-12 resize-none"
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
                            className="absolute right-2 bottom-2"
                            onClick={cancelStream}
                            title="Stop generation"
                        >
                            <Square className="h-5 w-5" />
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            size="icon"
                            className="absolute right-2 bottom-2"
                            disabled={!prompt.trim() || !model}
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    )}
                </form>
            </CardContent>

            <CardFooter
                className={`pt-0 flex justify-between items-center text-xs text-slate-500 ${
                    isExpanded ? "" : "hidden"
                }`}
            >
                <div>Press Shift + Enter for a new line</div>
            </CardFooter>
        </Card>
    );
}
