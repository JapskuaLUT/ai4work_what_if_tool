// ui/src/components/chat/chatUtils.ts
// Utility functions for the chat component

import { Scenario } from "@/types/scenario";

/**
 * Creates a string representation of the scenario for context
 */
export function createScenarioContext(scenario: Scenario): string {
    // Create a stringified version of the scenario for context
    let scenarioContext = `Scenario ${scenario.scenarioId}: "${scenario.description}"\n\n`;

    // Add status
    scenarioContext += `Status: ${
        scenario.output?.status === "feasible" ? "Feasible" : "Infeasible"
    }\n\n`;

    // Add tasks
    scenarioContext += "Tasks:\n";
    scenarioContext += `- Lectures: ${scenario.input.tasks.lectures.join(
        ", "
    )}\n`;
    scenarioContext += `- Exercise Hours: ${scenario.input.tasks.exercisesHours}\n`;
    scenarioContext += `- Project Hours: ${scenario.input.tasks.projectHours}\n`;
    scenarioContext += `- Self-learning Hours: ${scenario.input.tasks.selfLearningHours}\n\n`;

    // Add constraints
    scenarioContext += "Constraints:\n";
    scenario.input.constraints.forEach((constraint, index) => {
        scenarioContext += `${index + 1}. ${constraint}\n`;
    });

    // Add schedule if available
    if (scenario.output?.status === "feasible" && scenario.output.schedule) {
        scenarioContext += "\nSchedule:\n";
        scenario.output.schedule.forEach((day) => {
            scenarioContext += `${day.day}: `;
            const blocks = day.timeBlocks
                .map((block) => `${block.time} ${block.task}`)
                .join(", ");
            scenarioContext += blocks + "\n";
        });
    }

    return scenarioContext;
}

/**
 * Creates a system prompt for the AI based on the scenario
 */
export function createSystemPrompt(scenario: Scenario): string {
    return `You are an AI assistant specialized in academic scheduling. You are analyzing Scenario ${scenario.scenarioId}: "${scenario.description}". Provide helpful explanations and suggestions about this specific scenario. Keep your answers focused on this scenario's tasks, constraints, and schedule.`;
}

/**
 * Get chat component styles based on expanded state
 */
export function getChatStyles(isExpanded: boolean, isLargeScreen: boolean) {
    // Base position is bottom-right
    if (!isExpanded) {
        return {
            width: "400px", // Wider than before but still compact
            height: "auto"
        };
    }

    // If expanded, take up more space (responsive)
    return {
        width: isLargeScreen ? "50%" : "90%",
        height: "auto",
        maxWidth: "800px" // Cap the maximum width
    };
}

/**
 * Create a welcome message for the scenario
 */
export function createWelcomeMessage(scenario: Scenario): string {
    return `I'm analyzing Scenario ${scenario.scenarioId}: "${
        scenario.description
    }". This scenario is ${
        scenario.output?.status === "feasible" ? "feasible" : "infeasible"
    }. What would you like to know about it?`;
}
