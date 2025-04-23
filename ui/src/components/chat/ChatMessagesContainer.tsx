// ui/src/components/chat/ChatMessagesContainer.tsx

import { Message } from "@/types/chat";
import { MarkdownDisplay } from "@/components/MarkdownDisplay/MarkdownDisplay";

interface ChatMessagesContainerProps {
    messages: Message[];
    isExpanded: boolean;
    isLoading: boolean;
    streamingMessageId: string | null;
    error: Error | null;
}

export function ChatMessagesContainer({
    messages,
    isLoading,
    streamingMessageId,
    error
}: ChatMessagesContainerProps) {
    return (
        <div className="space-y-4 pb-2">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`p-3 rounded-lg ${
                        message.role === "user"
                            ? "bg-blue-50 dark:bg-blue-900/30 ml-6"
                            : "bg-gray-100 dark:bg-gray-800 mr-6"
                    }`}
                >
                    <div className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">
                        {message.role === "user" ? "You" : "Assistant"}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownDisplay content={message.content} />
                    </div>
                    {streamingMessageId === message.id && isLoading && (
                        <div className="mt-1 animate-pulse text-gray-400 dark:text-gray-600">
                            ●
                        </div>
                    )}
                </div>
            ))}

            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30">
                    <div className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">
                        Error
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">
                        {error.message}
                    </div>
                </div>
            )}
        </div>
    );
}
