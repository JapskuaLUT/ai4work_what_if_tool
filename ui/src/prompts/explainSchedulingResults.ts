// ui/src/prompts/explainSchedulingResults.ts

export const explainSchedulingResults = (stringifiedJson: string): string => {
    // Parse the JSON to determine the plan type
    try {
        const parsedData = JSON.parse(stringifiedJson);
        const isStressPlan = parsedData.kind === "stress";

        if (isStressPlan) {
            return createStressAnalysisPrompt(stringifiedJson);
        } else {
            return createCourseworkSchedulePrompt(stringifiedJson);
        }
    } catch (error) {
        console.error("Error parsing plan data:", error);
        // If parsing fails, use the default coursework prompt
        return createCourseworkSchedulePrompt(stringifiedJson);
    }
};

/**
 * Creates a prompt for analyzing coursework scheduling scenarios
 */
const createCourseworkSchedulePrompt = (stringifiedJson: string): string => {
    return `You are an AI assistant specialized in explaining scheduling problem outputs to a non-expert audience. Your task is to analyze and explain multiple scheduling scenarios based on the following JSON input:

<json_input>
${stringifiedJson}
</json_input>

Your output should be structured as follows:

Part A: Scenario-by-Scenario Explanation
----------------------------------------
For each scenario in the JSON input:
1. Summarize the scenario's tasks and constraints in simple terms.
2. Explain whether the schedule is feasible or infeasible.
3. Clarify which constraints were most critical in shaping the outcome.

Part B: Overall Comparison/Conclusion
-------------------------------------
1. Compare how differences in constraints or required tasks led to different scheduling outcomes across scenarios.
2. Provide high-level lessons about scheduling trade-offs, complexity, or how relaxing/tightening constraints affects feasibility.

To complete this task:

1. Carefully read and analyze the JSON input.
2. For each scenario in Part A:
   a. Identify the key tasks and constraints.
   b. Determine if the schedule is feasible or infeasible.
   c. Explain the outcome in simple, non-technical language.
   d. Highlight the most impactful constraints.

3. For the overall comparison in Part B:
   a. Identify patterns in how changing constraints affected outcomes.
   b. Summarize key insights about scheduling challenges and trade-offs.

Important guidelines:
- Use plain, concise, and friendly language appropriate for non-technical users.
- Explain constraints in simple terms (e.g., "No overlapping tasks" means you can't do two things at the same time).
- Do not reveal internal chain-of-thought or solver log details.
- Address both feasible and infeasible scenarios, emphasizing why the schedule worked or failed.
- Imagine you're explaining to someone who wants the general logic without diving into solver details.

Begin your response with "Part A: Scenario-by-Scenario Explanation" and end with "Part B: Overall Comparison/Conclusion". Use appropriate subheadings for each scenario in Part A.`;
};

/**
 * Creates a prompt for analyzing course stress scenarios
 */
const createStressAnalysisPrompt = (stringifiedJson: string): string => {
    return `You are an AI assistant specialized in analyzing stress levels and workload management for students. Your task is to analyze multiple course scenarios and their stress implications based on the following JSON input:

<json_input>
${stringifiedJson}
</json_input>

Your output should be structured as follows:

Part A: Course-by-Course Analysis
----------------------------------------
For each course scenario in the JSON input:
1. Summarize the course details, workload distribution, and key stressors.
2. Analyze the current and predicted stress levels (whether they're manageable or concerning).
3. Identify specific factors contributing to stress in this scenario (assignments, difficulty, etc.).
4. Suggest specific strategies for managing this particular course's workload.

Part B: Overall Assessment and Recommendations
-------------------------------------
1. Compare stress levels across scenarios and identify patterns in what causes higher stress.
2. Provide practical recommendations for managing the overall academic workload.
3. Suggest specific time management and self-care strategies to reduce stress while maintaining academic performance.
4. If applicable, recommend which scenarios represent the most balanced approach.

To complete this task:

1. Carefully read and analyze the JSON input.
2. For each scenario in Part A:
   a. Identify the course requirements, schedule, and workload distribution.
   b. Assess current and predicted stress metrics.
   c. Highlight specific stress factors unique to each course.
   d. Provide tailored advice for each course situation.

3. For the overall assessment in Part B:
   a. Identify patterns in stress drivers across scenarios.
   b. Provide holistic recommendations for workload management.
   c. Suggest practical steps for reducing academic stress.

Important guidelines:
- Use empathetic, supportive language appropriate for stressed students.
- Be specific in your recommendations - avoid generic advice.
- Balance academic achievement with wellbeing in your suggestions.
- Focus on practical strategies students can implement.
- Use a positive, encouraging tone while acknowledging challenges.

Begin your response with "Part A: Course-by-Course Analysis" and end with "Part B: Overall Assessment and Recommendations". Use appropriate subheadings for each scenario in Part A.`;
};
