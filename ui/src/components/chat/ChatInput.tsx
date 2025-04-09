// ui/src/components/chat/ChatInput.tsx
// Input component for chat with submit and stop buttons

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
    onSubmit: (message: string) => void;
    onStop: () => void;
    isLoading: boolean;
    isExpanded: boolean;
    disabled?: boolean;
}

export function ChatInput({
    onSubmit,
    onStop,
    isLoading,
    isExpanded,
    disabled = false
}: ChatInputProps) {
    const [message, setMessage] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || disabled) return;

        onSubmit(message);
        setMessage("");
    };

    return (
        <form onSubmit={handleSubmit} className="relative mt-4">
            <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about this scenario..."
                className={`pr-12 resize-none ${
                    isExpanded ? "min-h-16 text-base" : "min-h-12 text-sm"
                }`}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                    }
                }}
                disabled={disabled}
            />
            {isLoading ? (
                <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className={`absolute right-2 bottom-2 ${
                        isExpanded ? "h-8 w-8" : "h-6 w-6"
                    }`}
                    onClick={onStop}
                    title="Stop generation"
                >
                    <Square className={isExpanded ? "h-4 w-4" : "h-3 w-3"} />
                </Button>
            ) : (
                <Button
                    type="submit"
                    size="icon"
                    className={`absolute right-2 bottom-2 ${
                        isExpanded ? "h-8 w-8" : "h-6 w-6"
                    }`}
                    disabled={!message.trim() || disabled}
                >
                    <Send className={isExpanded ? "h-4 w-4" : "h-3 w-3"} />
                </Button>
            )}
        </form>
    );
}
