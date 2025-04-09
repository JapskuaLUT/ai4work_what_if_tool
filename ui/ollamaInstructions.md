# Ollama Integration for React

This package provides components and utilities for integrating Ollama LLM (running on localhost) with your React + TypeScript + ShadCN + React Router project.

## Features

-   🔄 Connect to any Ollama model running on your localhost
-   💬 Single-turn and multi-turn chat capabilities
-   📃 Context preservation between messages
-   📢 System prompt support
-   🌊 Streaming responses
-   📝 Markdown rendering of responses
-   🎨 Fully styled with ShadCN UI components
-   🔧 Customizable parameters (temperature, model selection)

## Setup Instructions

### 1. Prerequisites

-   Ollama installed and running on your localhost (https://ollama.ai/)
-   React + TypeScript project with ShadCN UI and React Router

### 2. Implementation

1. Copy the provided files into your project structure:

    - Services: `src/services/ollamaService.ts`
    - Hooks: `src/hooks/useOllama.ts`
    - Components:
        - `src/components/OllamaChat.tsx`
        - `src/components/OllamaChatHistory.tsx`
        - `src/components/OllamaContextChat.tsx`
        - `src/components/MarkdownDisplay.tsx`
    - Pages: `src/pages/OllamaPage.tsx`

2. Configure CORS handling:

    - For Vite: Update your `vite.config.ts` with the proxy configuration
    - For Create React App: Add the proxy field to your `package.json`
    - Update the `OLLAMA_API_URL` in `ollamaService.ts` to use the proxy path

3. Add the Ollama page to your routes:

```typescript
// In your router configuration
import OllamaPage from '@/pages/OllamaPage';

// Add to your routes array
{
  path: "/ollama",
  element: <OllamaPage />
}
```

### 3. Using the Components

#### Simple Chat

The `OllamaChat` component provides a basic interface for single exchanges with the model:

```tsx
import { OllamaChat } from "@/components/OllamaChat";

function MyPage() {
    return <OllamaChat />;
}
```

#### Chat History

The `OllamaChatHistory` component maintains a conversation history with the model:

```tsx
import { OllamaChatHistory } from "@/components/OllamaChatHistory";

function MyPage() {
    return <OllamaChatHistory />;
}
```

#### Context Chat

The `OllamaContextChat` component provides full conversation with context and system prompt:

```tsx
import { OllamaContextChat } from "@/components/OllamaContextChat";

function MyPage() {
    return <OllamaContextChat />;
}
```

### 4. Using the Hook Directly

You can use the `useOllama` hook directly in your own components:

```tsx
import { useOllama } from "@/hooks/useOllama";

function MyCustomComponent() {
    const {
        loading,
        error,
        response,
        streamingResponse,
        generate,
        streamGenerate
        // ... other properties and methods
    } = useOllama({ defaultModel: "llama3" });

    const handleSubmit = async () => {
        await streamGenerate("What is the capital of France?");
    };

    return (
        <div>
            <button onClick={handleSubmit} disabled={loading}>
                Generate
            </button>
            <div>{streamingResponse}</div>
        </div>
    );
}
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors:

1. Check that your proxy configuration is correct
2. Verify Ollama is running (usually on port 11434)
3. Check browser console for specific error messages

### Model Loading Issues

If models aren't loading:

1. Ensure Ollama is running (`ollama serve`)
2. Check that you have at least one model pulled (`ollama list`)
3. Pull a model if needed (`ollama pull llama3`)

## Advanced Configuration

### Running Ollama with CORS Headers

For direct connection without a proxy, run Ollama with CORS headers:

```bash
# Linux/macOS
OLLAMA_ORIGINS="http://localhost:5173,http://localhost:3000" ollama serve

# Windows (PowerShell)
$env:OLLAMA_ORIGINS="http://localhost:5173,http://localhost:3000"; ollama serve
```

### Customizing the Chat Interface

The components are built with ShadCN UI and can be customized by modifying the component files. Refer to the ShadCN UI documentation for styling options.

## Learn More

-   [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
-   [ShadCN UI Documentation](https://ui.shadcn.com/)
-   [React Router Documentation](https://reactrouter.com/en/main)
