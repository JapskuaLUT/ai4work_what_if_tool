// src/components/results/AIExplanationBox.tsx

import { useState, useEffect } from "react";
import { useOllama } from "@/hooks/useOllama";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownDisplay } from "@/components/MarkdownDisplay/MarkdownDisplay"; // Import from correct path
import {
    LoaderCircle,
    Settings,
    ChevronDown,
    ChevronUp,
    Play,
    Square
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { CourseworkPlan } from "@/types/builder";
import { explainSchedulingResults } from "@/prompts/explainSchedulingResults";

interface AIExplanationBoxProps {
    plan: CourseworkPlan;
}

export function AIExplanationBox({ plan }: AIExplanationBoxProps) {
    const [systemPrompt, setSystemPrompt] = useState(
        "You are an expert scheduler and educational planner. Analyze the following scheduling data and provide insights about feasibility, conflicts, and suggestions for improvement. Focus on the key constraints and issues that impact the schedule."
    );
    const [showSettings, setShowSettings] = useState(false);
    const [autoAnalyze, setAutoAnalyze] = useState(false); // Default to false - don't run automatically
    const [selectedModel, setSelectedModel] = useState("");

    // Initialize Ollama hook
    const {
        loading,
        error,
        streamingResponse,
        streamGenerate,
        generateSync,
        availableModels,
        loadingModels,
        fetchModels,
        cancelStream
    } = useOllama({ defaultModel: selectedModel });

    // Fetch models on component mount
    useEffect(() => {
        fetchModels()
            .then(() => {
                // Set default model after fetching if none is selected
                if (!selectedModel && availableModels.length > 0) {
                    setSelectedModel(availableModels[0].name);
                }
            })
            .catch(console.error);
    }, [fetchModels]);

    // Update selectedModel when availableModels changes and none is selected
    useEffect(() => {
        if (!selectedModel && availableModels.length > 0) {
            setSelectedModel(availableModels[0].name);
        }
    }, [availableModels, selectedModel]);

    const analyzePlan = async () => {
        if (!selectedModel) {
            console.error("No model selected");
            return;
        }
        if (!plan) {
            console.error("No plan provided");
            return;
        }

        try {
            const prompt = explainSchedulingResults(JSON.stringify(plan));
            console.log("Prompt:", prompt);

            await streamGenerate(prompt, {
                model: selectedModel,
                system: systemPrompt
            });
        } catch (err) {
            console.error("Failed to analyze plan:", err);
        }
    };

    // Stop the generation
    const stopGeneration = () => {
        cancelStream();
    };

    return (
        <Card className="w-full mt-6">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center">
                        <span className="mr-2">AI Analysis</span>
                        {loading && (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        )}
                    </CardTitle>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            {showSettings ? "Hide Options" : "Options"}
                            {showSettings ? (
                                <ChevronUp className="h-4 w-4 ml-1" />
                            ) : (
                                <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                        </Button>

                        {loading ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={stopGeneration}
                            >
                                <Square className="h-4 w-4 mr-2" />
                                Stop
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={analyzePlan}
                                disabled={loading || !selectedModel}
                            >
                                <Play className="h-4 w-4 mr-2" />
                                Run Analysis
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            {showSettings && (
                <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-800">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label
                                htmlFor="auto-analyze"
                                className="text-sm font-medium"
                            >
                                Auto-analyze when plan changes
                            </Label>
                            <Switch
                                id="auto-analyze"
                                checked={autoAnalyze}
                                onCheckedChange={setAutoAnalyze}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="model-select"
                                className="text-sm font-medium"
                            >
                                Model
                            </Label>
                            <Select
                                value={selectedModel}
                                onValueChange={setSelectedModel}
                            >
                                <SelectTrigger
                                    id="model-select"
                                    className="w-full"
                                >
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
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="system-prompt"
                                className="text-sm font-medium"
                            >
                                System Prompt
                            </Label>
                            <Textarea
                                id="system-prompt"
                                value={systemPrompt}
                                onChange={(e) =>
                                    setSystemPrompt(e.target.value)
                                }
                                className="min-h-20 text-sm"
                                placeholder="Instructions for the AI analyzer..."
                            />
                        </div>
                    </div>
                </div>
            )}

            <CardContent className="pt-4">
                {error ? (
                    <div className="text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                        Error analyzing plan: {error.message}
                    </div>
                ) : streamingResponse ? (
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                        {/* Use MarkdownDisplay to render the markdown content */}
                        <MarkdownDisplay content={streamingResponse} />
                    </div>
                ) : (
                    <div className="text-center text-gray-500 p-6">
                        {loading ? (
                            <div className="flex flex-col items-center">
                                <LoaderCircle className="h-6 w-6 animate-spin mb-2" />
                                <p>Analyzing your scheduling plan...</p>
                            </div>
                        ) : (
                            <p>
                                Click "Run Analysis" to get AI insights on the
                                overall scheduling plan and different scenarios.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
