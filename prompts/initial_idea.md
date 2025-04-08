# Initial idea for the LLM prompt for scheduling problem explainability.

You are an AI assistant that provides clear, user-friendly explanations of scheduling problems. You have access to the constraints, tasks, and final outcomes of multiple scheduling scenarios but not the solver’s internal logs. Your goal is to interpret the results and explain them in a way that a non-expert user can understand.

We have different scheduling “runs” (scenarios). For each scenario, the input includes:

1. A set of tasks (some with fixed schedules, some flexible with total hours).
2. A list of constraints (e.g., maximum hours per day, free afternoons, etc.).
3. The final result: either a feasible schedule (with day-by-day tasks) or an infeasible outcome.

Your task:

1. **Explain** – in plain, user-friendly language – why the solver might have chosen these assignments (or reported “no solution”).
2. **Highlight** the key constraints that influenced the final schedule (or infeasibility).
3. **Compare** multiple scenarios, pointing out how or why changing certain constraints/requirements led to different results.
4. **Offer** a short summary or lesson learned from each scenario.

You will receive the scenarios as a JSON object. Please analyze it carefully and produce:

-   A **section-by-section** explanation for each scenario (1 through N).
-   A **plain-language** description suitable for a non-technical audience (e.g., a student or teacher who just wants to understand the schedule).
-   In the case of an infeasible scenario, discuss which constraints are likely clashing and why no valid arrangement can be found.
-   A **final comparison** among all scenarios, summarizing the main differences and lessons.

### Desired Response Format

Please provide your answer with:

**Part A: Scenario-by-Scenario Explanation**

-   Summarize each scenario’s tasks and constraints in your own words.
-   Explain the final outcome (feasible or infeasible) and _why_ it likely happened.
-   Use simple language accessible to a general audience.

**Part B: Overall Comparison/Conclusion**

-   Compare how constraints differ across scenarios and how that affects feasibility and scheduling.
-   Highlight any general lessons about scheduling complexity, trade-offs, and constraints.

### Example of a Short, High-Level Explanation (Guideline)

**Scenario 1**:
“The solver managed to fit Exercises, Project, and Self-Learning within a maximum of 6 hours per day. You’ll notice Monday is busy, but Tuesday afternoon is left free. This meets the requirement of having at least one free afternoon.”

**Scenario N**:
“This scenario is infeasible because the required hours (4 for Exercises, 6 for Project, 3 for Self-Learning, plus fixed lectures) exceed what can fit into 4 hours per day, especially when you also need two free afternoons. These constraints collide, so there’s no valid schedule.”

## User prompt (the JSON)

```json
{
    "name": "Coursework Schedule Simulation Set A",
    "description": "A dataset to simulate and evaluate weekly coursework schedules under varied constraints.",
    "scenarios": [
        {
            "scenarioId": 1,
            "description": "Strict but manageable limits with some flexibility on afternoons.",
            "input": {
                "tasks": {
                    "lectures": [
                        "Mon 9–11",
                        "Mon 13–15",
                        "Tue 10–12",
                        "Tue 14–16",
                        "Wed 9–11",
                        "Wed 14–16",
                        "Thu 10–12",
                        "Fri 9–11"
                    ],
                    "exercisesHours": 6,
                    "projectHours": 8,
                    "selfLearningHours": 6
                },
                "constraints": [
                    "Max 6 hours per day",
                    "At least one free afternoon",
                    "At least two exercise sessions per week",
                    "No overlapping tasks",
                    "All lectures must be attended in real time",
                    "No work after 18:00",
                    "Minimum 30-minute break between tasks"
                ]
            },
            "output": {
                "status": "feasible",
                "schedule": [
                    {
                        "day": "Mon",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Lecture" },
                            { "time": "13–15", "task": "Lecture" },
                            { "time": "15:30–17:30", "task": "Exercises" }
                        ]
                    },
                    {
                        "day": "Tue",
                        "timeBlocks": [
                            { "time": "10–12", "task": "Lecture" },
                            { "time": "14–16", "task": "Lecture" }
                        ]
                    },
                    {
                        "day": "Wed",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Lecture" },
                            { "time": "14–16", "task": "Lecture" }
                        ]
                    },
                    {
                        "day": "Thu",
                        "timeBlocks": [
                            { "time": "10–12", "task": "Lecture" },
                            { "time": "13–15", "task": "Project" },
                            { "time": "15:30–17:30", "task": "Project" }
                        ]
                    },
                    {
                        "day": "Fri",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Lecture" },
                            { "time": "13–15", "task": "Self-learning" },
                            { "time": "15:30–17:30", "task": "Self-learning" }
                        ]
                    }
                ]
            }
        },
        {
            "scenarioId": 2,
            "description": "Stricter daily limits and extra constraints make it infeasible.",
            "input": {
                "tasks": {
                    "lectures": [
                        "Mon 9–11",
                        "Mon 13–15",
                        "Tue 10–12",
                        "Tue 14–16",
                        "Wed 9–11",
                        "Wed 14–16",
                        "Thu 10–12",
                        "Fri 9–11"
                    ],
                    "exercisesHours": 6,
                    "projectHours": 8,
                    "selfLearningHours": 6
                },
                "constraints": [
                    "Max 5 hours per day",
                    "At least two free afternoons",
                    "No overlapping tasks",
                    "At least one project block must be 3 hours long",
                    "No tasks before 8 AM or after 18 PM",
                    "At least two 1-hour self-learning sessions",
                    "Lectures must be completed within weekdays only"
                ]
            },
            "output": { "status": "infeasible", "schedule": [] }
        },
        {
            "scenarioId": 3,
            "description": "Reduced daily workload limit and enforced consecutive study blocks.",
            "input": {
                "tasks": {
                    "lectures": [
                        "Mon 9–11",
                        "Mon 13–15",
                        "Tue 10–12",
                        "Tue 14–16",
                        "Wed 9–11",
                        "Wed 14–16",
                        "Thu 10–12",
                        "Fri 9–11"
                    ],
                    "exercisesHours": 6,
                    "projectHours": 8,
                    "selfLearningHours": 6
                },
                "constraints": [
                    "Max 4 hours per day",
                    "At least two 2-hour self-learning blocks",
                    "No overlapping tasks",
                    "Lectures must be separated by at least 1 hour",
                    "At least three separate project sessions",
                    "No tasks on Friday afternoon",
                    "All study must be in 2+ hour blocks"
                ]
            },
            "output": { "status": "infeasible", "schedule": [] }
        },
        {
            "scenarioId": 4,
            "description": "Permissive model allowing up to 8-hour days and fewer break constraints.",
            "input": {
                "tasks": {
                    "lectures": [
                        "Mon 9–11",
                        "Mon 13–15",
                        "Tue 10–12",
                        "Tue 14–16",
                        "Wed 9–11",
                        "Wed 14–16",
                        "Thu 10–12",
                        "Fri 9–11"
                    ],
                    "exercisesHours": 6,
                    "projectHours": 8,
                    "selfLearningHours": 6
                },
                "constraints": [
                    "Max 8 hours per day",
                    "At least one break per day",
                    "No overlapping tasks",
                    "Lectures can be attended in recording",
                    "At least two project blocks of 2 hours",
                    "Allow tasks till 19:00",
                    "Must have one day with only lectures"
                ]
            },
            "output": {
                "status": "feasible",
                "schedule": [
                    {
                        "day": "Mon",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Lecture" },
                            { "time": "13–15", "task": "Lecture" },
                            { "time": "15:30–17:30", "task": "Exercises" },
                            { "time": "17:30–19:00", "task": "Self-learning" }
                        ]
                    },
                    {
                        "day": "Tue",
                        "timeBlocks": [
                            { "time": "10–12", "task": "Lecture" },
                            { "time": "14–16", "task": "Lecture" },
                            { "time": "16:30–18:30", "task": "Project" }
                        ]
                    },
                    {
                        "day": "Wed",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Lecture" },
                            { "time": "14–16", "task": "Lecture" },
                            { "time": "16:30–18:30", "task": "Self-learning" }
                        ]
                    },
                    {
                        "day": "Thu",
                        "timeBlocks": [
                            { "time": "10–12", "task": "Lecture" },
                            { "time": "13–15", "task": "Project" },
                            { "time": "15:30–17:30", "task": "Project" }
                        ]
                    },
                    {
                        "day": "Fri",
                        "timeBlocks": [{ "time": "9–11", "task": "Lecture" }]
                    }
                ]
            }
        }
    ]
}
```
