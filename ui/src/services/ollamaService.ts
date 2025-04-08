// ui/src/services/ollamaService.ts

// Default Ollama API URL - using proxy to avoid CORS issues
const OLLAMA_API_URL = "/api/ollama";

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
 * Generate a response from the Ollama model
 */
export async function generateCompletion(
    params: GenerateParams
): Promise<ModelResponse> {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
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
 * Stream a response from the Ollama model
 */
export async function streamCompletion(
    params: GenerateParams,
    callbacks: StreamCallbacks
): Promise<void> {
    try {
        if (callbacks.onStart) {
            callbacks.onStart();
        }

        const response = await fetch(`${OLLAMA_API_URL}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ...params, stream: true })
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

        while (true) {
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
        console.error("Error streaming from Ollama:", error);
        if (callbacks.onError) {
            callbacks.onError(error as Error);
        }
    }
}

/**
 * Get list of available models from Ollama
 */
export async function listModels(): Promise<ModelsListResponse> {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/tags`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
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
