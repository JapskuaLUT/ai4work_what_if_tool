# Explainable AI Scheduling System – Design Document

**Version:** 1.0
**Date:** April 7, 2025
**Author:** [Janne Parkkila / LUT]

## Table of Contents

1. [Overview](#overview)
2. [Use Cases & Requirements](#use-cases--requirements)
3. [System Architecture](#system-architecture)
4. [Data Structures](#data-structures)
5. [UI/UX Design](#uiux-design)
    1. [High-Level Layout](#high-level-layout)
    2. [Core UI Components](#core-ui-components)
    3. [Interaction Flow](#interaction-flow)
    4. [Comparison & Analytics View](#comparison--analytics-view)
6. [LLM Integration](#llm-integration)
    1. [Prompting Strategy](#prompting-strategy)
    2. [Response Handling & Caching](#response-handling--caching)
7. [Implementation Outline](#implementation-outline)
    1. [Frontend (React)](#frontend-react)
    2. [Backend Components](#backend-components)
    3. [Future Extensions](#future-extensions)
8. [Example JSON Structure](#example-json-structure)
9. [Appendix: Sample Prompt & Response](#appendix-sample-prompt--response)

## 1. Overview

This document describes the **Explainable AI Scheduling System**, an application that:

-   **Generates or loads** scheduling data (e.g., tasks, constraints, final assigned schedule).
-   **Integrates** with a Large Language Model (LLM) to provide **human-friendly explanations** of why the schedule took its current form.
-   **Visualizes** the schedule (e.g., a timeline, Gantt chart, or calendar) and provides an **interactive** explanation/Q&A panel for end users.

The system is geared toward **non-technical users** who want to understand the _rationale_ behind scheduling decisions without delving into solver internals.

## 2. Use Cases & Requirements

### Use Cases

1. **Education & Training**: Students or instructors wanting to know why certain tasks were placed at specific times.
2. **Workforce / Resource Management**: Managers verifying that constraints (e.g., daily hour limits, required free afternoons) are respected.
3. **Constraint Tuning**: Observing how small changes (relaxing or tightening constraints) affect feasibility or task assignments.

### High-Level Requirements

-   **View Schedules**: Display assigned tasks in a **clear** and **intuitive** layout.
-   **Explainability**: Provide textual explanations for why the schedule looks the way it does, courtesy of an LLM.
-   **Scenario Comparison**: Support multiple “scenarios” (variations in constraints/tasks) and highlight differences in feasibility or outcomes.
-   **User-Friendly**: Require minimal scheduling/technical knowledge to interpret.
-   **Maintainability**: Code should be modular to accommodate new constraints or LLM providers.

## 3. System Architecture

```
┌──────────────────┐
│ User (UI)        │
└────────┬─────────┘
         │ React
┌────────▼─────────────────┐
│ Frontend Application     │
│ - React components       │
│ - Data fetch/format      │
│ - Visualization (charts) │
│ - LLM prompt generation  │
└────────┬─────────────────┘
         │ REST API
┌────────▼──────────────────┐
│ Backend / Server          │
│ - Scheduling data store   │           ┌───────────┐
│ - LLM integration layer   │   ------> | SCHEDULER |
│ - (Optional) Scheduling   │           └───────────┘
│ solver or logs            │
└────────┬──────────────────┘
         │
┌────────▼───────────────────┐
│ LLM API                    │
│ (OpenAI, local model, etc.)│
└────────────────────────────┘
```

1. **Frontend**: A React application presenting scheduling data and receiving user input.
2. **Backend**: May store or generate schedule data, possibly integrate with a solver or simply provide scenario JSON.
3. **LLM**: Receives well-crafted prompts (with tasks, constraints, schedule outcomes) and returns explanations.

## 4. Data Structures

### Scheduling Scenarios

A **scenario** includes:

-   **Tasks** (fixed-time and flexible)
-   **Constraints** (e.g., max hours/day, free afternoons)
-   **Final Output** (a schedule with assigned blocks **or** “infeasible”)

**Example**:

```json
{
    "scenarioId": 1,
    "input": {
        "tasks": {
            "lectures": ["Mon 9–11", "Wed 14–16"],
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
                    { "time": "13–15", "task": "Project" }
                ]
            }
        ]
    }
}
```

## 5. UI/UX Design

### 5.1 High-Level Layout

A top-level page with:
• Header:
• App title or logo.
• Scenario selector (dropdown or tabs).
• “Compare Scenarios” button.
• Main Content:
• Constraint Summary Panel (left or collapsible).
• Schedule Visualization (center).
• Explanations & Q&A Panel (right).
• Footer (optional).

### 5.2 Core UI Components

    1.	ScenarioSelector
        •	Dropdown or tab-based interface to switch scenarios.
        •	On selection, loads scenario data into the main view.
    2.	ConstraintSummary
        •	Collapsible list or accordion, showing constraints from scenario input.
        •	Example: “Max 6 hours/day,” “At least one free afternoon,” etc.
    3.	ScheduleView
        •	Gantt/Calendar library or custom timeline.
        •	Days (Mon–Fri, or user-defined range) displayed.
        •	Time blocks assigned to tasks, color-coded.
        •	Hover/Tooltip to show details.
        •	Possibly highlight constraints (e.g., free afternoons in a specific color).
    4.	ExplanationPanel
        •	Displays LLM’s textual explanation.
        •	Might include bullet points: “Reasons for Monday’s schedule…,” “Why tasks had to shift…,” etc.
        •	If the scenario is infeasible, it displays likely conflicts or constraints.
    5.	Q&A ChatBox (optional advanced feature)
        •	Allows user to type custom questions (“Why is Tuesday empty?”).
        •	Sends query + context to LLM, displays the answer.

### 5.3 Interaction Flow

    1.	User selects a scenario (or a default scenario loads).
    2.	App fetches scenario data from local or server.
    3.	UI displays:
        •	Constraints in the summary panel.
        •	The schedule in the calendar/Gantt.
        •	Explanation text from the LLM in the explanation panel.
    4.	User can ask follow-up questions.
    5.	LLM response appears, possibly referencing tasks/blocks in the schedule view.

### 5.4 Comparison & Analytics View

    •	A table or grid showing multiple scenarios side by side:
    •	Key constraints (max hours/day, #free afternoons, etc.).
    •	Feasibility status (feasible/infeasible).
    •	Quick link to “View Explanation” or “Open Full Schedule.”

## 6. LLM Integration

### 6.1 Prompting Strategy

    •	Generate a concise but comprehensive prompt that includes:
    •	Scenario tasks.
    •	Constraints.
    •	Final schedule (if feasible).
    •	Clear instructions: “Explain to a non-expert why the solver produced these assignments.”

Example prompt snippet:

`"You are an AI assistant. Here is a scheduling scenario with tasks, constraints, and the final outcome.
Please explain in user-friendly language why the solver assigned tasks as shown, highlight key constraints,
and offer a brief comparison with other scenarios if relevant.
Scenario data: <insert JSON>..."`

### 6.2 Response Handling & Caching

    •	Cache the LLM’s explanation for each scenario to avoid repeated API costs.
    •	Optionally store the explanation in a structured format (JSON with references to days/tasks) if you want to highlight UI elements dynamically.

## 7. Implementation Outline

### 7.1 Frontend (React)

    1.	Data Loading:
        •	A context or global state for scenarios.
        •	Optionally fetch from an API endpoint or load from static JSON.
    2.	Scenario Selection:
        •	Keep track of the current scenario ID in React state.
    3.	Visualization (Calendar/Gantt):
        •	Use a library (react-calendar-timeline, react-gantt, or custom).
        •	Map scenario schedule data into the library’s expected props.
    4.	LLM Explanation:
        •	On scenario load, request the explanation from your backend or use pre-fetched data.
        •	Render in a panel or text area.
        •	If user Q&A is enabled, have an input field + button that calls a “askLLM” function.

### 7.2 Backend Components

    •	Data Storage:
    •	Store scenario definitions (tasks, constraints, outcomes) in a simple DB or JSON.
    •	LLM Integration Layer:
    •	Endpoint that receives scenario data and calls the LLM (e.g., OpenAI API).
    •	Optional: A scheduling solver if you’re generating schedules on the fly. Otherwise, you can store pre-computed results.

### 7.3 Future Extensions

    •	Scenario Builder: Let users create or modify constraints (e.g., “Change max hours to 5/day”) and re-run the solver.
    •	Advanced Visualization: Add filters (e.g., only show lecture blocks), or color-coded conflict areas if partial constraints are broken.
    •	Multi-User Support: Different roles or permissions for editing constraints vs. viewing schedules.

## 8. Example JSON Structure

A single file or API response containing multiple scenarios:

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
                    }
                ]
            }
        }
    ]
}
```

Refer to this file for both visualization and explanations.

## 9. Appendix: Sample Prompt & Response

Sample Prompt (sent to LLM):

```
"You are an AI assistant that explains scheduling outcomes.
Below is a JSON object with scenario details (tasks, constraints, final schedule).
Please provide a user-friendly explanation of why certain tasks were assigned to these time blocks,
how constraints were satisfied, and any notable trade-offs.
Make sure to use language suitable for non-experts.
Here is the JSON for Scenario 1:
{
'scenarioId': 1,
'input': {...},
'output': {...}
}
"
```

Sample LLM Response (condensed):

```
Scenario 1 Explanation:

-   The solver placed the Project tasks on Monday afternoon to fill available time
    without exceeding the 6-hour daily limit...
-   Tuesday afternoon is left free, satisfying the “at least one free afternoon” requirement...
-   Etc.
```

This response is then displayed in the Explanations panel of your React app.

## Conclusion

With this design:

    •	Developers get clear instructions on how to build the React-based UI, integrate with a scheduling data source, and leverage an LLM for textual explanations.
    •	Non-expert end users can see a visual schedule plus immediate, clear reasons for scheduling decisions and constraints.
    •	The flexibility of the design allows adding new features (custom scenario building, Q&A) or scaling up to more complex scheduling use cases.

End of Document
