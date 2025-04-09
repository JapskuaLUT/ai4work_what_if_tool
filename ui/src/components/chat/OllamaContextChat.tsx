// ui/src/components/OllamaContextChat.tsx

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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoaderCircle, Send, User, Bot, Trash2 } from "lucide-react";
import { MarkdownDisplay } from "@/components/MarkdownDisplay/MarkdownDisplay";

type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
};

export function OllamaContextChat() {
    // State
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("");
    const [systemPrompt, setSystemPrompt] = useState(
        "You are a helpful assistant. Be concise and clear in your responses."
    );
    const [useSystemPrompt, setUseSystemPrompt] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [context, setContext] = useState<number[]>([]);
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
        streamGenerate,
        fetchModels,
        cancelStream
    } = useOllama({ defaultModel: model });

    // Fetch models on component mount
    useEffect(() => {
        fetchModels().catch(console.error);
    }, [fetchModels]);

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

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!prompt.trim() || loading) return;

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
            await streamGenerate(prompt, {
                model,
                context,
                system: useSystemPrompt ? systemPrompt : undefined
            });
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

    // Clear chat history
    const clearChat = () => {
        setMessages([]);
        setContext([]);
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
            <Card className="w-full">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Ollama Chat with Context</CardTitle>
                            <CardDescription>
                                Conversation with context and system prompt
                                support
                            </CardDescription>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingModels ? (
                                        <SelectItem value="loading" disabled>
                                            Loading models...
                                        </SelectItem>
                                    ) : availableModels.length === 0 ? (
                                        <SelectItem value="none" disabled>
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
                                variant="outline"
                                size="icon"
                                onClick={clearChat}
                                title="Clear chat history"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* System prompt */}
                    <div className="space-y-2 border rounded-md p-3">
                        <div className="flex justify-between items-center">
                            <Label
                                htmlFor="system-prompt"
                                className="text-sm font-medium"
                            >
                                System Prompt
                            </Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="use-system-prompt"
                                    checked={useSystemPrompt}
                                    onCheckedChange={setUseSystemPrompt}
                                />
                                <Label
                                    htmlFor="use-system-prompt"
                                    className="text-sm"
                                >
                                    {useSystemPrompt ? "Enabled" : "Disabled"}
                                </Label>
                            </div>
                        </div>
                        <Textarea
                            id="system-prompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Enter system instructions..."
                            className="min-h-12 resize-none"
                            disabled={!useSystemPrompt}
                        />
                    </div>

                    {/* Chat messages */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2 h-96 overflow-y-auto">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                                <Bot size={32} className="mb-2" />
                                <p>
                                    Start a conversation with the Ollama model
                                </p>
                                <p className="text-xs mt-1">
                                    Context is preserved between messages
                                </p>
                            </div>
                        ) : (
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
                                                                message.content ||
                                                                ""
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
                        )}
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="text-red-500 text-sm p-2">
                            Error: {error.message}
                        </div>
                    )}

                    {/* Prompt input */}
                    <form onSubmit={handleSubmit} className="relative">
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Type your message..."
                            className="pr-12 min-h-20 resize-none"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="absolute right-2 bottom-2"
                            disabled={loading || !prompt.trim()}
                        >
                            {loading ? (
                                <LoaderCircle className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-between pt-0">
                    <div className="text-xs text-slate-500">
                        Press Shift + Enter for a new line
                    </div>
                    {loading && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelStream}
                        >
                            Cancel
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
