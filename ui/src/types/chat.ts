// ui/src/types/chat.ts
// Type definitions for the chat components

export type ChatRole = "user" | "assistant" | "system";

/**
 * One message as sent to the model. Distinct from `Message` below, which is
 * the UI-side record and additionally carries an id.
 *
 * Chat components must annotate their outgoing array with this type. Without
 * it TypeScript infers the element type from the first entry — always the
 * system prompt — and then rejects every user and assistant message pushed
 * afterwards.
 */
export type ChatMessage = {
    role: ChatRole;
    content: string;
};

export type Message = {
    id: string;
    role: ChatRole;
    content: string;
};

export type ModelInfo = {
    name: string;
    // Add other model properties if needed
};
