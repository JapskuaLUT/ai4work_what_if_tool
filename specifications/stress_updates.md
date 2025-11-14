# Educational Stress Calculation - Implementation Specification

**Version:** 1.0
**Date:** 2025-11-13
**Status:** Design Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Stress Calculation Model](#stress-calculation-model)
3. [API Specification](#api-specification)
4. [Database Schema](#database-schema)
5. [Optimization Engine](#optimization-engine)
6. [Frontend Components](#frontend-components)
7. [Integration with Existing System](#integration-with-existing-system)
8. [Implementation Phases](#implementation-phases)
9. [Testing Strategy](#testing-strategy)
10. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose

Extend the existing What-If tool to calculate and optimize educational stress levels for courses. The system will analyze course workload, deadlines, and difficulty to generate multiple optimization scenarios that reduce student stress while maintaining learning outcomes.

### Key Features

-   Multi-factor stress calculation considering workload, deadlines, difficulty, and cumulative effects
-   Generation of multiple optimization scenarios (minimal, balanced, aggressive, extension-based)
-   Week-by-week stress tracking and prediction
-   Visual comparison of optimization scenarios
-   AI-powered explanations of optimization strategies

### Data Flow

```
User Input (Course Details)
  → API (POST /api/simulations/education/)
  → Stress Calculator (compute baseline stress)
  → Optimization Engine (generate scenarios)
  → Database (persist results)
  → API Response (caseId)
  → UI (fetch & visualize results)
```

---

## Stress Calculation Model

### Core Factors

#### 1. Workload Stress

**Formula:** Exponential curve based on total weekly hours

```
- Light load (0-5h):    stress = hours × 4          (0-20)
- Normal load (5-10h):  stress = 20 + (hours-5) × 6  (20-50)
- Heavy load (10-15h):  stress = 50 + (hours-10) × 5 (50-75)
- Extreme load (15+h):  stress = 75 + (hours-15) × 8 (75-100, capped)
```

**Rationale:** Stress increases non-linearly as workload grows. Above 15 hours/week, stress accelerates rapidly.

#### 2. Deadline Stress

**Formula:** `baseStress × periodFactor`

```
baseStress = deadlineCount × 15
periodFactor = sin(weekProgress × π) + 0.5
```

**Rationale:** Multiple concurrent deadlines compound stress. Stress peaks at mid-semester and end-of-semester.

#### 3. Difficulty Multiplier

**Formula:** `1 + (difficulty - 1) × 0.15`

-   Difficulty scale: 1-5
-   Multiplier range: 1.0 - 1.6
-   Without prerequisites: +20% additional stress

**Rationale:** Harder topics require more cognitive effort, increasing stress proportionally.

#### 4. Attendance Method Modifier

```
Physical:   1.0   (baseline)
Online:     0.9   (reduced commute stress)
Hybrid:     0.95  (mixed)
Self-paced: 0.85  (maximum flexibility)
```

**Rationale:** Different attendance methods affect stress due to commuting, scheduling flexibility, and learning environment.

#### 5. Cumulative Stress Factor

**Formula:** `1.0 + (weekProgress × 0.5)`

-   Week 1: 1.0×
-   Mid-semester: 1.25×
-   Final weeks: 1.5×

**Rationale:** Mental fatigue accumulates as the semester progresses.

### Combined Stress Calculation

```typescript
workloadComponent = baseWorkloadStress × difficultyMultiplier
totalStress = (workloadComponent + deadlineStress)
              × attendanceModifier
              × cumulativeFactor
finalStress = min(100, totalStress)
```

### Stress Distribution

The system models student population as a normal distribution:

-   **Average stress** = combinedStress
-   **Standard deviation** = 15% of average
-   **Maximum stress** = average + 1.5 × stddev (capped at 100)

This accounts for variation in student responses to the same workload.

---

## API Specification

### Endpoints

#### 1. Create Course Simulation

```
POST /api/simulations/education/
Content-Type: application/json
```

**Request Body:**

```json
{
    "name": "Mathematics I Course Analysis",
    "description": "Generate optimization scenarios for stress reduction",
    "course_info": {
        "course_name": "Mathematics I",
        "course_id": "234",
        "teaching_hours": 65,
        "lab_hours": 39,
        "ects": 6,
        "topic_difficulty": 3,
        "has_prerequisites": false,
        "total_homework_hours": 130,
        "total_weeks": 13,
        "total_assignments": 2,
        "attendance_method": "Physical",
        "success_rate_percent": null,
        "average_grade": null,
        "course_sessions": [
            { "day": "monday", "start_time": "18:00", "end_time": "21:00" }
        ],
        "lab_sessions": [
            { "day": "friday", "start_time": "18:00", "end_time": "21:00" }
        ]
    },
    "assignment_weeks": [
        { "id": 1, "start_week": 1, "end_week": 6, "extensions": [] },
        { "id": 2, "start_week": 1, "end_week": 10, "extensions": [] }
    ],
    "current_status": {
        "current_week": 4,
        "latest_adjusted_week": 0
    },
    "week_schedules": [
        {
            "week_number": 1,
            "adjusted": false,
            "teaching_hours": 5,
            "lab_hours": 3,
            "homework_hours": 10,
            "stress_metrics": {
                "average_stress": 45.2,
                "maximum_stress": 62.8
            }
        }
        // ... more weeks
    ],
    "optimization_request": {
        "optimization_target": "minimize_stress_while_maintaining_learning_outcomes",
        "stress_threshold_warning": 75.0,
        "stress_threshold_critical": 85.0,
        "allow_extensions": true,
        "max_extensions_per_assignment": 3,
        "consider_all_remaining_weeks": true
    },
    "students": { "count": 0 },
    "metadata": {
        "created_at": "2025-09-08T09:10:00.000Z",
        "creator_id": "NTOJyBXOtEOF8TBKn11T66J3wbX2",
        "semester_id": "0DbUGxMf6zFG89U6pQbm"
    }
}
```

**Response (201 Created):**

```json
{
    "caseId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "resultsUrl": "http://localhost/results/a1b2c3d4-e5f6-7890-1234-567890abcdef"
}
```

#### 2. Get All Adjustments

```
GET /api/simulations/education/:caseId
```

**Response (200 OK):**

```json
{
    "name": "Mathematics I Course Analysis",
    "description": "...",
    "course_info": {
        /* ... */
    },
    "assignment_weeks": [
        /* ... */
    ],
    "current_status": {
        /* ... */
    },
    "week_schedules": [
        {
            "adjustment_id": "adjustment_1",
            "week_schedules": [
                /* week-by-week data */
            ]
        },
        {
            "adjustment_id": "adjustment_2",
            "week_schedules": [
                /* week-by-week data */
            ]
        },
        {
            "adjustment_id": "adjustment_3",
            "week_schedules": [
                /* week-by-week data */
            ]
        }
    ],
    "optimization_request": {
        /* ... */
    },
    "students": { "count": 0 },
    "metadata": {
        /* ... */
    }
}
```

#### 3. Get Specific Adjustment

```
GET /api/simulations/education/:caseId/:adjustmentId
```

**Response (200 OK):**

```json
{
    "adjustment_id": "adjustment_2",
    "name": "Balanced Optimization with Redistribution",
    "feasibility_score": 89.2,
    "key_changes": "Assignment extensions + strategic hour redistribution",
    "peak_stress": 98.6,
    "total_hours_maintained": true,
    "optimization_summary": {
        "stress_reduction_achieved": 18.7,
        "learning_outcomes_maintained": true,
        "total_adjustments_made": 12,
        "extensions_used": 2,
        "hours_redistributed": true,
        "total_hours_maintained": true
    },
    "week_schedules": [
        {
            "week_number": 5,
            "adjusted": true,
            "teaching_hours": 5,
            "lab_hours": 3,
            "homework_hours": 9,
            "stress_metrics": {
                "average_stress": 55.3,
                "maximum_stress": 72.0
            },
            "optimization_changes": {
                "original_homework_hours": 10,
                "original_teaching_hours": 5,
                "original_lab_hours": 3,
                "hours_redistributed": true,
                "change_reason": "stress_optimization_with_hour_redistribution"
            }
        }
        // ... more weeks
    ]
}
```

---

## Database Schema

### New Tables

#### educational_simulations

```sql
CREATE TABLE educational_simulations (
  case_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  course_info JSONB NOT NULL,
  assignment_weeks JSONB NOT NULL,
  current_status JSONB NOT NULL,
  optimization_request JSONB NOT NULL,
  students JSONB,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_educational_case ON educational_simulations(case_id);
```

#### adjustment_scenarios

```sql
CREATE TABLE adjustment_scenarios (
  id SERIAL PRIMARY KEY,
  case_id TEXT REFERENCES educational_simulations(case_id) ON DELETE CASCADE,
  adjustment_id TEXT NOT NULL,
  week_schedules JSONB NOT NULL,
  summary_metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(case_id, adjustment_id)
);

CREATE INDEX idx_adjustment_case ON adjustment_scenarios(case_id);
```

### Drizzle ORM Schema

```typescript
export const educational_simulations = pgTable("educational_simulations", {
    case_id: text("case_id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    course_info: jsonb("course_info").notNull(),
    assignment_weeks: jsonb("assignment_weeks").notNull(),
    current_status: jsonb("current_status").notNull(),
    optimization_request: jsonb("optimization_request").notNull(),
    students: jsonb("students"),
    metadata: jsonb("metadata").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const adjustment_scenarios = pgTable("adjustment_scenarios", {
    id: serial("id").primaryKey(),
    case_id: text("case_id")
        .notNull()
        .references(() => educational_simulations.case_id, {
            onDelete: "cascade"
        }),
    adjustment_id: text("adjustment_id").notNull(),
    week_schedules: jsonb("week_schedules").notNull(),
    summary_metrics: jsonb("summary_metrics"),
    created_at: timestamp("created_at").defaultNow().notNull()
});

export const educational_simulations_relations = relations(
    educational_simulations,
    ({ many }) => ({
        adjustments: many(adjustment_scenarios)
    })
);

export const adjustment_scenarios_relations = relations(
    adjustment_scenarios,
    ({ one }) => ({
        simulation: one(educational_simulations, {
            fields: [adjustment_scenarios.case_id],
            references: [educational_simulations.case_id]
        })
    })
);
```

---

## Optimization Engine

### Scenario Generation Strategy

#### Scenario 1: Minimal Adjustment

**Strategy:** Only modify weeks exceeding critical threshold

```
For each week from current_week to end:
  Calculate stress
  If stress > critical_threshold:
    Reduce homework by 20%
    Mark as adjusted
  Else:
    Keep original schedule
```

**Goal:** Minimal disruption, address only critical issues

#### Scenario 2: Balanced Redistribution

**Strategy:** Smooth stress across all remaining weeks

```
Calculate total remaining homework hours
Calculate average weekly stress
Identify high-stress and low-stress weeks
Redistribute hours from high to low weeks
Maintain total hours constant
```

**Goal:** Even workload distribution, prevent stress spikes

#### Scenario 3: Aggressive Optimization

**Strategy:** Maximize stress reduction

```
For each week:
  If stress > warning_threshold:
    Reduce homework by 30-40%
  Extend assignment deadlines if allowed
  Redistribute to lighter weeks
```

**Goal:** Maximum stress reduction, may extend deadlines

#### Scenario 4: Extension-Based (if enabled)

**Strategy:** Use assignment extensions strategically

```
Identify weeks with multiple deadlines
Extend assignments to weeks with lower stress
Recalculate stress with new deadlines
```

**Goal:** Reduce deadline congestion without changing total hours

### Redistribution Rules

1. **Conservation:** Total hours across semester must remain constant
2. **Feasibility:** No week can have < 0 hours or > reasonable maximum
3. **Learning Pace:** Cannot reduce teaching/lab hours (fixed schedule)
4. **Deadline Constraints:** Extensions cannot exceed max allowed
5. **Week Lockdown:** Past weeks cannot be modified

---

## Frontend Components

### Page Components

#### EducationalStressPage

Main results page showing all adjustment scenarios

**Components:**

-   CourseInfoHeader: Display course details
-   AdjustmentSelector: Tabs for switching between scenarios
-   StressTimelineChart: Line chart of stress over weeks
-   OptimizationImpactChart: Before/after comparison
-   WeeklyScheduleTable: Detailed week-by-week breakdown
-   OptimizationExplanation: AI-generated explanation

#### StressComparisonPage

Side-by-side comparison of multiple scenarios

**Components:**

-   ScenarioComparison: Multi-column layout
-   StressMetricsCards: Summary cards for each scenario
-   HeatmapView: Week×Scenario stress heatmap

### Chart Components

#### StressTimelineChart

**Type:** Line chart with area shading
**Library:** Recharts
**Features:**

-   Average and maximum stress lines
-   Threshold reference lines (warning, critical)
-   Color coding: green (<75), yellow (75-85), red (>85)
-   Markers for adjusted weeks
-   Tooltip with detailed metrics

#### OptimizationImpactChart

**Type:** Bar chart comparison
**Features:**

-   Side-by-side original vs. adjusted
-   Total stress reduction metric
-   Number of weeks optimized
-   Peak stress comparison

#### WeeklyScheduleTable

**Type:** Data table with inline charts
**Features:**

-   Sortable columns
-   Highlighting for adjusted weeks
-   Before/after values for changes
-   Expandable rows for details
-   Export to CSV

### UI/UX Patterns

**Color Scheme:**

-   Green: Low stress (<75)
-   Yellow: Warning level (75-85)
-   Red: Critical level (>85)
-   Blue: Adjusted weeks
-   Gray: Unchanged weeks

**Interaction:**

-   Hover for tooltips
-   Click week for detailed analysis
-   Toggle between scenarios
-   Compare mode for multiple scenarios
-   Export/share functionality

---

## Integration with Existing System

### Backend Integration Points

#### 1. Route Registration

```typescript
// backend/src/routes/index.ts
import { educationalStressRoutes } from "./educationalStressRoutes";

export const apiRoutes = new Elysia({ prefix: "/api" })
    .use(healthRoutes)
    .use(metricsRoutes)
    .use(simulationRoutes) // Existing coursework simulations at /api/simulations/
    .use(educationalStressRoutes); // Educational stress at /api/simulations/education/
```

#### 2. Service Layer

```typescript
// backend/src/services/index.ts
export { StressCalculator } from "./stressCalculation";
export { CourseOptimizationEngine } from "./optimizationEngine";
```

#### 3. Database Migrations

```bash
# Generate migration
bunx drizzle-kit generate:pg

# Run migration
bunx drizzle-kit push:pg
```

### Frontend Integration Points

#### 1. Router Configuration

```typescript
// ui/src/App.tsx
<Route path="/educational-stress/:caseId" element={<EducationalStressPage />} />
<Route path="/educational-stress/:caseId/compare" element={<StressComparisonPage />} />
```

#### 2. Type Extensions

```typescript
// ui/src/types/builder.ts
export type PlanKind = "coursework" | "stress" | "educational_stress";

export interface EducationalStressPlan extends BasePlan {
    kind: "educational_stress";
    scenarios: EducationalStressScenario[];
}

export type Plan = CourseworkPlan | StressPlan | EducationalStressPlan;
```

#### 3. Service Integration

```typescript
// ui/src/services/educationalStressService.ts
export async function createEducationalSimulation(input: CourseAnalysisInput);
export async function fetchEducationalSimulation(caseId: string);
export async function fetchAdjustmentDetails(
    caseId: string,
    adjustmentId: string
);
```

#### 4. Main Page Button

```typescript
// ui/src/pages/MainPage.tsx
<Button onClick={() => navigate("/builder/educational-stress")}>
    🎓 Educational Stress Analysis
</Button>
```

---

## Implementation Phases

### Phase 1: Core Stress Calculator (Week 1)

**Deliverables:**

-   [ ] StressCalculator class with all calculation methods
-   [ ] Unit tests for stress formulas
-   [ ] Validation against sample data
-   [ ] Documentation of formulas

**Files:**

-   `backend/src/services/stressCalculation.ts`
-   `backend/src/services/stressCalculation.test.ts`

### Phase 2: Optimization Engine (Week 1-2)

**Deliverables:**

-   [ ] CourseOptimizationEngine class
-   [ ] Four scenario generation algorithms
-   [ ] Hour redistribution logic
-   [ ] Integration tests

**Files:**

-   `backend/src/services/optimizationEngine.ts`
-   `backend/src/services/optimizationEngine.test.ts`

### Phase 3: Backend API (Week 2)

**Deliverables:**

-   [ ] Database schema and migrations
-   [ ] API endpoint implementations
-   [ ] Request/response validation
-   [ ] Error handling
-   [ ] API documentation

**Files:**

-   `backend/src/db/schema.ts` (update)
-   `backend/src/routes/educationalStressRoutes.ts`
-   `backend/src/types/educationalStress.ts`

### Phase 4: Frontend Components (Week 3)

**Deliverables:**

-   [ ] Type definitions
-   [ ] Service layer
-   [ ] Chart components
-   [ ] Table components
-   [ ] Page layouts

**Files:**

-   `ui/src/types/educationalStress.ts`
-   `ui/src/services/educationalStressService.ts`
-   `ui/src/components/stress/StressTimelineChart.tsx`
-   `ui/src/components/stress/WeeklyScheduleTable.tsx`
-   `ui/src/pages/EducationalStressPage.tsx`

### Phase 5: Integration & Polish (Week 4)

**Deliverables:**

-   [ ] End-to-end testing
-   [ ] UI/UX refinements
-   [ ] Performance optimization
-   [ ] Documentation
-   [ ] Deployment

---

## Testing Strategy

### Unit Tests

#### Backend

```typescript
// Stress calculation tests
describe("StressCalculator", () => {
    test("calculates workload stress correctly", () => {
        expect(calculator.calculateWorkloadStress(5)).toBe(20);
        expect(calculator.calculateWorkloadStress(10)).toBe(50);
        expect(calculator.calculateWorkloadStress(15)).toBe(75);
    });

    test("applies difficulty multiplier", () => {
        const result = calculator.calculateDifficultyMultiplier(5, false);
        expect(result).toBeCloseTo(1.92); // 1.6 × 1.2
    });

    test("combines stress factors correctly", () => {
        // Test combined calculation
    });
});

// Optimization engine tests
describe("CourseOptimizationEngine", () => {
    test("generates 4 scenarios for valid input", () => {
        const scenarios = engine.generateOptimizationScenarios(mockInput);
        expect(scenarios).toHaveLength(4);
    });

    test("conserves total hours in redistribution", () => {
        const original = calculateTotalHours(input.week_schedules);
        const adjusted = calculateTotalHours(scenario.week_schedules);
        expect(adjusted).toBe(original);
    });
});
```

#### Frontend

```typescript
// Component tests
describe("StressTimelineChart", () => {
    test("renders all weeks", () => {
        render(<StressTimelineChart weeks={mockWeeks} />);
        expect(screen.getAllByRole("line")).toHaveLength(13);
    });

    test("applies correct colors for thresholds", () => {
        // Test color coding
    });
});
```

### Integration Tests

```typescript
// API integration tests
describe("Educational Stress API", () => {
    test("POST /api/simulations/education creates simulation", async () => {
        const response = await request(app)
            .post("/api/simulations/education")
            .send(mockCourseInput);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("caseId");
        expect(response.body).toHaveProperty("resultsUrl");
    });

    test("GET /api/simulations/education/:caseId returns all adjustments", async () => {
        const response = await request(app).get(`/api/simulations/education/${caseId}`);

        expect(response.status).toBe(200);
        expect(response.body.week_schedules).toBeInstanceOf(Array);
        expect(response.body.week_schedules.length).toBeGreaterThan(0);
    });
});
```

### End-to-End Tests

```typescript
// Playwright/Cypress tests
describe("Educational Stress Workflow", () => {
    test("complete user journey", async () => {
        // 1. Navigate to home page
        // 2. Click "Educational Stress Analysis"
        // 3. Fill out course form
        // 4. Submit and wait for results
        // 5. Verify charts render
        // 6. Switch between scenarios
        // 7. Export results
    });
});
```

---

## Future Enhancements

### Phase 2 Features

#### 1. Student Individual Profiles

-   Per-student stress modeling
-   Learning style considerations
-   Past performance data integration

#### 2. Machine Learning Integration

-   Predict optimal redistributions using historical data
-   Learn from instructor feedback
-   Personalized stress thresholds

#### 3. Collaborative Features

-   Share scenarios with colleagues
-   Comment and discussion threads
-   Version control for adjustments

#### 4. Advanced Analytics

-   Stress trend analysis over multiple semesters
-   Correlation with student performance
-   Predictive early warning system

#### 5. Integration with LMS

-   Direct import from Canvas/Moodle/Blackboard
-   Sync assignment deadlines
-   Export optimized schedules back to LMS

#### 6. Mobile App

-   Native iOS/Android apps
-   Push notifications for stress alerts
-   Student self-reporting interface

---

## Performance Considerations

### Caching Strategy

```typescript
// Cache stress calculations
const cacheKey = `stress_${courseId}_${weekNumber}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

const result = calculator.calculateWeeklyStress(factors);
await cache.set(cacheKey, result, { ttl: 3600 }); // 1 hour
```

### Background Processing

```typescript
// For large simulations, use job queue
if (input.total_weeks > 20) {
    const jobId = await queue.add("optimize-course", { caseId, input });
    return { jobId, status: "processing" };
}
```

### Database Optimization

```sql
-- Indexes for common queries
CREATE INDEX idx_adjustment_lookup ON adjustment_scenarios(case_id, adjustment_id);
CREATE INDEX idx_simulation_created ON educational_simulations(created_at DESC);

-- Partial index for active simulations
CREATE INDEX idx_active_sims ON educational_simulations(created_at)
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## Security Considerations

### Input Validation

```typescript
// Validate input ranges
if (
    input.course_info.topic_difficulty < 1 ||
    input.course_info.topic_difficulty > 5
) {
    throw new Error("Topic difficulty must be between 1 and 5");
}

if (input.course_info.total_weeks < 1 || input.course_info.total_weeks > 52) {
    throw new Error("Total weeks must be between 1 and 52");
}
```

### Authorization

```typescript
// Verify user owns the simulation
const simulation = await db.query.educational_simulations.findFirst({
    where: and(
        eq(educational_simulations.case_id, caseId),
        eq(educational_simulations.creator_id, userId)
    )
});

if (!simulation) {
    throw new HTTPException(403, { message: "Forbidden" });
}
```

---

## Monitoring & Observability

### Metrics to Track

```typescript
// Prometheus metrics
const stressCalculationDuration = new Histogram({
    name: "stress_calculation_duration_seconds",
    help: "Time to calculate stress metrics"
});

const optimizationScenarioCount = new Counter({
    name: "optimization_scenarios_generated_total",
    help: "Number of optimization scenarios generated"
});

const apiRequestDuration = new Histogram({
    name: "educational_stress_api_duration_seconds",
    help: "API request duration",
    labelNames: ["method", "route", "status"]
});
```

### Logging

```typescript
logger.info("Starting stress calculation", {
    caseId,
    totalWeeks: input.course_info.total_weeks,
    currentWeek: input.current_status.current_week
});

logger.warn("High stress detected", {
    caseId,
    weekNumber,
    averageStress,
    threshold: input.optimization_request.stress_threshold_critical
});
```

---

## Glossary

-   **Adjustment:** An optimized version of the week schedules
-   **Case ID:** Unique identifier for a simulation
-   **Critical Threshold:** Stress level requiring immediate intervention (default: 85)
-   **ECTS:** European Credit Transfer System units
-   **Optimization Target:** Goal for the optimization engine
-   **Redistribution:** Moving hours from high-stress to low-stress weeks
-   **Scenario:** One of multiple optimization strategies
-   **Stress Metrics:** Average and maximum stress values
-   **Warning Threshold:** Stress level indicating caution (default: 75)
-   **Week Schedule:** Hour allocation for a specific week

---

## References

-   `specification.yml` - API contract definition
-   `education.pdf` - Educational stress research
-   Existing codebase patterns in `backend/` and `ui/`

---

**Document Status:** Ready for Implementation
**Next Steps:** Begin Phase 1 - Core Stress Calculator development
