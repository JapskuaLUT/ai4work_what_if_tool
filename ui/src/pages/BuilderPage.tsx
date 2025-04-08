// ui/src/pages/BuilderPage.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Tasks = {
    lectures: string[];
    exercisesHours: number;
    projectHours: number;
    selfLearningHours: number;
};

type ScenarioInput = {
    tasks: Tasks;
    constraints: string[];
};

type Scenario = {
    scenarioId: number;
    description: string;
    input: ScenarioInput;
    output: { status: string };
};

export default function BuilderPage() {
    const { param } = useParams<{ param: string }>();
    const [inputData, setInputData] = useState<ScenarioInput | null>(null);

    console.log(`param is:${param}`);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch(`/data/${param}.json`);
                const data = await response.json();

                const scenario = data.scenarios.find(
                    (s: Scenario) => String(s.scenarioId) === param
                );

                if (scenario) {
                    setInputData(scenario.input);
                } else {
                    console.warn("Scenario not found for ID:", param);
                }
            } catch (error) {
                console.error("Failed to fetch coursework data:", error);
            }
        }

        fetchData();
    }, [param]);

    if (!inputData) {
        return <div className="p-4">Loading scenario data...</div>;
    }

    return (
        <div className="p-6 space-y-6 max-w-2xl mx-auto">
            <div>
                <Label>Lectures</Label>
                <Textarea
                    value={inputData.tasks.lectures.join("\n")}
                    readOnly
                />
            </div>

            <div>
                <Label>Exercise Hours</Label>
                <Input
                    type="number"
                    value={inputData.tasks.exercisesHours}
                    readOnly
                />
            </div>

            <div>
                <Label>Project Hours</Label>
                <Input
                    type="number"
                    value={inputData.tasks.projectHours}
                    readOnly
                />
            </div>

            <div>
                <Label>Self-Learning Hours</Label>
                <Input
                    type="number"
                    value={inputData.tasks.selfLearningHours}
                    readOnly
                />
            </div>

            <div>
                <Label>Constraints</Label>
                <Textarea value={inputData.constraints.join("\n")} readOnly />
            </div>
        </div>
    );
}
