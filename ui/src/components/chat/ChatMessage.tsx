// ui/src/components/chat/ChatMessage.tsx
// Individual chat message component with user/assistant styling

import { MarkdownDisplay } from "@/components/MarkdownDisplay/MarkdownDisplay";
import { User, Bot, LoaderCircle } from "lucide-react";
import { Message } from "@/types/chat";

interface ChatMessageProps {
    message: Message;
    isExpanded: boolean;
    isLoading: boolean;
    streamingMessageId: string | null;
}

export function ChatMessage({
    message,
    isExpanded,
    isLoading,
    streamingMessageId
}: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`flex max-w-[90%] ${
                    isUser
                        ? "bg-blue-500 text-white"
                        : "bg-slate-200 dark:bg-slate-800"
                } p-3 rounded-lg`}
            >
                {isUser ? (
                    <div className="flex">
                        <div className="mr-2 mt-0.5">
                            <User size={16} />
                        </div>
                        <div className={isExpanded ? "text-base" : "text-sm"}>
                            {message.content}
                        </div>
                    </div>
                ) : (
                    <div className="flex">
                        <div className="mr-2 mt-0.5">
                            <Bot size={16} />
                        </div>
                        <div
                            className={`max-w-full ${
                                isExpanded ? "text-base" : "text-sm"
                            }`}
                        >
                            <MarkdownDisplay content={message.content || ""} />
                            {message.id === streamingMessageId && isLoading && (
                                <LoaderCircle className="h-3 w-3 animate-spin mt-1" />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
