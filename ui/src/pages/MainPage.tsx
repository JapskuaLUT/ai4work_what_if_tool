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
        <div className="p-10 space-y-8 text-center">
            <h1 className="text-4xl font-bold text-primary">
                Welcome to Explainable AI Scheduler
            </h1>
            <p className="text-muted-foreground text-lg">
                This tool helps non-technical users understand and compare
                AI-generated schedules based on real-world constraints.
            </p>

            <div className="mt-10 grid gap-6 grid-cols-1 sm:grid-cols-2 justify-center max-w-3xl mx-auto">
                <Button
                    className="h-32 text-xl shadow-lg hover:shadow-xl transition-all"
                    onClick={() => handleProjectSelect("coursework")}
                >
                    📘 Coursework Scheduling
                </Button>
                <Button
                    className="h-32 text-xl shadow-lg hover:shadow-xl transition-all"
                    onClick={() => handleProjectSelect("teaching-plan")}
                >
                    🧑‍🏫 Teaching Plan Scheduling
                </Button>
            </div>
        </div>
    );
}
