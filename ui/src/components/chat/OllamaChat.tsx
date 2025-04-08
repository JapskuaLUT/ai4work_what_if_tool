// src/components/OllamaChat.tsx

import { useState, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import { LoaderCircle } from "lucide-react";

export function OllamaChat() {
    // State
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("");
    const [temperature, setTemperature] = useState(0.7);
    const [useStreaming, setUseStreaming] = useState(true);

    // Initialize Ollama hook
    const {
        loading,
        error,
        response,
        streamingResponse,
        availableModels,
        loadingModels,
        generate,
        streamGenerate,
        fetchModels,
        cancelStream
    } = useOllama({ defaultModel: model });

    // Fetch models on component mount
    useEffect(() => {
        fetchModels().catch(console.error);
    }, [fetchModels]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!prompt.trim()) return;

        try {
            if (useStreaming) {
                await streamGenerate(prompt, {
                    model,
                    options: {
                        temperature
                    }
                });
            } else {
                await generate(prompt, {
                    model,
                    options: {
                        temperature
                    }
                });
            }
        } catch (err) {
            console.error("Failed to generate response:", err);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Ollama Chat</CardTitle>
                    <CardDescription>
                        Chat with Ollama models running on your localhost
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Model selection */}
                    <div className="space-y-2">
                        <label
                            className="text-sm font-medium"
                            htmlFor="model-select"
                        >
                            Model
                        </label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger id="model-select">
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

                    {/* Temperature control */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-sm font-medium">
                                Temperature: {temperature}
                            </label>
                        </div>
                        <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={[temperature]}
                            onValueChange={(value) => setTemperature(value[0])}
                        />
                    </div>

                    {/* Streaming toggle */}
                    <div className="flex items-center space-x-2">
                        <Input
                            type="checkbox"
                            id="stream-toggle"
                            className="w-4 h-4"
                            checked={useStreaming}
                            onChange={(e) => setUseStreaming(e.target.checked)}
                        />
                        <label
                            htmlFor="stream-toggle"
                            className="text-sm font-medium"
                        >
                            Use streaming responses
                        </label>
                    </div>

                    {/* Response area */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Response</label>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md min-h-64 whitespace-pre-wrap">
                            {loading ? (
                                useStreaming ? (
                                    <div>
                                        <div className="mb-2 flex items-center gap-2">
                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                            <span>Generating...</span>
                                        </div>
                                        {streamingResponse}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                        <span>Generating...</span>
                                    </div>
                                )
                            ) : error ? (
                                <div className="text-red-500">
                                    Error: {error.message}
                                </div>
                            ) : (
                                <div>
                                    {useStreaming
                                        ? streamingResponse
                                        : response}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Prompt input */}
                    <form onSubmit={handleSubmit} className="space-y-2">
                        <label
                            className="text-sm font-medium"
                            htmlFor="prompt-input"
                        >
                            Prompt
                        </label>
                        <Textarea
                            id="prompt-input"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter your prompt..."
                            className="min-h-32"
                        />
                    </form>
                </CardContent>

                <CardFooter className="flex justify-end space-x-2">
                    {loading && (
                        <Button variant="outline" onClick={cancelStream}>
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !prompt.trim()}
                    >
                        {loading ? (
                            <>
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            "Generate"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
