# Yard Logistics What-If — Design Document

**Status:** Draft
**Owner:** AI4Work team
**Last updated:** 2026-05-05

> Companion files in this folder:
> - [specification.yml](specification.yml) — OpenAPI 3.1 contract for every
>   `/api/simulations/yard/*` endpoint, including the proposal flow.
> - [_GeneralInfo/typeScheme_ExportData.json](_GeneralInfo/typeScheme_ExportData.json) —
>   the simulator partner's own native description of `SimulationExportData`.
> - [Results/](Results/) — three reference simulator runs used for tests,
>   the seeded sample, and prompt grounding.

---

## 1. Goal

Add a second analysis domain to the What-If Tool: **yard logistics**. Instructors of the educational version pick between course-stress scenarios; logistics planners pick between yard configurations / order schedules and see where trucks queue, how throughput differs, and what drove the bottleneck.

The external simulator (separate service, owned by partners) emits the same `SimulationExportData` JSON described in [_GeneralInfo/typeScheme_ExportData.json](_GeneralInfo/typeScheme_ExportData.json). For this iteration we ingest those JSON drops over a single POST endpoint. When the partners' simulator-API arrives, the same endpoint is the receiver — no model changes.

**Non-goals.** Running the simulator ourselves. Editing the yard graph in the UI. Optimising orders automatically (we display, we do not yet generate alternatives).

---

## 2. Scope of this iteration

In:
- DB tables, ingest endpoint, read endpoints, UI page, derived metrics, AI explanation hookup.
- Bulk-import script for the three sample runs in [Results/](Results/).

Out (later phases):
- Auto-generated "what-if" runs (the analogue of `optimizationEngine.ts`). For now, runs come from the external simulator only.
- Editing entities/streets/orders.
- Live push from the simulator (we will add a webhook later, but the ingest contract is already designed for it).

---

## 3. Domain model

The simulator's payload (see [typeScheme_ExportData.json](_GeneralInfo/typeScheme_ExportData.json)) gives us five blocks:

1. **ComparisonInformation** — three SHA-256 hashes (`YardStructure`, `Processes`, `Orders`). Same hash ⇒ identical input. We use these to detect "what changed between two runs?" without diffing JSON.
2. **YardStructure** — a directed graph: `Entities = { Crossings, ParkingAreas, Scales, Storages, Terminals }` plus `Streets`. Each entity carries `Costs_Seconds`, `MaxOccupancy`, type-specific fields (storage `Capacity/Stock/MaterialId`, terminal `Typ ∈ {CheckIn, CheckOut, Waagenterminal, Schrankenterminal}`, etc.).
3. **Processes** — recipes a truck order follows. Ordered list of `Tasks`, each task pinned to either a specific entity (e.g. silo `SL729`) or any entity that provides the action (`*`).
4. **Orders** — `(offsetMinutes, licensePlate, action ∈ {Loading, Unloading}, quantityKg, material)`.
5. **Measurements** — per-truck timeline (`TimeEntries[]`: `Location, Action, Start, End, Duration`) plus a summary `(WaitingTime, DrivingTime, OrderState ∈ {Unhandled, Incomplete, Completed})` and a global summary `(OrdersOverall/Unhandled/Incomplete/Completed)`.

Our analytics layer derives, from (4)+(5):

- **Per-run KPIs:** total/avg/max waiting, total/avg/max driving, completion rate, throughput per hour.
- **Per-entity occupancy:** for each timestamp t, how many trucks have a `TimeEntries` row covering t with `Location = entity`. This is what surfaces P010 / B010 / silo bottlenecks.
- **Per-entity wait attribution:** sum of `Duration` where the entry's `Action ∈ {Waiting}` (or `Action == "Driving"` but adjacent to a target entity — to be confirmed against more samples).
- **Bottleneck score:** `max_queue_at_entity / MaxOccupancy_of_entity` over the run.

The three sample runs already validate the model: `Smooth` (30 orders, 0 s wait), `SequencedOk` (52 orders, 51 min total wait, max 6 min), `WaitingProblem` (71 orders, 13 h total wait, max 3.6 h).

---

## 4. Data layer

### 4.1 New tables — kept separate from `educational_simulations`

Naming mirrors the education side so the codebase reads consistently, but tables and route prefixes never overlap.

| Education side | Yard side |
|---|---|
| `educational_simulations` (parent) | `yard_simulations` (parent) |
| `adjustment_scenarios` (children) | `yard_runs` (children) |
| `/api/simulations/education/` | `/api/simulations/yard/` |
| `case_id` (UUID) | `case_id` (UUID) — same convention |

Add to [db/schema.sql](../../db/schema.sql) and [backend/src/db/schema.ts](../../backend/src/db/schema.ts):

```sql
-- Parent: a comparison set / study (groups several runs)
CREATE TABLE yard_simulations (
    case_id           TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    description       TEXT,

    -- The yard graph + processes are usually shared across runs in a set.
    -- Stored once at the parent level when all runs share the same hash;
    -- otherwise NULL and each run carries its own copy.
    yard_structure    JSONB,
    processes         JSONB,
    yard_hash         TEXT,
    processes_hash    TEXT,

    -- For UI/AI display
    yard_image_path   TEXT,                 -- optional path to PNG (Yard_AI4Work.png)

    -- User-level selection (which run is "the chosen one")
    selected_run_id   TEXT,
    selected_at       TIMESTAMP,

    metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at        TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at        TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Child: one simulator run / scenario
CREATE TABLE yard_runs (
    id                SERIAL PRIMARY KEY,
    case_id           TEXT NOT NULL REFERENCES yard_simulations(case_id) ON DELETE CASCADE,
    run_id            TEXT NOT NULL,         -- e.g. "01_smooth", "02_sequenced_ok", uploader-supplied
    label             TEXT NOT NULL,         -- human label, e.g. "Smooth"
    description       TEXT,

    -- Raw payload pieces from SimulationExportData
    orders            JSONB NOT NULL,        -- input order list
    measurements      JSONB NOT NULL,        -- ExportMeasurement (Summary + Measurements[])
    yard_structure    JSONB,                 -- only set if it differs from parent
    processes         JSONB,                 -- only set if it differs from parent

    -- Comparison hashes from the simulator
    yard_hash         TEXT,
    processes_hash    TEXT,
    orders_hash       TEXT,

    -- Derived metrics, computed once at ingest time, reused on read
    summary_metrics   JSONB NOT NULL,        -- see §4.2

    simulated_at      TIMESTAMP,             -- timestamp from filename or payload
    created_at        TIMESTAMP DEFAULT NOW() NOT NULL,

    CONSTRAINT yard_run_unique UNIQUE(case_id, run_id)
);

CREATE INDEX idx_yard_runs_case ON yard_runs(case_id);
CREATE INDEX idx_yard_simulations_name ON yard_simulations(name);

CREATE TRIGGER update_yard_simulations_updated_at
    BEFORE UPDATE ON yard_simulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Why the parent-level yard fields.** All three sample runs in `Results/` share the same `YardStructure` hash and `Processes` hash (we should verify this on ingest). Storing them once on the parent halves the storage and makes "compare yard configs" trivial. If a run's hash differs we copy that run's structure into the run row.

### 4.2 `summary_metrics` shape

Computed at ingest from `measurements.Summary` + per-order `TimeEntries`:

```jsonc
{
  "orders": { "overall": 71, "completed": 71, "incomplete": 0, "unhandled": 0 },
  "waiting_seconds":   { "total": 47420, "avg": 667.9, "max": 12988, "p95": 3120 },
  "driving_seconds":   { "total": 21049, "avg": 296.5, "max": 597,   "p95": 380 },
  "throughput": { "orders_per_hour": 9.4, "first_order_min": 0, "last_completion_min": 451 },
  "bottlenecks": [
    { "entity": "B010",  "type": "Terminal",     "max_concurrent": 3, "max_occupancy": 1, "queue_score": 3.0 },
    { "entity": "SL729", "type": "Storage",      "max_concurrent": 2, "max_occupancy": 1, "queue_score": 2.0 },
    { "entity": "P010",  "type": "ParkingArea",  "max_concurrent": 8, "max_occupancy": 12, "queue_score": 0.67 }
  ]
}
```

Top 5 bottlenecks is enough — the full per-entity series is computable on demand from `measurements`.

---

## 5. Type definitions

New file [backend/src/types/yard.ts](../../backend/src/types/yard.ts) — mirrors the simulator schema names exactly so future API integration stays trivial. Re-uses `EOrderActionType`, `E_OrderState`, `E_EntityAction`, `TerminalTyp` enums verbatim.

Top-level:

```ts
export interface YardSimulationExport {
  ComparisonInformation: { YardStructure: string; Processes: string; Orders: string };
  YardStructure: YardDesignData;
  Processes: Process[];
  Orders: Order[];
  Measurements: ExportMeasurement;
}
```

The shapes of `YardDesignData`, `Process`, `Order`, `ExportMeasurement`, `OrderMeasurement`, `OrderMeasurementSummary` are 1:1 with [typeScheme_ExportData.json](_GeneralInfo/typeScheme_ExportData.json) — generate them, do not redesign them.

---

## 6. Services

### 6.1 `yardIngestService.ts`

Single responsibility: take a `YardSimulationExport` plus a `(case_id, run_id, label)` triple and persist it. Validates hashes, decides whether yard/processes go on parent or run, computes `summary_metrics`, inserts inside a transaction.

### 6.2 `yardAnalyticsService.ts`

Pure functions over a `YardSimulationExport`:

- `summarizeRun(export) → SummaryMetrics`
- `entityOccupancyTimeline(export, entityName) → Array<{ t: number; count: number }>`
- `truckGantt(export, licensePlate) → Array<{ start, end, action, location }>` (just a typed view of `TimeEntries`)
- `bottlenecks(export, topN = 5) → BottleneckEntry[]`

No DB access here — keeps it unit-testable, mirrors how [stressCalculation.ts](../../backend/src/services/stressCalculation.ts) is split from route code.

### 6.3 No optimiser yet

`optimizationEngine.ts` for education has no peer on the yard side in this iteration. Runs come from outside.

---

## 7. API

Prefix: `/api/simulations/yard/`. Mirrors the education shape so the UI service layer stays symmetric. **Full OpenAPI contract:** [specification.yml](specification.yml).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/` | Create a new yard simulation set. Body: `{ name, description, runs: [{ run_id, label, export: SimulationExportData }] }`. Returns `{ caseId, resultsUrl }`. |
| `POST` | `/:caseId/runs` | Add another run to an existing set. Body: `{ run_id, label, export }`. Used by the simulator-webhook later. |
| `GET`  | `/:caseId` | Full set: parent metadata + every run's `summary_metrics` + bottleneck top-5. Powers the comparison view. |
| `GET`  | `/:caseId/:runId` | One run, full payload (orders, measurements, derived metrics). Powers the per-scenario detail page. |
| `GET`  | `/:caseId/:runId/timeline?entity=B010` | On-demand per-entity occupancy timeline (computed, not stored). |
| `PUT`  | `/:caseId/select` | Set preferred run. Body: `{ runId }`. |
| `GET`  | `/:caseId/selection` | Read current selection. |
| `GET`  | `/:caseId/proposals` | List all improvement proposals (AI- or human-authored). |
| `POST` | `/:caseId/proposals` | Save a new proposal; server validates changes against the case's yard. |
| `DELETE` | `/:caseId/proposals/:id` | Remove a proposal. |
| `POST` | `/:caseId/proposals/:id/run` | **Stub** — forward the proposal to the simulator for a what-if run (returns 503 until partners wire up their API). Contract defined; see §14 for the partner-side shape we expect. |

The first two endpoints accept the simulator's native JSON unchanged — drop a `*.complete.json` straight in.

**Future webhook.** When the simulator pushes results live, the partners can POST to `/api/simulations/yard/:caseId/runs` with the same body. No new endpoint needed.

---

## 8. Frontend

### 8.1 Routing & navigation

- New route `/yard/:caseId` → `YardSimulationPage.tsx` (mirrors `/education/:caseId` → `EducationalStressPage.tsx`).
- [MainPage.tsx](../../ui/src/pages/MainPage.tsx) gets a third button: **Load Yard Simulation**. Either jumps to a known sample case (analogous to the green `10001` button) or opens an upload picker — TBD with the user.

### 8.2 Page structure (mirror education)

```
YardSimulationPage
├── Header: case name, description, created_at
├── YardOverviewCard:        yard image + entity counts (storages/terminals/scales/parkings)
├── AIExplanationBox          (re-use existing component)
├── Tabs
│   ├── "Comparison"        → YardComparisonView (table + summary chart across runs)
│   ├── "<Run 1 label>"     → YardRunDetail (Gantt, occupancy, bottlenecks, raw KPIs)
│   ├── "<Run 2 label>"     → ...
│   └── ...
└── FloatingYardChat        (Ollama integration, scoped to active run)
```

### 8.3 New components ([ui/src/components/yard/](../../ui/src/components/))

- `YardMap.tsx` — first cut: just `<img src={yardImagePath} />`. Later: SVG rendered from `YardStructure` so we can highlight bottleneck entities.
- `RunSummaryCard.tsx` — orders done/incomplete/unhandled, max-wait, throughput.
- `RunComparisonTable.tsx` — one row per run, KPI columns, sortable.
- `OccupancyTimelineChart.tsx` — Recharts area chart, x = minutes, y = trucks at entity, threshold line at `MaxOccupancy`.
- `TruckGanttChart.tsx` — horizontal bands per `TimeEntries` row, colour-coded by action.
- `BottlenecksList.tsx` — top-5 entities with their `queue_score`.

Reuse: `Tabs`, `Card`, `Skeleton`, `Alert` from `ui/components/ui/`. Reuse `AIExplanationBox` directly. The floating chat copies `FloatingStressChat` and swaps the prompt template.

### 8.4 Service layer

New file [ui/src/services/yardSimulationService.ts](../../ui/src/services/) — same shape as `educationalStressService.ts`. New file [ui/src/types/yard.ts](../../ui/src/types/) generated from the same simulator schema as the backend types.

---

## 9. Bulk-import of the sample runs

A small Bun script `backend/scripts/seedYardSamples.ts` reads the three `*.complete.json` files in [Results/](Results/) and POSTs them to `/api/simulations/yard/`. Triggered manually (`bun run seed:yard`) — not part of automatic DB seeding. Keeps `db/seed.sql` small and avoids embedding ~900 KB of JSON in SQL.

The case it creates: `name = "Yard AI4Work — sample comparison"`, three runs labelled `Smooth`, `SequencedOk`, `WaitingProblem`.

---

## 10. AI explanation

The Ollama prompt template gets a yard variant. Inputs the model receives:

- Case description.
- Per-run summary table (the same we render in `RunComparisonTable`).
- Top-5 bottleneck entities per run.
- The `ComparisonInformation` deltas: which of `{YardStructure, Processes, Orders}` actually changed between two runs.

The hashes make the prompt cheap and precise: if only `Orders` differs, the model is told so explicitly and doesn't need to diff the yard.

---

## 11. Implementation phases

1. **Schema + types.** Add tables, generate Drizzle schema, write `types/yard.ts`.
2. **Ingest + analytics.** `yardIngestService` + `yardAnalyticsService` with unit tests against the three sample files.
3. **Read API.** `GET /:caseId`, `GET /:caseId/:runId`, `GET /:caseId/:runId/timeline`.
4. **Bulk-import script** for the samples; manual smoke-test through Swagger.
5. **UI page** — comparison tab + per-run tab with Gantt, occupancy, bottlenecks. Wire `MainPage` button.
6. **Selection endpoints + UI** (`PUT /select`, `GET /selection`).
7. **AI explanation + floating chat** for yard runs.
8. **(later)** Webhook auth on `POST /:caseId/runs` for the live simulator.
9. **(later)** Render the yard as SVG from `YardStructure` so we can colour the bottleneck.

Phases 1-5 are the MVP. Each phase ships independently.

---

## 12. Open questions

- **Sample-file timestamp meaning.** Filenames embed `20260429-...` — confirm with partners whether that is "wall clock when sim ran" or "scenario reference time". We store it as `simulated_at` either way.
- **Waiting attribution.** The `TimeEntries` array we have shows `Action ∈ {CheckIn, Driving, Parking, Authenticate, Loading, Weighing, CheckOut}`. We did **not** see an explicit `Waiting` action in the smooth sample — yet the summary reports `WaitingTime`. Need one of: (a) confirmation that "waiting at entity X" is encoded as a `Driving` row that ends adjacent to X, or (b) a sample with non-zero waiting where we can read off the convention. Until clarified, use `OrderMeasurementSummary.WaitingTime` directly and show "per-entity wait" only when we are confident.
- **Concurrent same-yard sets.** Are partners going to send multiple yards in one upload, or always one yard per case? Current schema assumes "one yard per case, many runs". If they want "many yards", we move yard fields entirely to `yard_runs` and drop them from the parent.
- **Sample-button vs upload UX.** Like the existing green "Load Stress Simulation" button (case `10001`), do we want a hard-coded sample button on `MainPage`, an upload form, or both? Default proposal: hard-code the seeded sample's `caseId` for now, defer upload UI until partners are sending runs to us.

---

## 13. File map (where things go when built)

```
backend/
  src/
    db/schema.ts                       (+ yard_simulations, yard_runs)
    types/yard.ts                      (NEW — mirrors simulator schema)
    services/
      yardIngestService.ts             (NEW)
      yardIngestService.test.ts        (NEW)
      yardAnalyticsService.ts          (NEW)
      yardAnalyticsService.test.ts     (NEW)
    routes/
      yardRoutes.ts                    (NEW — /api/simulations/yard/*)
      index.ts                         (+ .use(yardRoutes))
  scripts/
    seedYardSamples.ts                 (NEW)

ui/
  src/
    pages/
      YardSimulationPage.tsx           (NEW)
      MainPage.tsx                     (+ "Load Yard Simulation" button)
    components/yard/
      YardMap.tsx
      RunSummaryCard.tsx
      RunComparisonTable.tsx
      OccupancyTimelineChart.tsx
      TruckGanttChart.tsx
      BottlenecksList.tsx
      FloatingYardChat.tsx
    services/yardSimulationService.ts  (NEW)
    types/yard.ts                      (NEW — mirrors backend)
    App.tsx                            (+ /yard/:caseId route)

db/
  schema.sql                           (+ yard_simulations, yard_runs)
  seed.sql                             (unchanged — yard sample is seeded by bun script, not SQL)

specifications/yard_logistics/
  design.md                            (this doc)
  specification.yml                    (OpenAPI 3.1 — every endpoint + schema)
  _GeneralInfo/                        (untouched, vendor inputs)
  Results/                             (untouched, sample simulator outputs)

instructions/yard_logistics/
  ingest_format.md                     (later — once §12 is resolved)

worklog/yard_logistics/
  yard_logistics_log.md                (per-phase implementation log, like stress_updates_log.md)
```

---

## 14. Proposed simulator-side contract (partner API)

The yard analog of education's `POST /api/simulations/education/` — *give
me an analysis* — has to live on the partner's side, because we don't
run the simulator. This section drafts the contract we'd want them to
expose. **Nothing here is implemented yet; it's a starting point for
the partner conversation.**

### 14.1 What we'd POST to them

Single endpoint owned by the simulator partner, accepting a payload
that's structurally a `SimulationExportData` (per
[_GeneralInfo/typeScheme_ExportData.json](_GeneralInfo/typeScheme_ExportData.json))
minus the `Measurements` block (since measurements are what they're
about to produce):

```
POST {SIMULATOR_BASE}/run
Content-Type: application/json
Idempotency-Key: <our caseId + proposalId, optional>

{
  "callbackUrl": "https://backend.localhost/api/simulations/yard/{caseId}/runs",
  "callbackRunId": "proposal_7",     // becomes yard_runs.run_id when we receive it
  "callbackLabel": "Proposal #7",    // becomes yard_runs.label
  "request": {
    "YardStructure": { ... },        // see Crossing/Storage/... schemas in specification.yml
    "Processes":     [ ... ],
    "Orders":        [ ... ]
    // Measurements deliberately omitted — the simulator produces these.
  }
}
```

The `YardStructure`, `Processes`, and `Orders` arrays come from our
working copy of the case **with the proposal's `changes` applied**:

| `ProposalChange.kind` | Effect on the payload                                                                |
|:-:|---|
| `capacity`        | Mutate the named entity's `MaxOccupancy` / `Capacity` to the new `to` value.            |
| `stagger_orders`  | Mutate `Orders[*].offsetMinutes` according to the proposal's pacing spec.               |
| `reroute`         | Update `Processes` so the task targeting `from_storage` for `material` now targets `to_storage`. |
| `add_entity`      | Append a new entity to `YardStructure.Entities.<kind>` (with a generated `Id`) and, if `connects` is set, append matching `Street` records. |

### 14.2 Expected reply shape

**Synchronous ack (HTTP 202).** The simulator returns immediately:

```jsonc
{ "accepted": true, "simulatorTraceId": "sim-job-12345" }
```

…and runs the simulation in the background. We surface
`simulatorTraceId` on our `ForwardProposalResponse` for cross-system
debugging.

**Asynchronous callback (simulator → us).** When done, the simulator
POSTs to `callbackUrl` (which is our existing `POST
/api/simulations/yard/{caseId}/runs` endpoint) with a regular
`YardRunIngestInput`-shaped body. Its `run_id` must equal the
`callbackRunId` we supplied, so we can match the result to the
proposal that requested it. The push includes full `Measurements` and
preserves `ComparisonInformation` hashes so we can spot whether the
input matched what we sent.

### 14.3 Failure modes worth defining

- **Reject on validation:** simulator returns `400` if it can't parse
  the `YardStructure` (e.g. an `add_entity` references an unknown
  street ID). We bubble this up as `502` on `POST /proposals/{id}/run`.
- **Reject on resource:** simulator returns `429` if it's at capacity.
  We surface as `503` with a Retry-After hint passed through.
- **Lost callback:** if the callback never arrives, the proposal stays
  in `sent_to_simulator_at != null` with no matching run. A future
  reconciliation job would poll `GET {SIMULATOR_BASE}/run/{traceId}` to
  recover state; out of scope for the first iteration.

### 14.4 Auth and transport

To be agreed with the partner. Default proposal: **mutual TLS** for
both directions (we already terminate TLS via Traefik at
`backend.localhost`; partners can pin our cert). Bearer-token auth is
the fallback if mTLS is too heavy. The callback URL is supplied per
request so partners don't need DNS-level configuration.

### 14.5 What this isn't

- **Not a generic "run any simulation" API.** We only ever forward
  proposals that we already store; the request is derived from a row
  in `yard_proposals`. If we ever expose ad-hoc simulator access from
  the UI, that's a separate workflow.
- **Not a streaming protocol.** Single ack + single callback. If the
  simulator wants to emit progress events along the way, it can
  optionally POST intermediate measurements to the same callback URL,
  but our default UI doesn't render them.
