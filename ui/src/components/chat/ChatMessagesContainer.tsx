// ui/src/components/chat/ChatMessagesContainer.tsx
// Container for all chat messages with scrolling

import { useRef, useEffect } from "react";
import { Message } from "@/types/chat";
import { ChatMessage } from "./ChatMessage";

interface ChatMessagesContainerProps {
    messages: Message[];
    isExpanded: boolean;
    isLoading: boolean;
    streamingMessageId: string | null;
    error: Error | null;
}

export function ChatMessagesContainer({
    messages,
    isExpanded,
    isLoading,
    streamingMessageId,
    error
}: ChatMessagesContainerProps) {
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Get message container height based on expanded state
    const getMessageContainerHeight = () => {
        return isExpanded ? "400px" : "320px";
    };

    return (
        <>
            {/* Chat messages */}
            <div
                className="bg-slate-50 dark:bg-slate-900 rounded-md p-2 overflow-y-auto border border-slate-200 dark:border-slate-700 transition-all duration-300"
                style={{ height: getMessageContainerHeight() }}
            >
                <div className="space-y-4">
                    {messages.map((message) => (
                        <ChatMessage
                            key={message.id}
                            message={message}
                            isExpanded={isExpanded}
                            isLoading={isLoading}
                            streamingMessageId={streamingMessageId}
                        />
                    ))}
                    <div ref={endOfMessagesRef} />
                </div>
            </div>

            {/* Error display */}
            {error && (
                <div className="text-red-500 text-xs p-2">
                    Error: {error.message}
                </div>
            )}
        </>
    );
}
