// ui/src/hooks/useOllama.ts

import { useState, useCallback } from "react";
import {
    generateCompletion,
    streamCompletion,
    listModels,
    GenerateParams,
    ModelResponse,
    ModelsListResponse
} from "../services/ollamaService";

interface UseOllamaOptions {
    defaultModel?: string;
}

interface UseOllamaReturn {
    loading: boolean;
    error: Error | null;
    response: string;
    streamingResponse: string;
    availableModels: ModelsListResponse["models"];
    loadingModels: boolean;
    modelsError: Error | null;

    // Methods
    generate: (
        prompt: string,
        options?: Partial<GenerateParams>
    ) => Promise<ModelResponse>;
    streamGenerate: (
        prompt: string,
        options?: Partial<GenerateParams>
    ) => Promise<void>;
    fetchModels: () => Promise<ModelsListResponse>;
    cancelStream: () => void;
    resetState: () => void;
}

export function useOllama(options: UseOllamaOptions = {}): UseOllamaReturn {
    const { defaultModel = "llama3" } = options;

    // State for generation
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [response, setResponse] = useState("");
    const [streamingResponse, setStreamingResponse] = useState("");

    // State for models
    const [availableModels, setAvailableModels] = useState<
        ModelsListResponse["models"]
    >([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState<Error | null>(null);

    // Reference to the controller for cancellation
    const abortControllerRef = { current: new AbortController() };

    // Reset all state
    const resetState = useCallback(() => {
        setLoading(false);
        setError(null);
        setResponse("");
        setStreamingResponse("");
    }, []);

    // Generate completion
    const generate = useCallback(
        async (
            prompt: string,
            options?: Partial<GenerateParams>
        ): Promise<ModelResponse> => {
            try {
                setLoading(true);
                setError(null);

                const params: GenerateParams = {
                    model: options?.model || defaultModel,
                    prompt,
                    ...options
                };

                const result = await generateCompletion(params);
                setResponse(result.response);
                return result;
            } catch (err) {
                const error =
                    err instanceof Error ? err : new Error(String(err));
                setError(error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [defaultModel]
    );

    // Generate with streaming
    const streamGenerate = useCallback(
        async (
            prompt: string,
            options?: Partial<GenerateParams>
        ): Promise<void> => {
            try {
                setLoading(true);
                setError(null);
                setStreamingResponse("");

                // Create a new AbortController for this request
                abortControllerRef.current = new AbortController();

                const params: GenerateParams = {
                    model: options?.model || defaultModel,
                    prompt,
                    stream: true,
                    ...options
                };

                await streamCompletion(params, {
                    onStart: () => {
                        setStreamingResponse("");
                    },
                    onToken: (token) => {
                        setStreamingResponse((prev) => prev + token);
                    },
                    onComplete: (fullResponse) => {
                        setResponse(fullResponse);
                        setLoading(false);
                    },
                    onError: (err) => {
                        setError(err);
                        setLoading(false);
                    }
                });
            } catch (err) {
                const error =
                    err instanceof Error ? err : new Error(String(err));
                setError(error);
                setLoading(false);
            }
        },
        [defaultModel]
    );

    // Cancel streaming
    const cancelStream = useCallback(() => {
        abortControllerRef.current.abort();
        setLoading(false);
    }, []);

    // Fetch available models
    const fetchModels = useCallback(async (): Promise<ModelsListResponse> => {
        try {
            setLoadingModels(true);
            setModelsError(null);

            const models = await listModels();
            setAvailableModels(models.models);
            return models;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setModelsError(error);
            throw error;
        } finally {
            setLoadingModels(false);
        }
    }, []);

    return {
        loading,
        error,
        response,
        streamingResponse,
        availableModels,
        loadingModels,
        modelsError,
        generate,
        streamGenerate,
        fetchModels,
        cancelStream,
        resetState
    };
}
