// ui/src/hooks/useOllama.ts

import { useState, useCallback, useRef } from "react";
import {
    generateCompletion,
    streamCompletion,
    listModels,
    syncGenerate,
    syncChat,
    streamChatCompletion,
    GenerateParams,
    ChatParams,
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

    // Methods - Streaming
    generate: (
        prompt: string,
        options?: Partial<GenerateParams>
    ) => Promise<ModelResponse>;
    streamGenerate: (
        prompt: string,
        options?: Partial<GenerateParams>
    ) => Promise<void>;
    streamChat: (
        messages: ChatParams["messages"],
        options?: Partial<ChatParams>
    ) => Promise<void>;

    // Methods - Non-streaming (synchronous)
    generateSync: (
        prompt: string,
        options?: Partial<GenerateParams>
    ) => Promise<string>;
    chatSync: (
        messages: ChatParams["messages"],
        options?: Partial<ChatParams>
    ) => Promise<string>;

    // Utility methods
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
    const abortControllerRef = useRef<AbortController | null>(null);

    // Reset all state
    const resetState = useCallback(() => {
        setLoading(false);
        setError(null);
        setResponse("");
        setStreamingResponse("");
    }, []);

    // Generate completion (streaming)
    const generate = useCallback(
        async (
            prompt: string,
            options?: Partial<GenerateParams>
        ): Promise<ModelResponse> => {
            try {
                setLoading(true);
                setError(null);

                // Create a new AbortController for this request
                abortControllerRef.current = new AbortController();

                const params: GenerateParams = {
                    model: options?.model || defaultModel,
                    prompt,
                    ...options
                };

                const result = await generateCompletion(
                    params,
                    abortControllerRef.current.signal
                );
                setResponse(result.response);
                return result;
            } catch (err) {
                // Don't set error state if it was an abort
                if (err instanceof Error && err.name === "AbortError") {
                    console.log("Request aborted");
                } else {
                    const error =
                        err instanceof Error ? err : new Error(String(err));
                    setError(error);
                    throw error;
                }
                throw err;
            } finally {
                if (!abortControllerRef.current?.signal.aborted) {
                    setLoading(false);
                }
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

                await streamCompletion(
                    params,
                    {
                        onStart: () => {
                            setStreamingResponse("");
                        },
                        onToken: (token) => {
                            if (!abortControllerRef.current?.signal.aborted) {
                                setStreamingResponse((prev) => prev + token);
                            }
                        },
                        onComplete: (fullResponse) => {
                            if (!abortControllerRef.current?.signal.aborted) {
                                setResponse(fullResponse);
                                setLoading(false);
                            }
                        },
                        onError: (err) => {
                            // Only set error if it's not an abort error
                            if (
                                err.message !== "Stream aborted" &&
                                err.message !== "Request aborted"
                            ) {
                                setError(err);
                            }
                            setLoading(false);
                        }
                    },
                    abortControllerRef.current.signal
                );
            } catch (err) {
                // Don't set error state if it was an abort
                if (
                    err instanceof Error &&
                    (err.name === "AbortError" ||
                        err.message === "Stream aborted" ||
                        err.message === "Request aborted")
                ) {
                    console.log("Request aborted");
                } else {
                    const error =
                        err instanceof Error ? err : new Error(String(err));
                    setError(error);
                }
                setLoading(false);
            }
        },
        [defaultModel]
    );

    // Generate using chat API with streaming
    const streamChat = useCallback(
        async (
            messages: ChatParams["messages"],
            options?: Partial<ChatParams>
        ): Promise<void> => {
            try {
                setLoading(true);
                setError(null);
                setStreamingResponse("");

                // Create a new AbortController for this request
                abortControllerRef.current = new AbortController();

                const params: ChatParams = {
                    model: options?.model || defaultModel,
                    messages,
                    stream: true,
                    ...options
                };

                await streamChatCompletion(
                    params,
                    {
                        onStart: () => {
                            setStreamingResponse("");
                        },
                        onToken: (token) => {
                            if (!abortControllerRef.current?.signal.aborted) {
                                setStreamingResponse((prev) => prev + token);
                            }
                        },
                        onComplete: (fullResponse) => {
                            if (!abortControllerRef.current?.signal.aborted) {
                                setResponse(fullResponse);
                                setLoading(false);
                            }
                        },
                        onError: (err) => {
                            // Only set error if it's not an abort error
                            if (
                                err.message !== "Stream aborted" &&
                                err.message !== "Request aborted"
                            ) {
                                setError(err);
                            }
                            setLoading(false);
                        }
                    },
                    abortControllerRef.current.signal
                );
            } catch (err) {
                // Don't set error state if it was an abort
                if (
                    err instanceof Error &&
                    (err.name === "AbortError" ||
                        err.message === "Stream aborted" ||
                        err.message === "Request aborted")
                ) {
                    console.log("Request aborted");
                } else {
                    const error =
                        err instanceof Error ? err : new Error(String(err));
                    setError(error);
                }
                setLoading(false);
            }
        },
        [defaultModel]
    );

    // Generate synchronously (non-streaming)
    const generateSync = useCallback(
        async (
            prompt: string,
            options?: Partial<GenerateParams>
        ): Promise<string> => {
            try {
                setLoading(true);
                setError(null);

                // Create a new AbortController for this request
                abortControllerRef.current = new AbortController();

                const params: GenerateParams = {
                    model: options?.model || defaultModel,
                    prompt,
                    ...options
                };

                const result = await syncGenerate(
                    params,
                    abortControllerRef.current.signal
                );
                setResponse(result);
                return result;
            } catch (err) {
                // Don't set error state if it was an abort
                if (err instanceof Error && err.name === "AbortError") {
                    console.log("Request aborted");
                } else {
                    const error =
                        err instanceof Error ? err : new Error(String(err));
                    setError(error);
                    throw error;
                }
                throw err;
            } finally {
                if (!abortControllerRef.current?.signal.aborted) {
                    setLoading(false);
                }
            }
        },
        [defaultModel]
    );

    // Generate chat synchronously (non-streaming)
    const chatSync = useCallback(
        async (
            messages: ChatParams["messages"],
            options?: Partial<ChatParams>
        ): Promise<string> => {
            try {
                setLoading(true);
                setError(null);

                // Create a new AbortController for this request
                abortControllerRef.current = new AbortController();

                const params: ChatParams = {
                    model: options?.model || defaultModel,
                    messages,
                    ...options
                };

                const result = await syncChat(
                    params,
                    abortControllerRef.current.signal
                );
                setResponse(result);
                return result;
            } catch (err) {
                // Don't set error state if it was an abort
                if (err instanceof Error && err.name === "AbortError") {
                    console.log("Request aborted");
                } else {
                    const error =
                        err instanceof Error ? err : new Error(String(err));
                    setError(error);
                    throw error;
                }
                throw err;
            } finally {
                if (!abortControllerRef.current?.signal.aborted) {
                    setLoading(false);
                }
            }
        },
        [defaultModel]
    );

    // Cancel streaming
    const cancelStream = useCallback(() => {
        if (abortControllerRef.current) {
            console.log("Aborting request...");
            abortControllerRef.current.abort();
            // Reset loading state immediately on cancel
            setLoading(false);
        }
    }, []);

    // Fetch available models
    const fetchModels = useCallback(async (): Promise<ModelsListResponse> => {
        try {
            setLoadingModels(true);
            setModelsError(null);

            // Create a new AbortController for this request
            const controller = new AbortController();

            const models = await listModels(controller.signal);
            setAvailableModels(models.models);
            return models;
        } catch (err) {
            // Don't set error state if it was an abort
            if (err instanceof Error && err.name === "AbortError") {
                console.log("Models request aborted");
            } else {
                const error =
                    err instanceof Error ? err : new Error(String(err));
                setModelsError(error);
                throw error;
            }
            throw err;
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
        streamChat,
        generateSync,
        chatSync,
        fetchModels,
        cancelStream,
        resetState
    };
}
