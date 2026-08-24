# AI4Work What-If Tool - Project Overview

**Project Name:** AI4Work What-If Tool
**Purpose:** Explainable What-If analysis tool for educational course planning and stress optimization
**Technology Stack:** Bun + Elysia + PostgreSQL + React + Vite
**Status:** Active Development

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Development Setup](#development-setup)
6. [Key Concepts](#key-concepts)
7. [Coding Guidelines](#coding-guidelines)
8. [Common Patterns](#common-patterns)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Useful Commands](#useful-commands)

---

## Project Overview

> **Looking for a hands-on walkthrough by case?** Start here:
> - 🚚 [Yard logistics — getting started](instructions/yard_logistics/getting_started.md)
> - 🔑 [Kiosk check-in logs — getting started](instructions/logistic_logs/getting_started.md)
> - 🎓 [Education what-if — getting started](instructions/education/getting_started.md)
> - 📊 [Educational stress instructions](instructions/stress_simulation_instructions.md) (pre-v1.0 model)
>
> Each guide is self-contained, zero-prior-knowledge, and covers UI,
> common tasks, API, data formats, and glossary for that case.

### What This Tool Does

The AI4Work What-If Tool is an explainable decision support system covering two domains today:

1. **Educational course planning.** Instructors model course-plan stress under different configurations and pick the best one. Scenarios are both *generated server-side* and *authored by the user*; both go through the same engine. The stress model is `course_stress_prediction` v1.0, shared with the main AI4Work education application — see [specifications/education_stress/](specifications/education_stress/) and its [design doc](specifications/education_stress/design.md). Legacy API contract: [specifications/specification.yml](specifications/specification.yml).
2. **Yard logistics.** Planners ingest simulator outputs for truck-yard runs, see per-run KPIs and bottlenecks, generate AI-authored improvement proposals, and (when partners ship their API) forward proposals to the simulator for re-evaluation. Scenarios come *from outside* — we ingest, we don't simulate. See [specifications/yard_logistics/specification.yml](specifications/yard_logistics/specification.yml) and the [design doc](specifications/yard_logistics/design.md).

Both halves share the same Bun + Elysia backend, Postgres + Drizzle ORM, React/Vite UI, mkcert-signed Traefik front, and dockerised Ollama-proxy for AI features.

### Key Features

#### Education

-   **Shared stress model (`course_stress_prediction` v1.0):** Seven components
    per week — base load, teaching density, homework, assignment, exam,
    overload, and a 7% fatigue carry-over — summed and soft-capped into 0–90.
    Pure and deterministic; computed sequentially because each week reads the
    previous week's final stress
-   **Separate workload variables:** lecture / lab / homework / assignment /
    exam hours are never merged — each contributes differently and caps
    differently
-   **Schedule builder:** Builds weekly workload from a course definition
    (dated assignments with hours, explicit exams). Assignment and exam effects
    are *derived*, so cancelling an exam and rebuilding removes all three of
    its effects
-   **User-authored what-ifs:** Nine adjustment types across weeks, assignments
    and exams. Applied in a fixed order — domain changes, rebuild, then
    week-level changes — so a rebuild cannot discard a week-level edit
-   **Auditable output:** Every adjustment returns `applied` /
    `partially_applied` / `rejected` with a machine-readable code; every
    redistributed hour is recorded as a flow; the model version and parameters
    ship with every response
-   **Optimization Engine:** Generates comparison scenarios by greedy descent
    on peak stress (the §8 primary objective), emitting adjustment lists that
    run through the same engine as a hand-built what-if
-   **Observed-stress calibration:** Optional weekly readings blend at α = 0.45
    and train a bias carried into future weeks. Matched to weeks by date, never
    by array position
-   **Visual Comparisons:** Baseline-vs-simulated trajectories, per-week
    component breakdowns, scenario ranking
-   **AI Explanations + Floating Chat:** Grounded in the component breakdown, so
    explanations cite what actually drove a week

#### Yard logistics

-   **Simulator-export ingest:** Accept `SimulationExportData` JSON drops; the same endpoint will receive simulator-webhooks later
-   **Derived analytics:** Per-run KPIs (waiting/driving stats, throughput), bottleneck top-5 with `queue_score`, per-entity occupancy timelines, per-truck Gantt
-   **Comparison view:** Side-by-side table across simulator runs (Smooth / SequencedOk / WaitingProblem in the seeded sample)
-   **Improvements:** LLM-authored or manual proposals (typed `changes[]` union: capacity / stagger_orders / reroute / add_entity), validated server-side against the yard's entity catalogue
-   **Discuss-with-AI:** Per-proposal chat that injects the proposal + target-run KPIs into the system context
-   **`(off-yard waiting)` synthetic bottleneck:** Surfaces pre-CheckIn queueing so planners see when arrivals overwhelm the gate

#### Shared

-   **Ollama Integration:** Local LLM (host process, proxied through dockerised nginx) for chat and proposal generation

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (UI)                        │
│                                                               │
│  React + TypeScript + Vite                                   │
│  - Scenario Builder (forms, inputs)                          │
│  - Comparison Views (charts, tables)                         │
│  - AI Chat Interface (Ollama integration)                    │
│  - Routing (React Router v7)                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/REST API
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                      Backend (API)                           │
│                                                               │
│  Bun + Elysia + TypeScript                                   │
│  - REST API Endpoints                                        │
│  - Stress Calculator Service                                 │
│  - Optimization Engine                                       │
│  - Database Layer (Drizzle ORM)                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ SQL
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                      Database                                │
│                                                               │
│  PostgreSQL                                                  │
│  - simulation_sets (main simulations)                        │
│  - scenarios (individual scenarios)                          │
│  - assignments (course assignments)                          │
│  - stress_metrics (calculated stress data)                   │
│  - educational_simulations (new: stress optimization)        │
│  - adjustment_scenarios (new: optimization results)          │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
User Input → Frontend Form
          → POST /api/simulations/
          → Backend validates input
          → Stress Calculator computes metrics
          → Optimization Engine generates scenarios
          → Database stores results
          → Response returns caseId
          → Frontend fetches results via GET /api/simulations/:caseId
          → Charts and tables display data
          → User interacts with AI chat for explanations
```

---

## Technology Stack

### Backend

#### Bun (NOT Node.js)

-   **Why Bun:** Faster runtime, built-in TypeScript support, package manager
-   **Version:** Latest stable
-   **Usage:** Runtime for backend server, package manager, test runner

#### Elysia (NOT Express)

-   **Why Elysia:** Type-safe, fast, built for Bun, great developer experience
-   **Version:** Latest
-   **Key Features:**
    -   Type inference from route definitions
    -   Built-in validation with TypeBox
    -   Automatic OpenAPI/Swagger generation
    -   Plugin system (CORS, static files, etc.)

#### PostgreSQL

-   **Why PostgreSQL:** Robust, JSONB support for flexible data, good ORM support
-   **Version:** 14+
-   **Key Features:**
    -   JSONB columns for complex nested data
    -   Full relational support
    -   Excellent performance

#### Drizzle ORM

-   **Why Drizzle:** Type-safe, lightweight, great TypeScript integration
-   **Version:** Latest
-   **Key Features:**
    -   Schema-first design
    -   Automatic type inference
    -   Migration generation
    -   Drizzle Studio (database GUI)

### Frontend

#### React 19

-   **Why React 19:** Latest features, improved performance, concurrent rendering
-   **Version:** 19.0.0

#### Vite (NOT Webpack/CRA)

-   **Why Vite:** Fast HMR, optimized builds, better developer experience
-   **Version:** 6.x
-   **Build Tool:** Uses Bun instead of npm

#### TypeScript

-   **Why TypeScript:** Type safety, better IDE support, fewer runtime errors
-   **Version:** 5.7+
-   **Config:** Strict mode enabled

#### React Router v7

-   **Why v7:** Latest routing features, data loading patterns
-   **Version:** 7.5.0

#### Styling: Tailwind CSS

-   **Why Tailwind:** Utility-first, consistent design system, fast development
-   **Version:** 4.x
-   **Config:** Custom design tokens

#### Charts: Recharts

-   **Why Recharts:** React-native charts, composable, good documentation
-   **Version:** 2.15+

#### UI Components: Radix UI + shadcn/ui

-   **Why Radix:** Accessible, unstyled primitives
-   **Why shadcn:** Pre-built components with Tailwind
-   **Components:** Buttons, forms, tabs, sliders, selects, etc.

### Containerization

#### Docker

-   **Backend:** Bun-based Dockerfile
-   **Frontend:** Nginx for serving built static files
-   **Database:** PostgreSQL container
-   **Orchestration:** Docker Compose

---

## Project Structure

```
ai4work_what_if_tool/
├── backend/                  # Backend API server
│   ├── src/
│   │   ├── db/              # Database configuration
│   │   │   ├── index.ts     # Database connection
│   │   │   └── schema.ts    # Drizzle schema definitions
│   │   ├── routes/          # API route handlers
│   │   │   ├── index.ts     # Route aggregation
│   │   │   ├── simulationRoutes.ts
│   │   │   ├── healthRoutes.ts
│   │   │   └── metricsRoutes.ts
│   │   ├── services/        # Business logic
│   │   │   ├── stressCalculation.ts  # [NEW] Stress calculator
│   │   │   └── optimizationEngine.ts # [NEW] Optimization logic
│   │   ├── logging/         # Winston + Morgan logging
│   │   ├── metrics/         # Prometheus metrics
│   │   ├── tests/           # Test files
│   │   └── index.ts         # Server entry point
│   ├── public/              # Static files served by backend
│   ├── tmp/                 # Temporary files
│   ├── Dockerfile           # Backend container definition
│   ├── package.json         # Dependencies (use Bun)
│   ├── bun.lock            # Bun lockfile (NOT package-lock.json)
│   └── tsconfig.json        # TypeScript configuration
│
├── ui/                      # Frontend React application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── builder/     # Scenario builder components
│   │   │   ├── chat/        # AI chat components
│   │   │   ├── charts/      # Chart components
│   │   │   ├── results/     # Results display components
│   │   │   ├── scenario/    # Scenario view components
│   │   │   └── layouts/     # Layout components
│   │   ├── pages/           # Page components (routes)
│   │   │   ├── MainPage.tsx
│   │   │   ├── BuilderPage.tsx
│   │   │   ├── ComparePage.tsx
│   │   │   └── ScheduleResultsPage.tsx
│   │   ├── services/        # API client services
│   │   │   └── simulationService.ts
│   │   ├── types/           # TypeScript type definitions
│   │   │   ├── builder.ts
│   │   │   ├── scenario.ts
│   │   │   └── chat.ts
│   │   ├── contexts/        # React contexts
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   ├── Dockerfile           # Frontend container (Nginx)
│   ├── package.json         # Dependencies (use Bun)
│   ├── bun.lock            # Bun lockfile
│   ├── vite.config.ts       # Vite configuration
│   ├── tailwind.config.js   # Tailwind configuration
│   ├── tsconfig.json        # TypeScript configuration
│   └── components.json      # shadcn/ui configuration
│
├── specifications/          # Design documents and specs
│   ├── specification.yml    # OpenAPI specification
│   ├── education.pdf        # Educational stress research
│   └── stress_updates.md    # Educational stress implementation spec
│
├── worklog/                 # Development logs
│   └── stress_updates_log.md
│
├── docker-compose.yml       # Docker orchestration
├── nginx.conf              # Nginx configuration for frontend
├── CLAUDE.md               # This file - project overview
└── README.md               # Project README

```

---

## Development Setup

### Prerequisites

1. **Bun 1.4.0:** Install from [bun.sh](https://bun.sh)

    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```

    Both Dockerfiles pin `oven/bun:1.4.0`. Keep the host on the same version —
    the lockfiles are shared between host and container, and the images install
    with `--frozen-lockfile`.

2. **Docker & Docker Compose:** For containerized development

3. **PostgreSQL:** (Optional if using Docker)

4. **Git:** For version control

### Setup Steps

#### 1. Clone Repository

```bash
git clone <repository-url>
cd ai4work_what_if_tool
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies using Bun (NOT npm/yarn/pnpm)
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Database schema is applied automatically by Postgres on first startup
# from db/schema.sql (see "Database schema workflow" section below).
# Nothing to run here for a fresh database.

# Start development server
bun run dev
# Server runs on http://localhost:8000
```

#### 3. Frontend Setup

```bash
cd ui

# Install dependencies using Bun
bun install

# Set up environment variables (if needed)
cp .env.example .env

# Start development server
bun run dev
# Server runs on http://localhost:5173
```

#### 4. Docker Setup (Alternative)

```bash
# From project root
docker-compose up --build

# Backend: http://localhost:8000
# Frontend: http://localhost:80
# Database: localhost:5432
```

### Environment Variables

#### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai4work_db
PORT=8000
SERVER_URL=http://localhost:8000
APP_BASE_URL=http://localhost:80
NODE_ENV=development
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
VITE_OLLAMA_URL=http://localhost:11434
```

---

## Key Concepts

### 1. Simulation Sets

A **simulation set** is a collection of scenarios created for analysis. Each set has:

-   Unique `case_id` (UUID)
-   Name and description
-   Kind: "coursework", "stress", or "educational_stress"
-   Multiple scenarios for comparison

### 2. Scenarios

A **scenario** represents one specific configuration:

-   Course details (teaching hours, lab hours, ECTS, difficulty)
-   Assignment schedules
-   Current status (which week we're in)
-   Stress metrics (calculated)

### 3. Stress Metrics

**Stress metrics** are calculated values representing student stress:

-   `average_stress`: Mean stress across student population
-   `maximum_stress`: Peak stress level (99th percentile)
-   Factors: workload, deadlines, difficulty, attendance method, cumulative effects

### 4. Adjustments

An **adjustment** is one requested change. Nine types across three scopes:

-   *Week-level:* `cancel_lecture`, `cancel_lab`, `reduce_homework`,
    `move_homework`
-   *Assignment:* `move_assignment`, `update_assignment`, `extend_assignment`
-   *Exam:* `move_exam`, `cancel_exam`

A **scenario** is an adjustment list plus its simulated result. Generated
scenarios (`origin: "generated"`) and user-authored ones (`origin: "user"`)
share a table and an output contract because they share the engine —
`simulateScenario()` in
[education/simulate.ts](backend/src/services/education/simulate.ts).

Cancelled lecture and lab hours are redistributed into later weeks, at most 3h
per iteration, choosing the week with the smallest stress increase. Every
placement is recorded as a `RedistributionFlow`.

**Two model versions coexist.** Cases created before v1.0 carry
`stress_model.version = "legacy-0"`, still render through the original
`StressCalculator`, and are never recomputed. Their numbers came from a
different formula family with a different range and are not comparable with
v1.0 numbers.

**A property of v1.0 worth knowing:** the schedule-only model saturates around
60.4, so the warning (75) and critical (85) thresholds cannot be reached. They
are implemented and reported exactly as specified, but the scenario search runs
on the primary objective (minimise peak stress) instead — a threshold-driven
search would be a no-op on every course. See
[design.md §3.1](specifications/education_stress/design.md).

### 5. What-If Analysis

The core concept: compare multiple scenarios to see which configuration works best.

### 6. Yard Simulations, Runs, and Proposals (logistics domain)

Parallel to the education concepts but for truck yards.

-   **Yard simulation set** (`yard_simulations` table). One row per case
    that groups N simulator runs over the same physical yard. Carries
    the yard graph (`yard_structure`) and process recipes when all runs
    share their topology; otherwise each run stores its own copy. The
    UI's `/yard/:caseId` route renders this.
-   **Yard run** (`yard_runs` table). One simulator output. Stores raw
    `Orders` + `Measurements` JSON plus a pre-computed
    `summary_metrics` digest (orders completed, waiting / driving
    stats, throughput, top-5 bottlenecks). Comes either via JSON drop
    (POST /api/simulations/yard/) or — when partners ship their API —
    via webhook (POST /:caseId/runs).
-   **Bottleneck**. An entity where `max_concurrent > max_occupancy`
    (queue_score > 1.0). The special synthetic name
    `(off-yard waiting)` with type `ExternalWait` captures trucks that
    queued *outside* the yard because no CheckIn terminal was free —
    surfaces gate congestion separately from intra-yard saturation.
-   **Proposal** (`yard_proposals` table). An AI- or human-authored
    improvement against a run. `changes[]` is a discriminated union of
    `capacity` / `stagger_orders` / `reroute` / `add_entity`. Validated
    server-side against the yard's entity catalogue on save. A future
    `POST /:caseId/proposals/:id/run` will forward the proposal to the
    simulator for a what-if run (route defined, returns 503 until
    partners are ready — see
    [specifications/yard_logistics/design.md §14](specifications/yard_logistics/design.md)).

---

## Coding Guidelines

### General Principles

1. **Use Bun, not Node.js**

    ```bash
    # ❌ Wrong
    npm install
    node server.js

    # ✅ Correct
    bun install
    bun run server.ts
    ```

2. **TypeScript Everywhere**

    - All files should be `.ts` or `.tsx`
    - Avoid `any` type - use proper types
    - Use type inference where possible

3. **Functional Components**

    ```tsx
    // ✅ Correct
    export default function MyComponent({ prop }: Props) {
        return <div>{prop}</div>;
    }

    // ❌ Avoid
    export default class MyComponent extends React.Component {
        render() {
            return <div>{this.props.prop}</div>;
        }
    }
    ```

4. **Async/Await over Promises**

    ```typescript
    // ✅ Correct
    async function fetchData() {
        const result = await api.get("/data");
        return result;
    }

    // ❌ Avoid
    function fetchData() {
        return api.get("/data").then((result) => result);
    }
    ```

### Backend Guidelines

#### Route Handlers (Elysia)

```typescript
// ✅ Correct pattern
export const myRoutes = new Elysia({ prefix: "/my-resource" }).post(
    "/",
    async ({ body }) => {
        // Validate input
        const data = validateInput(body);

        // Business logic
        const result = await service.process(data);

        // Return response
        return new Response(JSON.stringify(result), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    },
    {
        body: MyInputSchema,
        detail: {
            summary: "Create resource",
            tags: ["MyResource"]
        }
    }
);
```

#### Database Queries (Drizzle)

```typescript
// ✅ Correct - Use Drizzle query builder
const simulations = await db.query.simulation_sets.findMany({
    where: eq(simulation_sets.case_id, caseId),
    with: {
        scenarios: {
            with: {
                assignments: true,
                stress_metrics: true
            }
        }
    }
});

// ❌ Avoid raw SQL unless necessary
const result = await db.execute(
    sql`SELECT * FROM simulation_sets WHERE case_id = ${caseId}`
);
```

#### Error Handling

```typescript
// ✅ Correct
try {
    const result = await riskyOperation();
    return result;
} catch (error) {
    logger.error("Operation failed", { error, context });
    return new Response("Error message", { status: 500 });
}
```

### Frontend Guidelines

#### Component Structure

```tsx
// ✅ Correct structure
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Props {
    title: string;
    onSubmit: (data: FormData) => void;
}

export default function MyComponent({ title, onSubmit }: Props) {
    const [state, setState] = useState<StateType>(initialState);

    useEffect(() => {
        // Side effects
    }, [dependencies]);

    const handleClick = () => {
        // Event handler
    };

    return (
        <div>
            <h1>{title}</h1>
            <Button onClick={handleClick}>Click Me</Button>
        </div>
    );
}
```

#### API Calls

```typescript
// ✅ Correct - Create service functions
// src/services/simulationService.ts
export async function getSimulationSet(caseId: string) {
    const response = await fetch(`/api/simulations/${caseId}`);
    if (!response.ok) {
        throw new Error("Failed to fetch simulation");
    }
    return response.json();
}

// Use in component
const data = await getSimulationSet(caseId);
```

#### Styling

```tsx
// ✅ Correct - Use Tailwind classes
<div className="flex flex-col items-center p-6 space-y-4">
  <h1 className="text-2xl font-bold text-primary">Title</h1>
</div>

// ❌ Avoid inline styles
<div style={{ display: 'flex', padding: '24px' }}>
  <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Title</h1>
</div>
```

---

## Common Patterns

### Pattern 1: CRUD Operations

#### Backend

```typescript
// routes/resourceRoutes.ts
export const resourceRoutes = new Elysia({ prefix: "/resources" })
    .post("/", async ({ body }) => {
        const result = await db.insert(resources).values(body).returning();
        return result[0];
    })
    .get("/:id", async ({ params }) => {
        const result = await db.query.resources.findFirst({
            where: eq(resources.id, params.id)
        });
        if (!result) {
            return new Response("Not found", { status: 404 });
        }
        return result;
    })
    .patch("/:id", async ({ params, body }) => {
        const result = await db
            .update(resources)
            .set(body)
            .where(eq(resources.id, params.id))
            .returning();
        return result[0];
    })
    .delete("/:id", async ({ params }) => {
        await db.delete(resources).where(eq(resources.id, params.id));
        return new Response(null, { status: 204 });
    });
```

#### Frontend

```typescript
// services/resourceService.ts
export const resourceService = {
    async create(data: CreateResourceInput) {
        const response = await fetch("/api/resources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async get(id: string) {
        const response = await fetch(`/api/resources/${id}`);
        return response.json();
    },

    async update(id: string, data: UpdateResourceInput) {
        const response = await fetch(`/api/resources/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async delete(id: string) {
        await fetch(`/api/resources/${id}`, { method: "DELETE" });
    }
};
```

### Pattern 2: Form Handling

```tsx
// components/MyForm.tsx
export default function MyForm({ onSubmit }: Props) {
    const [formData, setFormData] = useState<FormData>(initialData);
    const [errors, setErrors] = useState<FormErrors>({});

    const handleChange = (field: keyof FormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const validationErrors = validate(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        // Submit
        try {
            await onSubmit(formData);
        } catch (error) {
            setErrors({ _form: "Submission failed" });
        }
    };

    return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}
```

### Pattern 3: Data Fetching with Loading States

```tsx
export default function DataDisplayPage() {
    const [data, setData] = useState<Data | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);
                const result = await api.getData();
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, []);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorDisplay error={error} />;
    if (!data) return <EmptyState />;

    return <DataDisplay data={data} />;
}
```

---

## Testing

### Backend Tests (Bun Test)

```typescript
// backend/src/services/stressCalculation.test.ts
import { describe, test, expect } from "bun:test";
import { StressCalculator } from "./stressCalculation";

describe("StressCalculator", () => {
    const calculator = new StressCalculator();

    test("calculates workload stress correctly", () => {
        expect(calculator.calculateWorkloadStress(5)).toBe(20);
        expect(calculator.calculateWorkloadStress(10)).toBe(50);
        expect(calculator.calculateWorkloadStress(15)).toBe(75);
    });

    test("applies difficulty multiplier", () => {
        const result = calculator.calculateDifficultyMultiplier(5, false);
        expect(result).toBeCloseTo(1.92);
    });
});
```

Run tests:

```bash
cd backend
bun test                  # full suite — unit + integration (275 tests as of now)
bun test --coverage
bun run test:unit         # services/* unit tests only — no network
bun run test:integration  # HTTP integration only; needs the dev stack up
```

The **parity suite** (`backend/src/services/education/parity.test.ts`) runs the
eighteen fixtures in
[specifications/education_stress/parity/](specifications/education_stress/parity/)
and compares every intermediate component at 1e-6. These are the files the main
AI4Work education application should also run — read
[parity/README.md](specifications/education_stress/parity/README.md) before
treating parity as established.

The **integration suite** (`backend/src/tests/integration/`) hits the running
backend at `https://backend.localhost` and covers the education and yard
APIs end-to-end. Each suite probes `/api/health` first and
`describe.skipIf(!reachable)`'s itself if the stack is down — so
`bun test` stays green either way. The request bodies live in
[specifications/examples/](specifications/examples/), shared with the
human-readable docs there.

### Frontend Tests (Vitest)

```typescript
// ui/src/components/MyComponent.test.tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import MyComponent from "./MyComponent";

test("renders title", () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
});
```

Run tests:

```bash
cd ui
bun test
```

---

## Deployment

### Production Build

#### Backend

```bash
cd backend
bun install --production
bun build src/index.ts --outdir dist
```

#### Frontend

```bash
cd ui
bun install --production
bun run build     # tsc -b && vite build — must stay clean
# Output in dist/ folder
```

`bun run build` typechecks the whole UI before bundling, so it is the real
gate on frontend type errors — `bun dev` does not typecheck. Keep it green.

### Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Useful Commands

### Bun Commands

```bash
bun install                    # Install dependencies
bun add <package>             # Add dependency
bun add -d <package>          # Add dev dependency
bun remove <package>          # Remove dependency
bun run <script>              # Run package.json script
bun test                      # Run tests
bun run --watch src/index.ts  # Run with hot reload
```

### Database Commands

> The `drizzle-kit` CLI tooling (`drizzle.config.ts`, `db:push`,
> `db:generate`, `db:studio`, `migrate-and-start.sh`, the `backend/drizzle/`
> migrations folder, and the `drizzle-kit` package dependency) was removed
> as part of the yard-logistics work — it had been broken for a long time
> and nothing depended on it. Schema is managed via plain SQL files. The
> `drizzle-orm` runtime queries in route handlers are unaffected.

```bash
# Open a psql shell against the running database
docker-compose exec postgres psql -U whatifuser -d whatifdatabase

# Apply an idempotent migration to an existing database
docker-compose exec -T postgres psql -U whatifuser -d whatifdatabase \
    < db/<name>_migration.sql

# Reset to a fresh database (destroys data, re-runs db/schema.sql + db/seed.sql)
docker-compose down
rm -rf postgres_whatif_data/
docker-compose up -d
```

### Database schema workflow

The schema lives in **two synced places**:

1. **`db/schema.sql`** — canonical SQL. Postgres runs this once on first
   startup (via `docker-entrypoint-initdb.d`) for a fresh database.
2. **`backend/src/db/schema.ts`** — Drizzle table/column definitions used at
   *runtime* by `db.query.*` (relations, types). Not used to migrate.

When adding a new table or column:

1. Edit **both** files. Keep names/types/constraints aligned.
2. For an **existing database**, write a small idempotent migration in
   `db/<name>_migration.sql` (use `CREATE TABLE IF NOT EXISTS`, `DO $$
   BEGIN ... IF NOT EXISTS ... END $$` for triggers, etc.) and apply it via
   the psql command above. See `db/yard_logistics_migration.sql` for a
   working example, and `db/education_stress_v1_migration.sql` for the
   education stress v1.0 columns.
3. For a **fresh database**, no migration is needed — `db/schema.sql` will
   be picked up automatically on first boot.

Auto-migrate via `drizzle-kit` is intentionally not wired in. If we want
it back later, the work is: re-add `drizzle-kit` as a dev dependency,
create a fresh `backend/drizzle.config.ts` in the modern format
(`dialect: "postgresql"`, `dbCredentials: { url: process.env.DATABASE_URL }`),
add scripts `db:generate` / `db:push` (no `:pg` suffix, no `--config`
flag), and decide whether `db/schema.sql` becomes generated output or
stays the canonical source. Until then: edit both files by hand and
ship a small `db/<name>_migration.sql` for existing databases.

### Docker Commands

```bash
docker-compose up             # Start all services
docker-compose up -d          # Start in background
docker-compose down           # Stop all services
docker-compose logs -f backend # Follow backend logs
docker-compose ps             # List running services
docker-compose restart backend # Restart backend service
```

### Git Workflow

```bash
git checkout -b feature/my-feature
git add .
git commit -m "feat: description"
git push origin feature/my-feature
# Create pull request
```

---

## Troubleshooting

### Common Issues

#### "bun: command not found"

-   **Solution:** Install Bun: `curl -fsSL https://bun.sh/install | bash`

#### Database connection errors

-   **Check:** Is PostgreSQL running?
-   **Check:** Are credentials correct in `.env`?
-   **Solution:** Restart database or update `DATABASE_URL`

#### Port already in use

-   **Solution:** Kill process on port:
    ```bash
    # Find process
    lsof -i :8000
    # Kill process
    kill -9 <PID>
    ```

#### Module not found errors

-   **Solution:** Run `bun install` in the correct directory

#### "Cannot find module @rollup/rollup-linux-arm64-gnu" (or similar) in Docker

This means the container is resolving the **host's** `node_modules`. The host
tree is built for macOS; rollup (via Vite) ships a platform-specific native
binary, so the Linux container cannot load it.

Two things together prevent it:

1. Both images install dependencies **one directory above** the app, so the
   compose bind mount cannot shadow them:

    ```
    /usr/src/node_modules      <- installed by the Dockerfile, correct platform
    /usr/src/app               <- bind-mounted from the host by docker-compose
    /usr/src/app/node_modules  <- tmpfs, always empty, masks the host tree
    ```

2. Both compose files mask `/usr/src/app/node_modules` with a **tmpfs**, not an
   anonymous volume.

The tmpfs is the part worth understanding. An anonymous volume looks like the
obvious choice and is what this project used before, but Docker seeds such a
volume from whatever is already at the mount point — and since the bind mount
is applied first, that means it seeds from the host's macOS `node_modules`,
which is precisely what the mask is supposed to hide. Creating an empty
directory at that path in the image does not change the seeding. A tmpfs is
always empty, so resolution falls through to `/usr/src/node_modules` every
time. Verify with:

```bash
docker-compose exec ui sh -c 'ls -A /usr/src/app/node_modules | wc -l'   # 0, or 2 once Vite writes its cache
docker-compose exec ui bun -e 'console.log(require.resolve("vite"))'      # /usr/src/node_modules/vite/...
```

Vite writes its dependency cache into the tmpfs (`.vite`, `.vite-temp`), so it
is re-optimised on container restart. That takes about a second and avoids a
stale cache surviving a dependency change.

-   **After changing dependencies:** rebuild the image
    (`./build_docker_images.sh`) so `/usr/src/node_modules` picks up the change.
    A `bun install` on the host alone will not reach the container.

#### Schema is out of date / "relation does not exist" on a non-fresh DB

-   **Solution:** Write or apply an idempotent SQL migration. See the
    "Database schema workflow" section above for the pattern.

---

## Additional Resources

### Documentation Links

-   [Bun](https://bun.sh/docs)
-   [Elysia](https://elysiajs.com/introduction.html)
-   [Drizzle ORM](https://orm.drizzle.team/)
-   [React](https://react.dev/)
-   [Vite](https://vite.dev/)
-   [Tailwind CSS](https://tailwindcss.com/)
-   [Recharts](https://recharts.org/)
-   [Radix UI](https://www.radix-ui.com/)
-   [shadcn/ui](https://ui.shadcn.com/)

### Project-Specific Docs

-   `specifications/education_stress/` - The shared `course_stress_prediction`
    model: the original [request](specifications/education_stress/request.md),
    the [design and findings](specifications/education_stress/design.md), the
    [API contract](specifications/education_stress/specification.yml), and the
    [parity fixtures](specifications/education_stress/parity/)
-   `specifications/specification.yml` - Pre-v1.0 API specification
-   `specifications/yard_logistics/` - Yard logistics design and contract
-   `worklog/stress_updates_log.md` - Implementation log

---

## Contributing

### Code Review Checklist

-   [ ] Code follows TypeScript best practices
-   [ ] Uses Bun (not npm/node)
-   [ ] Proper error handling
-   [ ] Tests added/updated
-   [ ] Types are properly defined
-   [ ] No `any` types (unless absolutely necessary)
-   [ ] Logging added for important operations
-   [ ] Documentation updated

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Examples:**

-   `feat(backend): add stress calculation service`
-   `fix(ui): correct chart rendering issue`
-   `docs: update CLAUDE.md with new patterns`

---

**Last Updated:** 2026-08-24
**Maintainer:** AI4Work Team
**Claude Assistant:** Ready to help with this project!
