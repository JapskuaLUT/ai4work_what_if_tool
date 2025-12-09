# Educational Stress Simulation - User Instructions

**Last Updated:** 2025-01-13
**Version:** 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [What This Tool Does](#what-this-tool-does)
3. [Quick Start Guide](#quick-start-guide)
4. [Understanding the Input](#understanding-the-input)
5. [API Usage](#api-usage)
6. [Understanding the Output](#understanding-the-output)
7. [The Four Optimization Strategies](#the-four-optimization-strategies)
8. [How Stress is Calculated](#how-stress-is-calculated)
9. [Deadline Extensions Explained](#deadline-extensions-explained)
10. [Interpreting Results](#interpreting-results)
11. [Example Scenarios](#example-scenarios)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The **Educational Stress Simulation** tool helps instructors and course planners optimize course workload to reduce student stress while maintaining learning outcomes.

The system analyzes your course schedule and generates **4 different optimization strategies** that suggest how to adjust homework hours and assignment deadlines to keep student stress within healthy limits.

### Key Features

-   ✅ **Multi-factor stress calculation** - Considers workload, deadlines, difficulty, attendance method, and semester fatigue
-   ✅ **4 optimization strategies** - From conservative to aggressive approaches
-   ✅ **Deadline extensions** - NEW! Suggest extending assignment deadlines instead of just redistributing hours
-   ✅ **Hour conservation** - Total learning hours always maintained (ECTS integrity)
-   ✅ **Feasibility scoring** - Each strategy rated 0-100 for how well it works
-   ✅ **Week-by-week breakdown** - See exactly what changes in each week

---

## What This Tool Does

### Input

You provide:

-   Course details (difficulty, attendance method, total weeks)
-   Assignment schedules (when assignments start and end)
-   Weekly workload (teaching hours, lab hours, homework hours)
-   Current status (which week you're in)
-   Optimization preferences (stress thresholds, whether extensions are allowed)

### Processing

The system:

1. Calculates current stress levels for each week
2. Identifies weeks with excessive stress (warning zone: 75+, critical zone: 85+)
3. Generates 4 different optimization strategies
4. For each strategy, calculates how stress levels would change
5. Scores each strategy on feasibility (0-100)

### Output

You receive:

-   4 optimized schedules with different approaches
-   Stress levels for each week in each scenario
-   Number of weeks modified
-   Number of deadline extensions used (if applicable)
-   Feasibility score for each strategy
-   Detailed breakdown of all changes

---

## Quick Start Guide

### Step 1: Prepare Your Input

Create a JSON file with your course information. Here's a minimal example:

```json
{
    "name": "My Course - Spring 2025",
    "course_info": {
        "course_name": "Introduction to Programming",
        "course_id": "CS-101",
        "topic_difficulty": 3,
        "total_weeks": 12,
        "attendance_method": "Hybrid",
        "has_prerequisites": true,
        "teaching_hours": 24,
        "lab_hours": 12,
        "ects": 5,
        "total_homework_hours": 100,
        "total_assignments": 3,
        "success_rate_percent": 85.0,
        "average_grade": 3.5,
        "course_sessions": [],
        "lab_sessions": []
    },
    "assignment_weeks": [
        { "id": 1, "start_week": 1, "end_week": 4, "extensions": [] },
        { "id": 2, "start_week": 5, "end_week": 8, "extensions": [] },
        { "id": 3, "start_week": 9, "end_week": 12, "extensions": [] }
    ],
    "current_status": {
        "current_week": 1,
        "latest_adjusted_week": 0
    },
    "week_schedules": [
        {
            "week_number": 1,
            "adjusted": false,
            "teaching_hours": 2,
            "lab_hours": 1,
            "homework_hours": 8
        },
        {
            "week_number": 2,
            "adjusted": false,
            "teaching_hours": 2,
            "lab_hours": 1,
            "homework_hours": 8
        },
        {
            "week_number": 3,
            "adjusted": false,
            "teaching_hours": 2,
            "lab_hours": 1,
            "homework_hours": 9
        },
        {
            "week_number": 4,
            "adjusted": false,
            "teaching_hours": 2,
            "lab_hours": 1,
            "homework_hours": 12
        }
        // ... continue for all 12 weeks
    ],
    "optimization_request": {
        "optimization_target": "minimize_peak_stress",
        "stress_threshold_warning": 75,
        "stress_threshold_critical": 85,
        "allow_extensions": true,
        "max_extensions_per_assignment": 2,
        "consider_all_remaining_weeks": true
    },
    "students": {
        "count": 50
    },
    "metadata": {
        "created_at": "2025-01-13T10:00:00Z",
        "creator_id": "instructor_1",
        "semester_id": "spring_2025"
    }
}
```

**See**: `backend/test_simulation_realistic.json` for a complete working example.

### Step 2: Submit to API

```bash
curl -X POST https://backend.localhost/api/simulations/education/ \
  -H "Content-Type: application/json" \
  -d @my_course.json
```

**Response:**

```json
{
    "caseId": "6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c",
    "message": "Simulation created successfully",
    "scenarios_generated": 4
}
```

**Save the `caseId`** - you'll need it to retrieve results!

### Step 3: Retrieve Results

Get a specific optimization scenario:

```bash
curl https://backend.localhost/api/simulations/education/6c1c66ec.../adjustment_4
```

Or get all scenarios at once:

```bash
curl https://backend.localhost/api/simulations/education/6c1c66ec...
```

---

## Understanding the Input

### Required Fields

#### 1. **Course Information** (`course_info`)

| Field                  | Type         | Description                       | Example                      |
| ---------------------- | ------------ | --------------------------------- | ---------------------------- |
| `course_name`          | string       | Full course name                  | "Full-Stack Web Development" |
| `course_id`            | string       | Course code                       | "CS-220"                     |
| `topic_difficulty`     | number (1-5) | Course difficulty level           | 3                            |
| `total_weeks`          | number       | Duration in weeks                 | 12                           |
| `attendance_method`    | string       | "Physical", "Hybrid", or "Online" | "Hybrid"                     |
| `has_prerequisites`    | boolean      | Does course have prerequisites?   | true                         |
| `teaching_hours`       | number       | Total lecture hours for semester  | 24                           |
| `lab_hours`            | number       | Total lab hours for semester      | 12                           |
| `ects`                 | number       | ECTS credits                      | 5                            |
| `total_homework_hours` | number       | Total homework for semester       | 100                          |
| `total_assignments`    | number       | Number of major assignments       | 3                            |
| `success_rate_percent` | number       | Historical pass rate              | 85.0                         |
| `average_grade`        | number (0-5) | Historical average grade          | 3.5                          |

**Difficulty Scale:**

-   1 = Very Easy (introductory, basic concepts)
-   2 = Easy (some complexity, manageable)
-   3 = Moderate (typical undergraduate course)
-   4 = Hard (advanced topics, significant complexity)
-   5 = Very Hard (graduate-level, extremely challenging)

**Attendance Method Impact on Stress:**

-   **Physical**: 100% stress (baseline, requires commuting and fixed schedule)
-   **Hybrid**: 95% stress (some flexibility, less commuting)
-   **Online**: 90% stress (maximum flexibility, work from home)

#### 2. **Assignment Weeks** (`assignment_weeks`)

Define when each major assignment is active:

```json
[
    {
        "id": 1,
        "start_week": 1,
        "end_week": 4,
        "extensions": []
    }
]
```

-   `id`: Unique identifier for the assignment
-   `start_week`: Week when assignment is given
-   `end_week`: Week when assignment is due
-   `extensions`: List of any existing extensions (usually empty initially)

**Note:** Students are considered to be working on an assignment during all weeks from `start_week` to `end_week`. The stress model counts concurrent assignments in each week.

#### 3. **Week Schedules** (`week_schedules`)

Define the workload for each week:

```json
[
    {
        "week_number": 1,
        "adjusted": false,
        "teaching_hours": 2,
        "lab_hours": 1,
        "homework_hours": 8
    }
]
```

-   `week_number`: 1 through `total_weeks`
-   `adjusted`: Always `false` in input (set to `true` by optimizer)
-   `teaching_hours`: Hours of lectures this week
-   `lab_hours`: Hours of lab work this week
-   `homework_hours`: Hours of homework/self-study this week

**Important:** Provide one entry for each week (if `total_weeks` is 12, provide 12 entries).

#### 4. **Current Status** (`current_status`)

```json
{
    "current_week": 3,
    "latest_adjusted_week": 0
}
```

-   `current_week`: Which week of the semester you're currently in (1 to total_weeks)
-   `latest_adjusted_week`: Always 0 in input

**Why this matters:** The optimizer only modifies weeks from `current_week` onwards. Past weeks are locked.

#### 5. **Optimization Request** (`optimization_request`)

```json
{
    "optimization_target": "minimize_peak_stress",
    "stress_threshold_warning": 75,
    "stress_threshold_critical": 85,
    "allow_extensions": true,
    "max_extensions_per_assignment": 2,
    "consider_all_remaining_weeks": true
}
```

-   `optimization_target`: Always "minimize_peak_stress" (other modes not yet implemented)
-   `stress_threshold_warning`: Yellow zone threshold (recommended: 75)
-   `stress_threshold_critical`: Red zone threshold (recommended: 85)
-   `allow_extensions`: Set to `true` to enable the extension-based scenario (Adjustment 4)
-   `max_extensions_per_assignment`: How many weeks each assignment can be extended (1-3 recommended)
-   `consider_all_remaining_weeks`: Always `true`

**Threshold Guidelines:**

-   0-50: Low stress (comfortable, sustainable)
-   50-75: Moderate stress (manageable but noticeable)
-   75-85: High stress - **Warning Zone** (concerning, intervention recommended)
-   85-100: Extreme stress - **Critical Zone** (unsustainable, serious problems)

#### 6. **Students** (`students`)

```json
{
    "count": 50
}
```

Number of students in the course (used for statistical modeling).

#### 7. **Metadata** (`metadata`)

```json
{
    "created_at": "2025-01-13T10:00:00Z",
    "creator_id": "instructor_1",
    "semester_id": "spring_2025"
}
```

-   `created_at`: ISO 8601 timestamp
-   `creator_id`: Who created the simulation
-   `semester_id`: Which semester/term

---

## API Usage

### Base URL

```
https://backend.localhost/api/simulations/education/
```

### Endpoints

#### 1. Create Simulation

**POST** `/api/simulations/education/`

**Request:**

```bash
curl -X POST https://backend.localhost/api/simulations/education/ \
  -H "Content-Type: application/json" \
  -d @course_input.json
```

**Response (Success - 201):**

```json
{
    "caseId": "6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c",
    "message": "Simulation created successfully",
    "scenarios_generated": 4
}
```

**Response (Error - 400/500):**

```json
{
    "error": "Validation failed",
    "details": "Missing required field: course_info.total_weeks"
}
```

#### 2. Get All Scenarios

**GET** `/api/simulations/education/:caseId`

**Request:**

```bash
curl https://backend.localhost/api/simulations/education/6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c
```

**Response:**

```json
{
    "case_id": "6c1c66ec-c0c1-4483-ac64-3a9ad58f4f1c",
    "name": "Web Development Course - Spring 2025",
    "scenarios": [
        {
            "adjustment_id": "adjustment_1",
            "name": "Minimal Adjustment - Critical Only",
            "feasibility_score": 45.2,
            "peak_stress": 92.3,
            "extensions_used": 0
        },
        {
            "adjustment_id": "adjustment_2",
            "name": "Balanced Redistribution",
            "feasibility_score": 58.7,
            "peak_stress": 87.5,
            "extensions_used": 0
        },
        {
            "adjustment_id": "adjustment_3",
            "name": "Aggressive Optimization - Maximum Relief",
            "feasibility_score": 67.3,
            "peak_stress": 82.1,
            "extensions_used": 0
        },
        {
            "adjustment_id": "adjustment_4",
            "name": "Extension-Based - Deadline Flexibility",
            "feasibility_score": 72.8,
            "peak_stress": 79.4,
            "extensions_used": 2
        }
    ],
    "course_info": {
        /* original course info */
    },
    "created_at": "2025-01-13T10:00:00Z"
}
```

#### 3. Get Specific Scenario

**GET** `/api/simulations/education/:caseId/:adjustmentId`

**Request:**

```bash
curl https://backend.localhost/api/simulations/education/6c1c66ec.../adjustment_4
```

**Response:**

```json
{
    "adjustment_id": "adjustment_4",
    "name": "Extension-Based - Deadline Flexibility",
    "feasibility_score": 72.8,
    "key_changes": [
        "Uses assignment deadline extensions instead of hour redistribution",
        "Spreads workload over longer periods",
        "Maintains total learning hours"
    ],
    "peak_stress": 79.4,
    "total_hours_maintained": true,
    "optimization_summary": {
        "stress_reduction_achieved": 12.6,
        "learning_outcomes_maintained": true,
        "total_adjustments_made": 7,
        "extensions_used": 2,
        "hours_redistributed": true,
        "total_hours_maintained": true
    },
    "week_schedules": [
        {
            "week_number": 1,
            "teaching_hours": 2,
            "lab_hours": 1,
            "homework_hours": 6,
            "adjusted": false,
            "stress_metrics": {
                "average_stress": 64.2,
                "maximum_stress": 76.5
            }
        },
        {
            "week_number": 4,
            "teaching_hours": 2,
            "lab_hours": 1,
            "homework_hours": 8,
            "adjusted": true,
            "stress_metrics": {
                "average_stress": 72.3,
                "maximum_stress": 85.7
            },
            "optimization_changes": {
                "original_homework_hours": 12,
                "original_teaching_hours": 2,
                "original_lab_hours": 1,
                "hours_redistributed": true,
                "change_reason": "assignment_extension_applied",
                "extension_applied": {
                    "assignment_id": 1,
                    "original_end_week": 4,
                    "new_end_week": 6,
                    "weeks_extended": 2,
                    "reason": "stress_reduction"
                }
            }
        }
        // ... more weeks
    ]
}
```

---

## Understanding the Output

### Top-Level Fields

| Field                    | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `adjustment_id`          | Scenario identifier (adjustment_1 through adjustment_4) |
| `name`                   | Human-readable strategy name                            |
| `feasibility_score`      | 0-100 rating of how well this works                     |
| `key_changes`            | List of main modifications in this scenario             |
| `peak_stress`            | Highest stress level across all weeks                   |
| `total_hours_maintained` | Always true (ECTS integrity)                            |

### Optimization Summary

| Field                          | Description                              | Example                       |
| ------------------------------ | ---------------------------------------- | ----------------------------- |
| `stress_reduction_achieved`    | Net change in average stress             | 12.6 (positive = improvement) |
| `learning_outcomes_maintained` | Always true                              | true                          |
| `total_adjustments_made`       | Number of weeks modified                 | 7                             |
| `extensions_used`              | Number of deadline extensions applied    | 2                             |
| `hours_redistributed`          | Were homework hours moved between weeks? | true                          |
| `total_hours_maintained`       | Total homework hours unchanged           | true                          |

### Week Schedules

Each week in the output shows:

```json
{
    "week_number": 4,
    "teaching_hours": 2,
    "lab_hours": 1,
    "homework_hours": 8,
    "adjusted": true,
    "stress_metrics": {
        "average_stress": 72.3,
        "maximum_stress": 85.7
    },
    "optimization_changes": {
        "original_homework_hours": 12,
        "original_teaching_hours": 2,
        "original_lab_hours": 1,
        "hours_redistributed": true,
        "change_reason": "assignment_extension_applied"
    }
}
```

**Interpretation:**

-   Original homework: 12 hours
-   Optimized homework: 8 hours (4 hours moved elsewhere)
-   Average stress: 72.3 (within acceptable range)
-   Maximum stress: 85.7 (99th percentile student - just at critical threshold)
-   Change reason: Assignment deadline was extended, reducing this week's load

### Change Reasons

| Reason                            | Meaning                                               |
| --------------------------------- | ----------------------------------------------------- |
| `critical_stress_reduction`       | Week exceeded critical threshold (85+), hours reduced |
| `balanced_stress_redistribution`  | Part of overall smoothing strategy                    |
| `aggressive_stress_optimization`  | Part of maximum reduction strategy                    |
| `deadline_extension_optimization` | Fallback when no extensions possible                  |
| `assignment_extension_applied`    | Assignment deadline extended, hours redistributed     |
| `received_extension_hours`        | Received homework from extended assignment            |
| `received_redistributed_hours`    | Received homework from high-stress weeks              |

---

## The Four Optimization Strategies

### Adjustment 1: Minimal Adjustment - Critical Only

**Philosophy:** "Do the bare minimum to avoid disaster"

**Approach:**

-   Only modify weeks with critical stress (≥85)
-   Reduce homework by 20% in critical weeks
-   Redistribute removed hours to low-stress weeks

**Best for:**

-   Mid-semester adjustments where you can't make big changes
-   Conservative course coordinators
-   Situations where you need to prove an intervention worked

**Typical Results:**

-   Feasibility score: 40-60
-   Peak stress: 85-95
-   Weeks modified: 2-4

**Example:**

```
Week 4: 95 stress → Reduce homework 12h → 10h → 87 stress
Week 8: 92 stress → Reduce homework 11h → 9h → 85 stress
Week 2: 45 stress → Increase homework 6h → 8h → 52 stress
```

---

### Adjustment 2: Balanced Redistribution

**Philosophy:** "Smooth out the workload evenly"

**Approach:**

-   Target stress level = 90% of warning threshold (≈67.5)
-   Reduce homework in any week above target
-   Distribute removed hours to all low-stress weeks
-   Creates a more even stress curve

**Best for:**

-   Planning a new course from scratch
-   Semester-start adjustments
-   Maintaining consistent student engagement

**Typical Results:**

-   Feasibility score: 55-75
-   Peak stress: 75-88
-   Weeks modified: 5-8

**Example:**

```
Week 4: 88 stress (above 67.5) → 12h → 9h → 72 stress
Week 8: 85 stress (above 67.5) → 11h → 8h → 68 stress
Week 2: 45 stress (below 67.5) → 6h → 8h → 52 stress
Week 11: 42 stress (below 67.5) → 11h → 13h → 58 stress
```

---

### Adjustment 3: Aggressive Optimization - Maximum Relief

**Philosophy:** "Pull out all the stops to reduce stress"

**Approach:**

-   Reduce homework by 35% in ANY week above warning threshold (≥75)
-   Aggressively redistribute to low-stress weeks
-   Accept that some weeks will have high workload
-   Prioritize bringing peak weeks down

**Best for:**

-   Courses with known high dropout rates
-   Student feedback indicating overwhelming workload
-   Situations where stress reduction is the top priority

**Typical Results:**

-   Feasibility score: 60-85
-   Peak stress: 70-85
-   Weeks modified: 7-11

**Example:**

```
Week 4: 88 stress → 12h → 8h (35% reduction) → 68 stress
Week 8: 85 stress → 11h → 7h (35% reduction) → 65 stress
Week 9: 78 stress → 6h → 4h (35% reduction) → 58 stress
Week 2: 45 stress → 6h → 12h → 68 stress
```

---

### Adjustment 4: Extension-Based - Deadline Flexibility ⭐ NEW

**Philosophy:** "Give more time instead of reducing work"

**Approach:**

-   Use a **greedy algorithm** to select which assignments to extend
-   Extend deadlines by 1-3 weeks (configurable)
-   Redistribute assignment workload over the extended period
-   Preserves total learning hours perfectly
-   Only modifies workload distribution, not total amount

**Best for:**

-   Courses where you can't reduce total homework
-   ECTS-constrained courses
-   Situations where deadline flexibility is possible
-   Maintaining learning outcomes while reducing stress

**Typical Results:**

-   Feasibility score: 65-90
-   Peak stress: 70-82
-   Weeks modified: 6-9
-   Extensions used: 1-3

**How it works:**

**Before Extension:**

```
Assignment 1: Weeks 1-4, 10h/week each = 40h total
Week 1: 10h homework, 65 stress
Week 2: 10h homework, 68 stress
Week 3: 10h homework, 72 stress
Week 4: 10h homework, 95 stress (CRITICAL!)
```

**After 2-Week Extension:**

```
Assignment 1: Weeks 1-6, 6.67h/week each = 40h total
Week 1: 6.67h homework, 52 stress ↓
Week 2: 6.67h homework, 55 stress ↓
Week 3: 6.67h homework, 58 stress ↓
Week 4: 6.67h homework, 75 stress ↓ (no longer critical!)
Week 5: 6.67h homework, 68 stress (received extension hours)
Week 6: 6.67h homework, 71 stress (received extension hours)
```

**Key advantages:**

-   ✅ Total homework unchanged (40h → 40h)
-   ✅ Learning outcomes maintained
-   ✅ ECTS integrity preserved
-   ✅ Peak stress reduced (95 → 75)
-   ✅ Average stress reduced across assignment period

**Greedy Algorithm Details:**

For each assignment:

1. Calculate stress reduction per week of extension
2. Score = `stress_reduction / weeks_extended`
3. Sort by score (highest efficiency first)
4. Apply top-scoring extensions first

**Example:**

```
Assignment 1: 40 stress reduction ÷ 2 weeks = 20.0 efficiency ← SELECTED FIRST
Assignment 2: 30 stress reduction ÷ 2 weeks = 15.0 efficiency ← SELECTED SECOND
Assignment 3: 12 stress reduction ÷ 1 week = 12.0 efficiency (not selected, low impact)
```

**Limitations:**

-   Requires institutional flexibility to move deadlines
-   May conflict with prerequisite courses
-   Extends semester timeline slightly
-   May not be suitable for fixed-schedule exams

---

## How Stress is Calculated

The system uses a **multi-factor stress model** based on educational research.

### Stress Components

```
Final Stress = (Base Workload × Difficulty + Deadline Pressure)
               × Attendance Modifier
               × Cumulative Fatigue Factor
```

#### 1. Base Workload Stress

Based on total hours per week (teaching + lab + homework):

| Hours/Week | Stress Range | Description            |
| ---------- | ------------ | ---------------------- |
| 0-5h       | 0-20         | Light, comfortable     |
| 5-10h      | 20-50        | Normal, manageable     |
| 10-15h     | 50-75        | Heavy, challenging     |
| 15-20h     | 75-90        | Very heavy, concerning |
| 20+h       | 90-100       | Extreme, unsustainable |

**Formula:**

```
If hours ≤ 5:    stress = hours × 4
If hours ≤ 10:   stress = 20 + (hours - 5) × 6
If hours ≤ 15:   stress = 50 + (hours - 10) × 5
If hours > 15:   stress = 75 + (hours - 15) × 5, capped at 100
```

#### 2. Difficulty Multiplier

Adjusts base stress based on course difficulty:

| Difficulty    | Multiplier |
| ------------- | ---------- |
| 1 (Very Easy) | 1.00×      |
| 2 (Easy)      | 1.15×      |
| 3 (Moderate)  | 1.30×      |
| 4 (Hard)      | 1.45×      |
| 5 (Very Hard) | 1.60×      |

**Prerequisite Penalty:** If `has_prerequisites = false`, multiply by additional 1.20× (students lack foundation knowledge).

**Formula:**

```
multiplier = 1.0 + (difficulty - 1) × 0.15
if (!has_prerequisites) {
  multiplier × 1.2
}
```

#### 3. Deadline Pressure

Additional stress from concurrent assignment deadlines:

**Base:** 15 stress points per concurrent assignment

**Period Factor:** Varies by semester progress (sinusoidal curve)

-   Early semester (week 1-3): 1.0× (students are fresh)
-   Mid-semester (week 6-8): 1.5× (peak stress period)
-   Late semester (week 11-13): 1.2× (exam stress building)

**Formula:**

```
period_factor = 1.0 + 0.5 × sin(π × week / total_weeks)
deadline_stress = num_concurrent_assignments × 15 × period_factor
```

**Example:**

```
Week 5, 2 concurrent assignments:
period_factor = 1.0 + 0.5 × sin(π × 5/12) ≈ 1.4
deadline_stress = 2 × 15 × 1.4 = 42 points
```

#### 4. Attendance Modifier

Reflects flexibility and commuting burden:

| Method     | Modifier | Rationale                       |
| ---------- | -------- | ------------------------------- |
| Physical   | 1.00×    | Full commute, fixed schedule    |
| Hybrid     | 0.95×    | Some flexibility, less travel   |
| Online     | 0.90×    | Maximum flexibility, no commute |
| Self-paced | 0.85×    | Complete control over schedule  |

#### 5. Cumulative Fatigue Factor

Students accumulate fatigue as semester progresses:

```
cumulative_factor = 1.0 + (current_week / total_weeks) × 0.5
```

| Week    | Factor | Description          |
| ------- | ------ | -------------------- |
| Week 1  | 1.04×  | Fresh, energized     |
| Week 6  | 1.25×  | Mid-semester fatigue |
| Week 12 | 1.50×  | Exhausted, burnt out |

### Complete Example Calculation

**Scenario:**

-   Week 8 of 12-week course
-   Workload: 3h teaching + 2h lab + 11h homework = 16h total
-   Difficulty: 4 (Hard)
-   Has prerequisites: Yes
-   2 concurrent assignments
-   Attendance: Hybrid

**Calculation:**

1. **Base Workload Stress:**

    ```
    16h > 15h → stress = 75 + (16 - 15) × 5 = 80
    ```

2. **Difficulty Multiplier:**

    ```
    multiplier = 1.0 + (4 - 1) × 0.15 = 1.45
    has_prerequisites = true → no penalty
    ```

3. **Deadline Pressure:**

    ```
    period_factor = 1.0 + 0.5 × sin(π × 8/12) = 1.43
    deadline_stress = 2 × 15 × 1.43 = 42.9
    ```

4. **Combined Stress:**

    ```
    combined = (80 × 1.45) + 42.9 = 158.9
    ```

5. **Attendance Modifier:**

    ```
    adjusted = 158.9 × 0.95 = 151.0
    ```

6. **Cumulative Factor:**

    ```
    cumulative = 1.0 + (8/12) × 0.5 = 1.33
    final = 151.0 × 1.33 = 200.8
    ```

7. **Cap at 100:**
    ```
    final_stress = min(200.8, 100) = 100 (EXTREME!)
    ```

**Result:** Week 8 has critical stress (100) - URGENT INTERVENTION NEEDED!

### Statistical Distribution

The system models **100 students** with varying stress responses:

-   **Average Stress:** 50th percentile (median student)
-   **Maximum Stress:** 99th percentile (most stressed student)

The distribution follows a normal curve with variance based on individual differences in:

-   Time management skills
-   Prior knowledge
-   Personal circumstances
-   Learning speed

**Why this matters:** The `maximum_stress` value represents your most vulnerable students, even if the average looks acceptable.

---

## Deadline Extensions Explained

This is the most sophisticated optimization strategy.

### How the Extension Algorithm Works

#### Step 1: Identify Candidates

For each assignment:

1. Check if it can be extended:
    - ✅ Not already ended (current_week ≤ end_week)
    - ✅ Hasn't hit max extensions (e.g., 2 weeks max)
    - ✅ Weeks available before semester ends
2. Skip if any check fails

#### Step 2: Calculate Stress Reduction

For each possible extension length (1, 2, 3 weeks):

```
Original assignment period: weeks 1-4 (4 weeks)
Total homework: 40 hours
Average stress during period: 85

Option 1 - Extend by 1 week (weeks 1-5, 5 weeks):
  New homework per week: 40h ÷ 5 = 8h/week
  New average stress: ~68
  Stress reduction: 85 - 68 = 17 points

Option 2 - Extend by 2 weeks (weeks 1-6, 6 weeks):
  New homework per week: 40h ÷ 6 = 6.67h/week
  New average stress: ~58
  Stress reduction: 85 - 58 = 27 points ← BEST

Option 3 - Extend by 3 weeks (weeks 1-7, 7 weeks):
  New homework per week: 40h ÷ 7 = 5.71h/week
  New average stress: ~52
  Stress reduction: 85 - 52 = 33 points
```

#### Step 3: Calculate Efficiency (Priority)

```
priority = stress_reduction ÷ weeks_extended
```

| Extension | Stress Reduction | Weeks   | Priority            |
| --------- | ---------------- | ------- | ------------------- |
| Option 1  | 17 points        | 1 week  | 17.0                |
| Option 2  | 27 points        | 2 weeks | **13.5** ← SELECTED |
| Option 3  | 33 points        | 3 weeks | 11.0                |

**Why not always choose maximum reduction?**

-   We want the best "bang for buck"
-   Minimize semester timeline extension
-   Save extension capacity for other assignments

#### Step 4: Sort and Filter

1. Sort all candidates by priority (highest first)
2. Filter out low-impact extensions (< 5 stress points reduction)
3. Return top recommendations

**Example Output:**

```json
[
    {
        "assignmentIndex": 0,
        "assignmentId": 1,
        "extensionWeeks": 2,
        "estimatedStressReduction": 27.0,
        "priority": 13.5
    },
    {
        "assignmentIndex": 2,
        "assignmentId": 3,
        "extensionWeeks": 1,
        "estimatedStressReduction": 12.0,
        "priority": 12.0
    }
]
```

#### Step 5: Apply Extensions

For each selected extension:

1. **Modify Assignment:**

    ```
    Original: { id: 1, start_week: 1, end_week: 4 }
    Extended: { id: 1, start_week: 1, end_week: 6 }
    ```

2. **Redistribute Homework:**

    ```
    Weeks 1-4: 10h → 6.67h each (reduced)
    Weeks 5-6: 7h → 13.67h each (increased)
    ```

3. **Track Changes:**

    ```json
    {
        "assignment_id": 1,
        "original_end_week": 4,
        "new_end_week": 6,
        "weeks_extended": 2,
        "reason": "stress_reduction",
        "homework_hours_affected": 40
    }
    ```

4. **Recalculate Stress:**
    - Week 4 now has fewer concurrent assignments
    - Homework hours are lower
    - Stress decreases

### Constraints and Limitations

**Hard Constraints:**

-   ✅ Total homework hours MUST be conserved
-   ✅ Cannot extend past semester end
-   ✅ Maximum extensions per assignment (configurable, default: 2)
-   ✅ Cannot extend assignments that already ended

**Soft Constraints:**

-   ⚠️ Prefer shorter extensions (higher efficiency)
-   ⚠️ Avoid low-impact extensions (< 5 stress points)
-   ⚠️ Maintain reasonable distribution of work

**Practical Limitations:**

-   🏫 Institutional policies may prevent deadline changes
-   📅 Fixed exam dates can't be moved
-   🔗 Prerequisite courses may impose deadlines
-   👥 Student expectations and planning

### When Extensions Work Best

✅ **Good Scenarios:**

-   Flexible course with no fixed external dependencies
-   Instructor has full control over deadlines
-   No prerequisite timeline pressures
-   Students have capacity in later weeks
-   Peaks are caused by concurrent deadlines, not content difficulty

❌ **Poor Scenarios:**

-   Fixed exam schedule
-   Course feeds into prerequisite-dependent courses
-   Late-semester extensions (nowhere to extend to)
-   Workload is too high overall (redistribution won't help)

---

## Interpreting Results

### Feasibility Score (0-100)

The feasibility score tells you **how well the optimization worked**.

| Score Range | Interpretation | Action                                           |
| ----------- | -------------- | ------------------------------------------------ |
| **80-100**  | ✅ Excellent   | Highly feasible, implement confidently           |
| **60-80**   | ✅ Good        | Feasible with minor concerns, safe to implement  |
| **40-60**   | ⚠️ Moderate    | Significant concerns, review carefully           |
| **20-40**   | ❌ Poor        | Major issues remain, consider redesigning course |
| **0-20**    | ❌ Critical    | Optimization failed, fundamental problems exist  |

**What affects the score:**

Starts at 100, then:

-   **-0.8 points** per stress point above warning threshold (75)
-   **-1.0 points** per stress point above critical threshold (85)
-   **-8 points** per week in critical zone
-   **-2 points** per week in warning zone
-   **+0.3 points** per stress point below 80% of warning (< 60)

**Example:**

```
Average stress: 78 (3 points over warning 75)
  Penalty: 3 × 0.8 = -2.4

Peak stress: 88 (3 points over critical 85)
  Penalty: 3 × 1.0 = -3.0

Weeks above critical (85): 2
  Penalty: 2 × 8 = -16.0

Weeks in warning zone (75-85): 4
  Penalty: 4 × 2 = -8.0

Total penalty: -29.4
Feasibility score: 100 - 29.4 = 70.6 (GOOD)
```

### Comparing Scenarios

**Decision Framework:**

1. **Check feasibility scores first**

    - If any scenario scores >70, prefer those
    - If all score <40, course needs redesign

2. **Consider practical constraints**

    - Can you actually extend deadlines? → Consider Adjustment 4
    - Need to make minimal changes? → Consider Adjustment 1
    - Have full flexibility? → Consider Adjustment 3

3. **Look at peak stress**

    - Which scenario brings peak stress below 85?
    - Lower peak = fewer students at risk

4. **Review weeks modified**

    - More modifications = more changes to communicate
    - Fewer modifications = easier to implement

5. **Check extensions used**
    - Do extended deadlines conflict with anything?
    - Can students handle longer assignment periods?

**Example Comparison:**

| Scenario     | Feasibility | Peak Stress | Weeks Modified | Extensions | Recommendation                             |
| ------------ | ----------- | ----------- | -------------- | ---------- | ------------------------------------------ |
| Adjustment 1 | 45          | 92          | 3              | 0          | ❌ Too little improvement                  |
| Adjustment 2 | 68          | 84          | 6              | 0          | ✅ Safe, balanced choice                   |
| Adjustment 3 | 75          | 78          | 9              | 0          | ✅ Best stress reduction, but many changes |
| Adjustment 4 | 82          | 76          | 7              | 2          | ✅ **BEST** if deadlines can be moved      |

**Decision:** Use Adjustment 4 if institutional policy allows deadline extensions, otherwise use Adjustment 2.

### Red Flags in Results

⚠️ **Warning Signs:**

1. **All scenarios score < 50**

    - Course may be fundamentally overloaded
    - Consider reducing total ECTS or homework hours
    - May need to split into two courses

2. **Peak stress still > 90 in all scenarios**

    - Optimization can't solve the problem
    - Indicates structural issues (too much content, too little time)

3. **Many weeks in critical zone despite optimization**

    - Workload distribution is poor
    - Consider spreading assignments more evenly

4. **Negative stress reduction**

    - Optimization made things worse
    - Rare, but possible if constraints are too tight
    - Review input data for errors

5. **Extensions used = 0 in Adjustment 4**
    - No assignments could be extended
    - Either all assignments already ended, or max extensions already applied
    - Scenario falls back to homework reduction

### Week-by-Week Analysis

**How to read a week:**

```json
{
    "week_number": 8,
    "teaching_hours": 3,
    "lab_hours": 2,
    "homework_hours": 7,
    "adjusted": true,
    "stress_metrics": {
        "average_stress": 82.3,
        "maximum_stress": 94.1
    },
    "optimization_changes": {
        "original_homework_hours": 11,
        "change_reason": "assignment_extension_applied"
    }
}
```

**Interpretation:**

-   ✅ Homework reduced from 11h → 7h (improvement!)
-   ⚠️ Average stress 82.3 (still in warning zone)
-   ❌ Maximum stress 94.1 (some students still in critical zone)
-   📋 Change reason: Part of deadline extension strategy

**Action Items:**

-   Week 8 is still problematic for ~1% of students (maximum stress)
-   Consider: Additional support hours, peer study groups, office hours
-   Monitor: Track actual student feedback in Week 8
-   Warn students: Week 8 will be challenging, plan accordingly

---

## Example Scenarios

### Example 1: Introductory Programming Course

**Situation:**

-   12-week course, difficulty 2 (Easy)
-   3 assignments (weeks 1-4, 5-8, 9-12)
-   Moderate workload (8-10h homework/week)
-   Current week: 1 (planning ahead)

**Input Highlights:**

```json
{
    "course_info": {
        "topic_difficulty": 2,
        "attendance_method": "Hybrid",
        "has_prerequisites": false
    },
    "current_status": { "current_week": 1 },
    "optimization_request": {
        "stress_threshold_warning": 70,
        "stress_threshold_critical": 80,
        "allow_extensions": true,
        "max_extensions_per_assignment": 2
    }
}
```

**Results:**

| Scenario     | Feasibility | Peak | Recommendation               |
| ------------ | ----------- | ---- | ---------------------------- |
| Adjustment 1 | 58          | 78   | ⚠️ Minimal improvement       |
| Adjustment 2 | 74          | 72   | ✅ Good balance              |
| Adjustment 3 | 81          | 68   | ✅ Excellent reduction       |
| Adjustment 4 | 85          | 65   | ✅ **BEST** - use extensions |

**Decision:** Use Adjustment 4 (extensions)

-   Lower thresholds (70/80) appropriate for introductory course
-   Extensions provide best results without reducing learning
-   Students are less experienced, need more flexibility

---

### Example 2: Advanced Algorithms Course (Mid-Semester Crisis)

**Situation:**

-   14-week course, difficulty 5 (Very Hard)
-   4 major assignments
-   Currently week 7, students complaining of overwhelming workload
-   Week 9 shows critical stress (95+)

**Input Highlights:**

```json
{
    "course_info": {
        "topic_difficulty": 5,
        "attendance_method": "Physical",
        "has_prerequisites": true
    },
    "current_status": { "current_week": 7 },
    "optimization_request": {
        "stress_threshold_warning": 75,
        "stress_threshold_critical": 85,
        "allow_extensions": false
    }
}
```

**Results:**

| Scenario     | Feasibility | Peak | Recommendation           |
| ------------ | ----------- | ---- | ------------------------ |
| Adjustment 1 | 32          | 88   | ❌ Insufficient          |
| Adjustment 2 | 48          | 83   | ⚠️ Moderate              |
| Adjustment 3 | 61          | 79   | ✅ Best available        |
| Adjustment 4 | N/A         | N/A  | (extensions not allowed) |

**Decision:** Use Adjustment 3 + Additional Measures

-   Extensions disabled (midway through semester, can't move deadlines)
-   Aggressive optimization brings peak to 79 (acceptable)
-   **Additional actions needed:**
    -   Add drop-in help sessions for Weeks 8-10
    -   Consider making one assignment optional for bonus credit
    -   Communicate changes clearly to students

---

### Example 3: Capstone Project Course

**Situation:**

-   16-week course, difficulty 4 (Hard)
-   Single large project spanning entire semester
-   Milestones at weeks 4, 8, 12, 16
-   Online course, students working full-time

**Input Highlights:**

```json
{
    "course_info": {
        "topic_difficulty": 4,
        "attendance_method": "Online",
        "has_prerequisites": true
    },
    "assignment_weeks": [{ "id": 1, "start_week": 1, "end_week": 16 }],
    "current_status": { "current_week": 1 },
    "optimization_request": {
        "allow_extensions": false
    }
}
```

**Results:**

| Scenario | Feasibility | Peak  | Notes                         |
| -------- | ----------- | ----- | ----------------------------- |
| All      | 25-35       | 92-98 | ⚠️ **Course structure issue** |

**Diagnosis:**

-   Single 16-week assignment creates persistent high stress
-   No clear "recovery weeks"
-   Hour redistribution can't solve this

**Recommendation:**

-   **Restructure course** - Split project into 4 separate assignments
-   Rerun simulation with new structure:
    ```json
    "assignment_weeks": [
      { "id": 1, "start_week": 1, "end_week": 4 },
      { "id": 2, "start_week": 5, "end_week": 8 },
      { "id": 3, "start_week": 9, "end_week": 12 },
      { "id": 4, "start_week": 13, "end_week": 16 }
    ]
    ```
-   This creates natural stress valleys between milestones

**After Restructuring:**

| Scenario     | Feasibility | Peak | Recommendation  |
| ------------ | ----------- | ---- | --------------- |
| Adjustment 2 | 72          | 81   | ✅ Much better! |
| Adjustment 3 | 79          | 76   | ✅ Excellent    |

---

## Troubleshooting

### Common Errors

#### 1. "Validation failed: Missing required field"

**Problem:** Input JSON is missing required fields

**Solution:**

```bash
# Check the error message for which field
# Common missing fields:
- course_info.total_weeks
- course_info.topic_difficulty
- optimization_request.stress_threshold_warning
- optimization_request.stress_threshold_critical
```

**Fix:**

-   Compare your input to `backend/test_simulation_realistic.json`
-   Ensure all required fields in [Understanding the Input](#understanding-the-input) are present

---

#### 2. "Number of week_schedules must match total_weeks"

**Problem:** You specified `total_weeks: 12` but provided 10 week schedules

**Solution:**

```json
{
  "course_info": {
    "total_weeks": 12
  },
  "week_schedules": [
    { "week_number": 1, ... },
    { "week_number": 2, ... },
    // ... must have exactly 12 entries
    { "week_number": 12, ... }
  ]
}
```

---

#### 3. "Extensions used: 0 in Adjustment 4"

**Problem:** Extension scenario didn't apply any extensions

**Possible Reasons:**

1. **`allow_extensions: false`**

    ```json
    "optimization_request": {
      "allow_extensions": true  // Must be true!
    }
    ```

2. **All assignments already ended**

    ```json
    "current_status": { "current_week": 10 },
    "assignment_weeks": [
      { "start_week": 1, "end_week": 4 }  // Already ended!
    ]
    ```

    **Fix:** Run simulation earlier in semester

3. **No weeks available for extension**

    ```json
    "assignment_weeks": [
      { "start_week": 1, "end_week": 12 }  // Already at semester end
    ],
    "course_info": { "total_weeks": 12 }
    ```

    **Fix:** Assignments must end before semester ends

4. **Max extensions already applied**

    ```json
    "assignment_weeks": [
      {
        "id": 1,
        "start_week": 1,
        "end_week": 6,
        "extensions": [
          { "extension_id": 1, "weeks_extended": 1 },
          { "extension_id": 2, "weeks_extended": 1 }
        ]
      }
    ],
    "optimization_request": {
      "max_extensions_per_assignment": 2  // Already hit max!
    }
    ```

5. **Low-impact extensions filtered out**
    - Extensions that reduce stress by < 5 points are not applied
    - This means stress is already low, no optimization needed!

---

#### 4. "Feasibility score is 0 for all scenarios"

**Problem:** Extreme stress levels, optimization can't help

**Diagnosis:**

-   Check peak stress in results (likely 95-100)
-   Look at `week_schedules` - are most weeks 85+?

**Solutions:**

1. **Reduce total homework hours**

    ```json
    "course_info": {
      "total_homework_hours": 80  // Down from 120
    }
    ```

2. **Spread assignments more evenly**

    ```json
    // Before: All 3 assignments overlap weeks 5-8
    "assignment_weeks": [
      { "start_week": 1, "end_week": 8 },
      { "start_week": 2, "end_week": 9 },
      { "start_week": 3, "end_week": 10 }
    ]

    // After: Spread out
    "assignment_weeks": [
      { "start_week": 1, "end_week": 4 },
      { "start_week": 5, "end_week": 8 },
      { "start_week": 9, "end_week": 12 }
    ]
    ```

3. **Reduce difficulty**

    ```json
    "course_info": {
      "topic_difficulty": 3  // Down from 5
    }
    ```

4. **Split course into multiple courses**
    - If nothing works, content may be too much for one course
    - Consider: Part I (8 weeks) + Part II (8 weeks)

---

#### 5. "Database connection error"

**Problem:** Backend can't connect to PostgreSQL

**Check:**

```bash
docker-compose ps
# Ensure postgres service is running

docker-compose logs postgres
# Look for errors
```

**Fix:**

```bash
# Restart database
docker-compose restart postgres

# Or restart everything
docker-compose down
docker-compose up -d
```

---

#### 6. "Case ID not found"

**Problem:** Using wrong case ID or case was deleted

**Solution:**

```bash
# Verify case exists
curl https://backend.localhost/api/simulations/education/YOUR_CASE_ID

# If not found, recreate simulation
curl -X POST https://backend.localhost/api/simulations/education/ \
  -H "Content-Type: application/json" \
  -d @your_input.json
```

---

### Unexpected Results

#### "Negative stress reduction"

**Meaning:** Optimization made things worse

**Causes:**

-   Redistribution moved hours to already-stressed weeks
-   Cumulative fatigue factor increased stress more than hour reduction helped

**What to do:**

-   This is rare but possible
-   Try different scenario (e.g., if Adjustment 2 is negative, try Adjustment 3)
-   If all are negative, input data may have errors

---

#### "Peak stress higher than original"

**Meaning:** Some weeks got worse during optimization

**Causes:**

-   Hours redistributed from critical weeks to moderate weeks
-   Moderate weeks crossed into critical threshold
-   Net effect: more weeks in critical zone

**What to do:**

-   Check `total_adjustments_made` - is it very high?
-   May indicate poor hour distribution strategy
-   Try more aggressive scenario (Adjustment 3)

---

#### "All scenarios look identical"

**Meaning:** Very similar results across all 4 scenarios

**Causes:**

1. **Stress already optimal** - Current schedule is well-balanced
2. **Very few weeks modifiable** - Late in semester, limited options
3. **Extreme constraints** - Total hours too high, no room for redistribution

**What to do:**

```bash
# Check original stress levels in input
# Are they already all < 75?

# If yes: Great! No optimization needed
# If no: Check current_week - are you late in semester?
```

---

## Best Practices

### Planning a New Course

1. **Start with realistic estimates**

    - Survey similar courses for workload expectations
    - Don't overestimate student capacity
    - Remember: 1 ECTS = 25-30 hours total work

2. **Run simulation early**

    - Test your planned schedule before semester starts
    - Set `current_week: 1`
    - Use `allow_extensions: true` to see all options

3. **Aim for feasibility > 70**

    - If initial plan scores < 70, redesign before starting
    - Much easier to fix in planning than mid-semester

4. **Spread assignments evenly**

    - Avoid overlapping assignment periods
    - Leave 1-2 week gaps between major deadlines
    - Create natural "recovery weeks"

5. **Use conservative difficulty ratings**
    - If unsure, rate difficulty higher than lower
    - Better to be pleasantly surprised than overwhelmed

---

### Mid-Semester Adjustments

1. **Run simulation at current week**

    - Set `current_week` to actual current week
    - Only future weeks can be modified

2. **Check Adjustment 1 first**

    - Minimal changes = easier to communicate
    - If score > 65, may be sufficient

3. **Communicate changes clearly**

    - Email students with updated schedule
    - Explain why changes were made (stress reduction)
    - Highlight benefits (more time, less overlap)

4. **Monitor student feedback**
    - Survey students after Week 8
    - Check if stress actually decreased
    - Adjust again if needed

---

### Using Extensions Effectively

1. **Check institutional policy first**

    - Can you legally move deadlines?
    - Do students in other courses depend on your deadlines?
    - Are there fixed exam dates?

2. **Communicate extension reasoning**

    - Don't just say "deadline moved"
    - Explain: "To reduce stress and improve learning outcomes"
    - Show before/after stress comparison

3. **Set clear expectations**

    - Extended deadline ≠ less work
    - Same total hours, just more time
    - Students should start early regardless

4. **Monitor extension usage**
    - Track how many students actually use extra time
    - If most submit early, extension may not be needed
    - Adjust future semesters accordingly

---

### Interpreting for Different Stakeholders

**For Instructors:**

-   Focus on feasibility score and peak stress
-   Use to justify workload reduction to administration
-   Document improvements for course development

**For Students:**

-   Show week-by-week stress comparison
-   Highlight "recovery weeks" in optimized schedule
-   Explain how changes benefit them directly

**For Administrators:**

-   Emphasize ECTS integrity (total hours maintained)
-   Show quantitative improvement (stress reduction %)
-   Demonstrate evidence-based course design

**For Quality Assurance:**

-   Document optimization process
-   Show multiple scenarios considered
-   Justify chosen scenario with data

---

## Technical Details

### Technology Stack

-   **Backend:** Bun + Elysia + TypeScript
-   **Database:** PostgreSQL 17 with JSONB
-   **ORM:** Drizzle ORM
-   **Deployment:** Docker + Docker Compose

### Data Retention

-   Simulations stored permanently in database
-   Retrieved by `caseId`
-   No automatic deletion
-   Can be re-run for different weeks

### Performance

-   Simulation creation: < 2 seconds
-   4 scenarios generated in parallel
-   Results cached in database
-   Retrieval: < 100ms

### API Rate Limits

-   Currently: None
-   Production: Recommended 100 requests/hour per IP

---

## Additional Resources

### Example Files

-   **Realistic scenario:** `backend/test_simulation_realistic.json`
-   **Testing guide:** `backend/TESTING_SCENARIOS.md`
-   **API specification:** `specifications/specification.yml`

### Documentation

-   **Implementation details:** `specifications/stress_updates.md`
-   **Project overview:** `CLAUDE.md`
-   **Development log:** `worklog/stress_updates_log.md`

### Test Scripts

```bash
# Create simulation and test all scenarios
cd backend
bash /tmp/test_extension_api.sh

# Test specific scenario
CASE_ID="your-case-id-here"
curl "https://backend.localhost/api/simulations/education/$CASE_ID/adjustment_4" | jq
```

---

## Support

### Getting Help

1. **Check this documentation first** - Most questions answered here
2. **Review error messages** - They contain specific details
3. **Check logs:**
    ```bash
    docker-compose logs backend
    docker-compose logs postgres
    ```
4. **Test with known-good input:**
    ```bash
    curl -X POST https://backend.localhost/api/simulations/education/ \
      -H "Content-Type: application/json" \
      -d @backend/test_simulation_realistic.json
    ```

### Reporting Issues

Include:

-   Input JSON (sanitized if needed)
-   Error message or unexpected output
-   `caseId` if available
-   What you expected vs. what you got

---

**Document Version:** 1.0
**Last Updated:** 2025-01-13
**Maintained By:** AI4Work Team
