// ui/src/components/stress/FloatingStressChat.tsx

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OllamaContextChat } from "@/components/chat/OllamaContextChat";
import type { CourseAnalysisOutput } from "@/types/educationalStress";

interface FloatingStressChatProps {
    simulation: CourseAnalysisOutput;
    adjustmentId?: string;
}

export function FloatingStressChat({
    simulation,
    adjustmentId,
}: FloatingStressChatProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Prepare context for the AI chat
    const contextData = adjustmentId
        ? {
              simulation_name: simulation.name,
              course: simulation.course_info.course_name,
              adjustment: adjustmentId,
              scenario_data: simulation.week_schedules.find(
                  (s) => s.adjustment_id === adjustmentId
              ),
              thresholds: simulation.optimization_request,
          }
        : {
              simulation_name: simulation.name,
              course: simulation.course_info.course_name,
              all_scenarios: simulation.week_schedules.length,
              thresholds: simulation.optimization_request,
          };

    const systemPrompt = adjustmentId
        ? `You are an educational stress analysis expert. You're discussing a specific optimization scenario "${adjustmentId}" for the course "${simulation.course_info.course_name}".

Help the user understand:
- How this optimization strategy works
- What changes were made to the weekly schedule
- The trade-offs of this approach
- Whether this strategy suits their teaching goals
- Suggestions for further refinements

Be concise and practical in your responses.`
        : `You are an educational stress analysis expert. You're helping analyze the overall stress optimization results for the course "${simulation.course_info.course_name}".

Help the user understand:
- How to compare different optimization scenarios
- Which scenario might work best for their situation
- The pedagogical implications of different strategies
- How to interpret the stress metrics
- Practical next steps for implementation

Be concise and practical in your responses.`;

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all"
                    size="icon"
                >
                    <MessageCircle className="h-6 w-6" />
                </Button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2">
                            <MessageCircle className="h-5 w-5" />
                            <h3 className="font-semibold">
                                {adjustmentId
                                    ? "Scenario Chat"
                                    : "Stress Analysis Chat"}
                            </h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 overflow-hidden">
                        <OllamaContextChat
                            context={JSON.stringify(contextData, null, 2)}
                            systemPrompt={systemPrompt}
                            placeholder={
                                adjustmentId
                                    ? "Ask about this optimization scenario..."
                                    : "Ask about the stress analysis results..."
                            }
                        />
                    </div>
                </div>
            )}
        </>
    );
}
