// ui/src/pages/MainPage.tsx

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function MainPage() {
    const navigate = useNavigate();

    const handleProjectSelect = (project: string) => {
        // Navigate to an input page for the selected project
        navigate(`/builder/${project}`);
    };

    return (
        <div className="p-10 space-y-4 text-center">
            <div className="flex flex-col items-center">
                <img
                    src="/what_if_logo.png"
                    alt="What-If Logo"
                    className="h-36 w-36 mb-4"
                />
                <h1 className="text-4xl font-bold text-primary">
                    Welcome to Explainable What-If Tool
                </h1>
            </div>
            <p className="text-muted-foreground text-lg">
                This tool helps non-technical users understand and compare
                AI-generated schedules based on real-world constraints.
            </p>

            <div className="mt-10 grid gap-6 grid-cols-1 sm:grid-cols-2 justify-center max-w-3xl mx-auto">
                <Button
                    className="h-32 text-xl shadow-lg hover:shadow-xl transition-all bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleProjectSelect("10001")}
                >
                    📊 Load Stress Simulation
                </Button>
                <Button
                    className="h-32 text-xl shadow-lg hover:shadow-xl transition-all"
                    onClick={() => navigate("/test/ollama")}
                >
                    💬 Test Ollama Chat
                </Button>
            </div>
        </div>
    );
}
