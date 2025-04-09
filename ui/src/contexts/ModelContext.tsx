// ui/src/contexts/ModelContext.tsx

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode
} from "react";
import { listModels } from "@/services/ollamaService";
import { ModelInfo } from "@/types/chat";

interface ModelContextType {
    globalModel: string;
    setGlobalModel: (model: string) => void;
    availableModels: ModelInfo[];
    isLoading: boolean;
    error: Error | null;
    refreshModels: () => Promise<void>;
}

// Create the context with a default value
const ModelContext = createContext<ModelContextType>({
    globalModel: "",
    setGlobalModel: () => {},
    availableModels: [],
    isLoading: false,
    error: null,
    refreshModels: async () => {}
});

// Hook for components to consume the context
export const useModelContext = () => useContext(ModelContext);

// Provider component to wrap the app
export const ModelProvider = ({ children }: { children: ReactNode }) => {
    const [globalModel, setGlobalModel] = useState<string>("");
    const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Function to fetch models from the API
    const fetchModels = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await listModels();
            const modelList = response.models.map((model) => ({
                name: model.name
            }));
            setAvailableModels(modelList);

            // Set the default model if none is selected yet
            if (!globalModel && modelList.length > 0) {
                setGlobalModel(modelList[0].name);
            }

            return modelList;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error("Failed to fetch models:", error);
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch models on initial load
    useEffect(() => {
        fetchModels();
    }, []);

    // Save the selected model to localStorage when it changes
    useEffect(() => {
        if (globalModel) {
            localStorage.setItem("preferredModel", globalModel);
        }
    }, [globalModel]);

    // Load the selected model from localStorage on initial load
    useEffect(() => {
        const savedModel = localStorage.getItem("preferredModel");
        if (savedModel) {
            setGlobalModel(savedModel);
        }
    }, []);

    // Value object that will be provided to consumers
    const value = {
        globalModel,
        setGlobalModel,
        availableModels,
        isLoading,
        error,
        refreshModels: fetchModels
    };

    return (
        <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
    );
};
