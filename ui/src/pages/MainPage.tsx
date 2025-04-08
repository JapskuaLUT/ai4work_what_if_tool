// ui/src/pages/MainPage.tsx

import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function MainPage() {
    const navigate = useNavigate();

    const handleScenarioSelect = (id: string) => {
        navigate(`/scheduler/${id}`);
    };

    return (
        <div className="p-8 space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Explainable AI Scheduler</h1>
                <Tabs defaultValue="1" onValueChange={handleScenarioSelect}>
                    <TabsList>
                        <TabsTrigger value="1">Scenario 1</TabsTrigger>
                        <TabsTrigger value="2">Scenario 2</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button
                    variant="secondary"
                    onClick={() => navigate("/scheduler/compare")}
                >
                    Compare Scenarios
                </Button>
            </header>

            <section className="text-center text-muted-foreground">
                <p>
                    Select a scenario above to view its schedule and
                    explanations, or compare scenarios side by side.
                </p>
                <p className="mt-2">
                    This tool helps non-technical users understand why certain
                    scheduling decisions were made.
                </p>
            </section>
        </div>
    );
}
