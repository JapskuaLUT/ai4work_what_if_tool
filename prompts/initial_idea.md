# Initial idea for the LLM prompt for scheduling problem explainability.

[System / Instruction to LLM]
You are an AI assistant that provides clear, user-friendly explanations of scheduling problems. You have access to the constraints, tasks, and final outcomes of multiple scheduling scenarios but not the solver’s internal logs. Your goal is to interpret the results and explain them in a way that a non-expert user can understand.

[User Request]
We have five different scheduling “runs” (scenarios). For each scenario, the input includes:

1. A set of tasks (some with fixed schedules, some flexible with total hours).
2. A list of constraints (e.g., maximum hours per day, free afternoons, etc.).
3. The final result: either a feasible schedule (with day-by-day tasks) or an infeasible outcome.

Your task:

1. **Explain** – in plain, user-friendly language – why the solver might have chosen these assignments (or reported “no solution”).
2. **Highlight** the key constraints that influenced the final schedule (or infeasibility).
3. **Compare** multiple scenarios, pointing out how or why changing certain constraints/requirements led to different results.
4. **Offer** a short summary or lesson learned from each scenario.

Below is a JSON object containing all five scenarios. Please analyze it carefully and produce:

-   A **section-by-section** explanation for each scenario (1 through 5).
-   A **plain-language** description suitable for a non-technical audience (e.g., a student or teacher who just wants to understand the schedule).
-   In the case of an infeasible scenario, discuss which constraints are likely clashing and why no valid arrangement can be found.
-   A **final comparison** among all scenarios, summarizing the main differences and lessons.

### JSON Data

```json
{
    "scenarios": [
        {
            "scenarioId": 1,
            "input": {
                "tasks": {
                    "lectures": ["Mon 9–11", "Wed 14–16", "Fri 9–11"],
                    "exercisesHours": 2,
                    "projectHours": 4,
                    "selfLearningHours": 3
                },
                "constraints": [
                    "Max 6 hours per day",
                    "At least one free afternoon",
                    "No overlapping tasks"
                ]
            },
            "output": {
                "status": "feasible",
                "schedule": [
                    {
                        "day": "Mon",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Lecture" },
                            { "time": "13–15", "task": "Project" },
                            { "time": "15–17", "task": "Project" }
                        ]
                    },
                    {
                        "day": "Tue",
                        "timeBlocks": [{ "time": "8–10", "task": "Exercises" }]
                    },
                    {
                        "day": "Wed",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Self-Learning" },
                            { "time": "14–16", "task": "Lecture" }
                        ]
                    },
                    {
                        "day": "Thu",
                        "timeBlocks": [
                            { "time": "13–15", "task": "Self-Learning" },
                            { "time": "15–17", "task": "Self-Learning" }
                        ]
                    },
                    {
                        "day": "Fri",
                        "timeBlocks": [{ "time": "9–11", "task": "Lecture" }]
                    }
                ]
            }
        },
        {
            "scenarioId": 2,
            "input": {
                "tasks": {
                    "lectures": ["Mon 9–11", "Wed 14–16", "Fri 9–11"],
                    "exercisesHours": 2,
                    "projectHours": 4,
                    "selfLearningHours": 3
                },
                "constraints": [
                    "Max 4 hours per day",
                    "At least one free afternoon",
                    "No overlapping tasks"
                ]
            },
            "output": {
                "status": "feasible",
                "schedule": [
                    {
                        "day": "Mon",
                        "timeBlocks": [{ "time": "9–11", "task": "Lecture" }]
                    },
                    {
                        "day": "Tue",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Project" },
                            { "time": "14–16", "task": "Project" }
                        ]
                    },
                    {
                        "day": "Wed",
                        "timeBlocks": [{ "time": "14–16", "task": "Lecture" }]
                    },
                    {
                        "day": "Thu",
                        "timeBlocks": [
                            { "time": "8–10", "task": "Exercises" },
                            { "time": "10–12", "task": "Self-Learning" }
                        ]
                    },
                    {
                        "day": "Fri",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Lecture" },
                            { "time": "13–15", "task": "Self-Learning" }
                        ]
                    }
                ]
            }
        },
        {
            "scenarioId": 3,
            "input": {
                "tasks": {
                    "lectures": ["Mon 9–11", "Wed 14–16"],
                    "exercisesHours": 2,
                    "projectHours": 4,
                    "selfLearningHours": 3
                },
                "constraints": [
                    "Max 6 hours per day",
                    "Friday must be fully free",
                    "At least one additional free afternoon",
                    "No overlapping tasks"
                ]
            },
            "output": {
                "status": "feasible",
                "schedule": [
                    {
                        "day": "Mon",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Lecture" },
                            { "time": "13–15", "task": "Project" }
                        ]
                    },
                    {
                        "day": "Tue",
                        "timeBlocks": [
                            { "time": "8–10", "task": "Project" },
                            { "time": "14–16", "task": "Exercises" }
                        ]
                    },
                    {
                        "day": "Wed",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Self-Learning" },
                            { "time": "14–16", "task": "Lecture" }
                        ]
                    },
                    {
                        "day": "Thu",
                        "timeBlocks": [
                            { "time": "8–10", "task": "Self-Learning" },
                            { "time": "10–12", "task": "Self-Learning" }
                        ]
                    },
                    {
                        "day": "Fri",
                        "timeBlocks": []
                    }
                ]
            }
        },
        {
            "scenarioId": 4,
            "input": {
                "tasks": {
                    "lectures": ["Mon 9–11", "Wed 14–16", "Fri 9–11"],
                    "exercisesHours": 4,
                    "projectHours": 6,
                    "selfLearningHours": 3
                },
                "constraints": [
                    "Max 4 hours per day",
                    "At least two free afternoons",
                    "No overlapping tasks"
                ]
            },
            "output": {
                "status": "infeasible",
                "schedule": []
            }
        },
        {
            "scenarioId": 5,
            "input": {
                "tasks": {
                    "lectures": ["Mon 9–11", "Wed 10–12", "Thu 9–11"],
                    "exercisesHours": 2,
                    "projectHours": 4,
                    "selfLearningHours": 3
                },
                "constraints": [
                    "Max 6 hours per day",
                    "No tasks before 9 AM",
                    "Exactly two evenings free",
                    "No overlapping tasks"
                ]
            },
            "output": {
                "status": "feasible",
                "schedule": [
                    {
                        "day": "Mon",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Lecture" },
                            { "time": "13–15", "task": "Project" },
                            { "time": "15–17", "task": "Project" }
                        ]
                    },
                    {
                        "day": "Tue",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Exercises" },
                            { "time": "13–15", "task": "Exercises" }
                        ]
                    },
                    {
                        "day": "Wed",
                        "timeBlocks": [
                            { "time": "10–12", "task": "Lecture" },
                            { "time": "14–16", "task": "Self-Learning" }
                        ]
                    },
                    {
                        "day": "Thu",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Lecture" },
                            { "time": "14–16", "task": "Self-Learning" }
                        ]
                    },
                    {
                        "day": "Fri",
                        "timeBlocks": [
                            { "time": "9–11", "task": "Self-Learning" }
                        ]
                    }
                ]
            }
        }
    ]
}
```

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

**Scenario 4**:  
“This scenario is infeasible because the required hours (4 for Exercises, 6 for Project, 3 for Self-Learning, plus fixed lectures) exceed what can fit into 4 hours per day, especially when you also need two free afternoons. These constraints collide, so there’s no valid schedule.”

_(Feel free to expand and refine with more detail and user-friendly language.)_

Thank you! We look forward to your clear, concise explanations.
