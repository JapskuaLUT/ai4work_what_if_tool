// ui/src/components/chat/FloatingChatButton.tsx
// Floating button to open the chat

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingChatButtonProps {
    isChatOpen: boolean;
    onClick: () => void;
}

export function FloatingChatButton({
    isChatOpen,
    onClick
}: FloatingChatButtonProps) {
    return (
        <Button
            className={cn(
                "fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg",
                isChatOpen ? "hidden" : "flex"
            )}
            onClick={onClick}
        >
            <MessageCircle className="h-6 w-6" />
        </Button>
    );
}
