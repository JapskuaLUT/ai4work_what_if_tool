// ui/src/types/chat.ts
// Type definitions for the chat components

export type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
};

export type ModelInfo = {
    name: string;
    // Add other model properties if needed
};
