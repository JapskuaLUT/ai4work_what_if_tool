// ui/src/components/global/GlobalModelSelector.tsx

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useModelContext } from "@/contexts/ModelContext";
import { Bot, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GlobalModelSelector() {
    const {
        globalModel,
        setGlobalModel,
        availableModels,
        isLoading,
        refreshModels
    } = useModelContext();

    const handleRefresh = async () => {
        await refreshModels();
    };

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center">
                <Bot className="mr-2 h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
                    Model:
                </span>
            </div>
            <Select
                value={globalModel}
                onValueChange={setGlobalModel}
                disabled={isLoading}
            >
                <SelectTrigger className="w-40 h-8">
                    <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                    {isLoading ? (
                        <SelectItem value="loading" disabled>
                            Loading models...
                        </SelectItem>
                    ) : availableModels.length === 0 ? (
                        <SelectItem value="none" disabled>
                            No models found
                        </SelectItem>
                    ) : (
                        availableModels.map((model) => (
                            <SelectItem key={model.name} value={model.name}>
                                {model.name}
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh models"
            >
                <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
            </Button>
        </div>
    );
}
