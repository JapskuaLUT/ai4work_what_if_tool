import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Scenario } from "@/types";

interface AskLLMBoxProps {
    scenario: Scenario;
}

export function AskLLMBox({ scenario }: AskLLMBoxProps) {
    const [question, setQuestion] = useState("");

    return (
        <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Ask a Question</h2>
            <div className="flex gap-2 items-center">
                <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Why is Tuesday free?"
                />
                <Button
                    onClick={() => {
                        if (question.trim()) {
                            alert(
                                `You asked: ${question}\n\n(Scenario ID: ${scenario.scenarioId})`
                            );
                        }
                    }}
                    disabled={!question.trim()}
                >
                    Ask
                </Button>
            </div>
        </div>
    );
}
