// ui/src/components/OllamaSyncExample.tsx

import { useState } from "react";
import { useOllama } from "@/hooks/useOllama";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoaderCircle } from "lucide-react";
import { MarkdownDisplay } from "./MarkdownDisplay";

export function OllamaSyncExample() {
    // State
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("");
    const [activeTab, setActiveTab] = useState("generate");
    const [systemPrompt, setSystemPrompt] = useState(
        "You are a helpful assistant."
    );
    const [steps, setSteps] = useState<string[]>([]);

    // Initialize Ollama hook
    const {
        loading,
        error,
        response,
        availableModels,
        loadingModels,
        generateSync,
        chatSync,
        fetchModels
    } = useOllama({ defaultModel: model });

    // Fetch models on mount
    useState(() => {
        fetchModels().catch(console.error);
    });

    // Process with synchronous calls to demonstrate waiting for completion
    const handleProcessGenerate = async () => {
        if (!prompt.trim() || loading) return;

        setSteps([]);

        try {
            // Step 1: Log the start
            setSteps((prev) => [...prev, "1. Starting analysis..."]);

            // Step 2: Make the first API call and wait for completion
            setSteps((prev) => [...prev, "2. Generating initial analysis..."]);
            const initialResult = await generateSync(prompt, { model });

            // Step 3: Process the result and make another call
            setSteps((prev) => [
                ...prev,
                "3. Initial analysis complete. Processing results..."
            ]);
            setSteps((prev) => [
                ...prev,
                `Initial result: ${initialResult.substring(0, 100)}...`
            ]);

            // Step 4: Generate a summary based on the first result
            setSteps((prev) => [
                ...prev,
                "4. Generating summary of analysis..."
            ]);
            const summaryPrompt = `Summarize the following analysis in 3 bullet points: ${initialResult}`;
            await generateSync(summaryPrompt, { model });

            // Step 5: Complete
            setSteps((prev) => [...prev, "5. Analysis complete!"]);
        } catch (err) {
            console.error("Process failed:", err);
            setSteps((prev) => [
                ...prev,
                `Error: ${err instanceof Error ? err.message : String(err)}`
            ]);
        }
    };

    // Process with chat API
    const handleProcessChat = async () => {
        if (!prompt.trim() || loading) return;

        setSteps([]);

        try {
            // Step 1: Log the start
            setSteps((prev) => [
                ...prev,
                "1. Starting conversation analysis..."
            ]);

            // Step 2: Make the first chat API call
            setSteps((prev) => [...prev, "2. Sending initial query..."]);
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ];

            const initialResponse = await chatSync(messages, { model });

            // Step 3: Process the result and continue the conversation
            setSteps((prev) => [
                ...prev,
                "3. Received initial response. Asking for elaboration..."
            ]);
            setSteps((prev) => [
                ...prev,
                `Initial response: ${initialResponse.substring(0, 100)}...`
            ]);

            // Step 4: Ask for elaboration
            setSteps((prev) => [
                ...prev,
                "4. Requesting additional details..."
            ]);
            const followUpMessages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
                { role: "assistant", content: initialResponse },
                { role: "user", content: "Can you elaborate on that?" }
            ];

            await chatSync(followUpMessages, { model });

            // Step 5: Complete
            setSteps((prev) => [...prev, "5. Conversation analysis complete!"]);
        } catch (err) {
            console.error("Process failed:", err);
            setSteps((prev) => [
                ...prev,
                `Error: ${err instanceof Error ? err.message : String(err)}`
            ]);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Ollama Synchronous API Example</CardTitle>
                    <CardDescription>
                        Demonstrates using the non-streaming API calls to wait
                        for complete responses
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Model selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Select Model
                        </label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
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
                                        <SelectItem key={m.name} value={m.name}>
                                            {m.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* API Type Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="generate">
                                Generate API
                            </TabsTrigger>
                            <TabsTrigger value="chat">Chat API</TabsTrigger>
                        </TabsList>

                        <TabsContent value="generate" className="pt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Prompt
                                </label>
                                <Textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Enter your prompt..."
                                    className="min-h-20"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="chat" className="pt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    System Prompt
                                </label>
                                <Input
                                    value={systemPrompt}
                                    onChange={(e) =>
                                        setSystemPrompt(e.target.value)
                                    }
                                    placeholder="System instructions..."
                                />

                                <label className="text-sm font-medium">
                                    User Message
                                </label>
                                <Textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Enter your message..."
                                    className="min-h-20"
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Response */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Response</label>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md min-h-40 whitespace-pre-wrap">
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                    <span>Processing...</span>
                                </div>
                            ) : error ? (
                                <div className="text-red-500">
                                    Error: {error.message}
                                </div>
                            ) : (
                                <MarkdownDisplay content={response} />
                            )}
                        </div>
                    </div>

                    {/* Process steps - show the sequential processing */}
                    {steps.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Process Steps
                            </label>
                            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md text-sm">
                                {steps.map((step, index) => (
                                    <div
                                        key={index}
                                        className="py-1 border-b border-slate-200 dark:border-slate-700 last:border-0"
                                    >
                                        {step}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter>
                    <Button
                        onClick={
                            activeTab === "generate"
                                ? handleProcessGenerate
                                : handleProcessChat
                        }
                        disabled={loading || !prompt.trim() || !model}
                        className="w-full"
                    >
                        {loading ? (
                            <>
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "Start Sequential Process"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
