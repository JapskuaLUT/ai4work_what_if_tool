// ui/src/services/ollamaService.ts

// Default Ollama API URL - using proxy to avoid CORS issues
const OLLAMA_API_URL = "https://ollama.localhost/api";

// Interface for generate request parameters
export interface GenerateParams {
    model: string;
    prompt: string;
    system?: string;
    template?: string;
    context?: number[];
    options?: {
        temperature?: number;
        top_p?: number;
        top_k?: number;
        num_predict?: number;
        seed?: number;
        stop?: string[];
    };
    stream?: boolean;
}

// Interface for model response
export interface ModelResponse {
    model: string;
    created_at: string;
    response: string;
    context?: number[];
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

// Interface for chat request parameters
export interface ChatParams {
    model: string;
    messages: {
        role: "user" | "assistant" | "system";
        content: string;
    }[];
    stream?: boolean;
    options?: {
        temperature?: number;
        top_p?: number;
        top_k?: number;
        num_predict?: number;
        seed?: number;
        stop?: string[];
    };
}

// Interface for chat response
export interface ChatResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

// Interface for models list response
export interface ModelsListResponse {
    models: {
        name: string;
        modified_at: string;
        size: number;
        digest: string;
        details: {
            format: string;
            family: string;
            families: string[];
            parameter_size: string;
            quantization_level: string;
        };
    }[];
}

// Interface for stream handler callbacks
export interface StreamCallbacks {
    onStart?: () => void;
    onToken?: (token: string) => void;
    onComplete?: (fullResponse: string) => void;
    onError?: (error: Error) => void;
}

/**
 * Generate a response from the Ollama model (non-streaming)
 */
export async function generateCompletion(
    params: GenerateParams,
    signal?: AbortSignal
): Promise<ModelResponse> {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ...params, stream: false }),
            signal // Pass the abort signal
        });

        if (!response.ok) {
            if (signal?.aborted) {
                throw new Error("Request was aborted");
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `Ollama API error: ${response.status} ${
                    response.statusText
                } ${JSON.stringify(errorData)}`
            );
        }

        return (await response.json()) as ModelResponse;
    } catch (error) {
        console.error("Error calling Ollama:", error);
        throw error;
    }
}

/**
 * Generate a chat response from the Ollama model (non-streaming)
 * Uses the /chat API endpoint which is available in newer Ollama versions
 */
export async function chatCompletion(
    params: ChatParams,
    signal?: AbortSignal
): Promise<ChatResponse> {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ...params, stream: false }),
            signal // Pass the abort signal
        });

        if (!response.ok) {
            if (signal?.aborted) {
                throw new Error("Request was aborted");
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `Ollama API error: ${response.status} ${
                    response.statusText
                } ${JSON.stringify(errorData)}`
            );
        }

        return (await response.json()) as ChatResponse;
    } catch (error) {
        console.error("Error calling Ollama chat:", error);
        throw error;
    }
}

/**
 * Execute a synchronous (non-streaming) API call to Ollama
 * This is useful when you need to wait for the entire response
 * before continuing with other operations
 */
export async function syncGenerate(
    params: GenerateParams,
    signal?: AbortSignal
): Promise<string> {
    try {
        const result = await generateCompletion(
            {
                ...params,
                stream: false
            },
            signal
        );
        return result.response;
    } catch (error) {
        console.error("Error in syncGenerate:", error);
        throw error;
    }
}

/**
 * Execute a synchronous (non-streaming) chat API call to Ollama
 * Returns just the content of the assistant's response
 */
export async function syncChat(
    params: ChatParams,
    signal?: AbortSignal
): Promise<string> {
    try {
        const result = await chatCompletion(
            {
                ...params,
                stream: false
            },
            signal
        );
        return result.message.content;
    } catch (error) {
        console.error("Error in syncChat:", error);
        throw error;
    }
}

/**
 * Stream a response from the Ollama model
 */
export async function streamCompletion(
    params: GenerateParams,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
): Promise<void> {
    try {
        if (callbacks.onStart) {
            callbacks.onStart();
        }

        // Create controller for this specific stream if not provided
        const controller = new AbortController();
        const streamSignal = signal || controller.signal;

        // Setup abort handling
        if (signal) {
            signal.addEventListener("abort", () => {
                controller.abort();
                if (callbacks.onError) {
                    callbacks.onError(new Error("Request aborted"));
                }
            });
        }

        const response = await fetch(`${OLLAMA_API_URL}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ...params, stream: true }),
            signal: streamSignal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `Ollama API error: ${response.status} ${
                    response.statusText
                } ${JSON.stringify(errorData)}`
            );
        }

        if (!response.body) {
            throw new Error("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";

        try {
            while (true) {
                if (streamSignal.aborted) {
                    reader.cancel();
                    throw new Error("Stream aborted");
                }

                const { done, value } = await reader.read();

                if (done) {
                    if (callbacks.onComplete) {
                        callbacks.onComplete(fullResponse);
                    }
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });

                // Handle multiple JSON objects in the chunk
                const lines = chunk
                    .split("\n")
                    .filter((line) => line.trim() !== "");

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line) as ModelResponse;

                        if (callbacks.onToken) {
                            callbacks.onToken(data.response);
                        }

                        fullResponse += data.response;

                        if (data.done) {
                            if (callbacks.onComplete) {
                                callbacks.onComplete(fullResponse);
                            }
                        }
                    } catch (error) {
                        console.error(
                            "Error parsing JSON from stream:",
                            error,
                            line
                        );
                    }
                }
            }
        } catch (error) {
            // Check if this is an abort error
            if (streamSignal.aborted) {
                reader.cancel();
                if (callbacks.onError) {
                    callbacks.onError(new Error("Stream aborted"));
                }
            } else {
                // Forward other errors
                throw error;
            }
        }
    } catch (error) {
        console.error("Error streaming from Ollama:", error);
        if (callbacks.onError) {
            callbacks.onError(error as Error);
        }
    }
}

/**
 * Stream a chat response from the Ollama model
 * Uses the /chat API endpoint which is available in newer Ollama versions
 */
export async function streamChatCompletion(
    params: ChatParams,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
): Promise<void> {
    try {
        if (callbacks.onStart) {
            callbacks.onStart();
        }

        // Create controller for this specific stream if not provided
        const controller = new AbortController();
        const streamSignal = signal || controller.signal;

        // Setup abort handling
        if (signal) {
            signal.addEventListener("abort", () => {
                controller.abort();
                if (callbacks.onError) {
                    callbacks.onError(new Error("Request aborted"));
                }
            });
        }

        const response = await fetch(`${OLLAMA_API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ...params, stream: true }),
            signal: streamSignal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `Ollama API error: ${response.status} ${
                    response.statusText
                } ${JSON.stringify(errorData)}`
            );
        }

        if (!response.body) {
            throw new Error("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";

        try {
            while (true) {
                if (streamSignal.aborted) {
                    reader.cancel();
                    throw new Error("Stream aborted");
                }

                const { done, value } = await reader.read();

                if (done) {
                    if (callbacks.onComplete) {
                        callbacks.onComplete(fullResponse);
                    }
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });

                // Handle multiple JSON objects in the chunk
                const lines = chunk
                    .split("\n")
                    .filter((line) => line.trim() !== "");

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line) as ChatResponse;

                        if (callbacks.onToken) {
                            callbacks.onToken(data.message.content);
                        }

                        fullResponse += data.message.content;

                        if (data.done) {
                            if (callbacks.onComplete) {
                                callbacks.onComplete(fullResponse);
                            }
                        }
                    } catch (error) {
                        console.error(
                            "Error parsing JSON from stream:",
                            error,
                            line
                        );
                    }
                }
            }
        } catch (error) {
            // Check if this is an abort error
            if (streamSignal.aborted) {
                reader.cancel();
                if (callbacks.onError) {
                    callbacks.onError(new Error("Stream aborted"));
                }
            } else {
                // Forward other errors
                throw error;
            }
        }
    } catch (error) {
        console.error("Error streaming from Ollama chat:", error);
        if (callbacks.onError) {
            callbacks.onError(error as Error);
        }
    }
}

/**
 * Get list of available models from Ollama
 */
export async function listModels(
    signal?: AbortSignal
): Promise<ModelsListResponse> {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/tags`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            signal
        });

        if (!response.ok) {
            if (signal?.aborted) {
                throw new Error("Request was aborted");
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                `Ollama API error: ${response.status} ${
                    response.statusText
                } ${JSON.stringify(errorData)}`
            );
        }

        return (await response.json()) as ModelsListResponse;
    } catch (error) {
        console.error("Error listing Ollama models:", error);
        throw error;
    }
}
