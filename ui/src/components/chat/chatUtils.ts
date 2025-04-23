// ui/src/components/chat/chatUtils.ts

import { BuilderScenario, CourseScenario } from "@/types/builder";

// Create a system prompt based on the scenario type
export function createSystemPrompt(
    scenario: BuilderScenario | CourseScenario
): string {
    if (scenario.kind === "coursework") {
        return `You are a helpful educational schedule assistant that can help analyze coursework schedules.
You can provide insights about optimizing time allocation, balancing workload across days, and meeting all required coursework tasks.
Answer any questions about the provided schedule scenario clearly and helpfully.`;
    } else {
        return `You are a helpful stress management and educational assistant that can help analyze course stress levels.
You can provide insights about managing workload, reducing stress, prioritizing tasks, and maintaining academic performance.
Answer any questions about the provided course scenario clearly and helpfully.`;
    }
}

// Create a welcome message based on the scenario type
export function createWelcomeMessage(
    scenario: BuilderScenario | CourseScenario
): string {
    if (scenario.kind === "coursework") {
        const courseworkScenario = scenario as BuilderScenario;
        const isFeasible = courseworkScenario.output?.status === "feasible";

        return isFeasible
            ? `👋 Hello! I'm here to help you understand Scenario ${scenario.scenarioId}: "${scenario.description}".
            
This schedule is **feasible** and meets all the specified constraints. I can help you understand how the tasks are distributed, suggest optimizations, or answer any questions about the schedule.

What would you like to know about this scenario?`
            : `👋 Hello! I'm here to help you understand Scenario ${scenario.scenarioId}: "${scenario.description}".
            
This schedule is currently **infeasible** with the given constraints. I can help explain why the constraints can't be satisfied or suggest ways to modify them to create a workable schedule.

What would you like to know about this scenario?`;
    } else {
        const stressScenario = scenario as CourseScenario;
        const predictedStress =
            stressScenario.output.stress_metrics.predicted_next_week.average;
        const isManageable = predictedStress < 7;

        return isManageable
            ? `👋 Hello! I'm here to help you understand Course Scenario ${
                  scenario.scenarioId
              }: "${scenario.description}".
            
This course currently shows a **manageable stress level** of ${predictedStress.toFixed(
                  1
              )}/10 for the coming week. I can help you understand the workload distribution, suggest study strategies, or answer any questions about managing this course.

What would you like to know about this scenario?`
            : `👋 Hello! I'm here to help you understand Course Scenario ${
                  scenario.scenarioId
              }: "${scenario.description}".
            
This course currently shows a **high stress level** of ${predictedStress.toFixed(
                  1
              )}/10 for the coming week. I can help you understand the causes of stress, suggest coping strategies, or answer any questions about managing this challenging course.

What would you like to know about this scenario?`;
    }
}

// Create scenario context for the AI
export function createScenarioContext(
    scenario: BuilderScenario | CourseScenario
): string {
    return JSON.stringify(scenario, null, 2);
}

// Get chat window styles based on expanded state and screen size
export function getChatStyles(
    isExpanded: boolean,
    isLargeScreen: boolean
): React.CSSProperties {
    if (isExpanded) {
        return {
            width: isLargeScreen ? "800px" : "90vw",
            height: isLargeScreen ? "80vh" : "80vh"
        };
    }

    return {
        width: isLargeScreen ? "400px" : "85vw",
        height: "500px"
    };
}
