// ui/src/components/chat/ChatHeader.tsx
// Header component for the chat with title and controls

import { Bot, RotateCcw, Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
    scenarioId: number;
    description: string;
    isExpanded: boolean;
    model: string;
    availableModels: Array<{ name: string }>;
    loadingModels: boolean;
    onModelChange: (model: string) => void;
    onReset: () => void;
    onToggleExpand: () => void;
    onClose: () => void;
    loading: boolean;
}

export function ChatHeader({
    scenarioId,
    description,
    isExpanded,
    model,
    availableModels,
    loadingModels,
    onModelChange,
    onReset,
    onToggleExpand,
    onClose,
    loading
}: ChatHeaderProps) {
    return (
        <div className="flex justify-between items-center">
            <div className="flex items-center">
                <Bot className="mr-2 h-5 w-5 text-blue-600" />
                <div>
                    <CardTitle className="text-lg">
                        Scenario {scenarioId} Chat
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
                        Ask about "{description}"
                    </CardDescription>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Select
                    value={model}
                    onValueChange={onModelChange}
                    disabled={loadingModels || availableModels.length === 0}
                    // Prevent event propagation when clicking the select or its dropdown
                    onOpenChange={(open) => {
                        // If necessary, we can do additional handling here
                    }}
                >
                    <SelectTrigger
                        className={cn(
                            "h-8",
                            isExpanded ? "w-32 text-sm" : "w-24 text-xs"
                        )}
                    >
                        <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                        {loadingModels ? (
                            <SelectItem value="loading">
                                Loading models...
                            </SelectItem>
                        ) : availableModels.length === 0 ? (
                            <SelectItem value="none">
                                No models found
                            </SelectItem>
                        ) : (
                            availableModels.map((m) => (
                                <SelectItem key={m.name} value={m.name}>
                                    {m.name}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onReset}
                    title="Reset conversation"
                    disabled={loading}
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onToggleExpand}
                    title={isExpanded ? "Collapse chat" : "Expand chat"}
                >
                    {isExpanded ? (
                        <Minimize2 className="h-4 w-4" />
                    ) : (
                        <Maximize2 className="h-4 w-4" />
                    )}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
