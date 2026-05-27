# Yard Logistics — implementation worklog

Mirrors `worklog/stress_updates_log.md` for the education work. Records
what shipped, what's still pending, and the key decisions behind both.

---

## Phase 1 — data layer + ingest + analytics + read API

**Goal:** stand up the yard half of the app on the same Bun + Elysia +
Postgres + Drizzle + React stack as education, ingesting JSON drops from
the partner-owned simulator as a precursor to a future webhook
integration.

### Schema (db + Drizzle)

Three new tables in `db/schema.sql` + matching Drizzle definitions in
`backend/src/db/schema.ts`. Idempotent migrations in
`db/yard_logistics_migration.sql` and `db/yard_proposals_migration.sql`
let existing databases pick up the change without a volume wipe.

| Table | Holds | Notes |
|---|---|---|
| `yard_simulations` | One row per case (parent). Yard graph (`yard_structure`), processes, hashes, image path, `selected_run_id` + `selected_at`, free-form `metadata`. | Yard + processes are stored once at parent level when all runs share topology (see §"topology-aware sharing" below). |
| `yard_runs` | One simulator run. Raw `orders` + `measurements` JSONB. `summary_metrics` digest computed at ingest. Hash columns mirror the simulator's `ComparisonInformation`. | When this run's yard differs topologically from the parent's, run-level overrides kick in. |
| `yard_proposals` | One improvement proposal per row, AI- or human-authored. Discriminated `changes[]` JSONB. `sent_to_simulator_at` reserved for the future forward flow. | `CHECK source IN ('ai', 'manual')`. |

### Topology-aware sharing

The simulator's `ComparisonInformation.YardStructure` hash *also*
includes `Storage.Stock` (per-silo material levels), which drifts
between runs even when the physical yard is identical. Our initial
hash-only parent/run split produced three independent copies of the
yard for three runs over the same layout.

Fix: `backend/src/services/yardCompare.ts` introduces
`yardTopologyEqual()` which strips volatile state (currently `Stock`)
before comparing. `YardIngestService` uses it to decide whether to
share the yard at parent level and whether each run needs a
run-level override.

### Read endpoints + read-layer fallback

`GET /api/simulations/yard/:caseId` returns the parent and every
run's pre-computed `summary_metrics`. When the parent's
`yard_structure` is null (legacy or first-run-was-divergent case)
the response falls back to the first run's copy so the UI can still
render the layout. Idempotent.

### Analytics

`backend/src/services/yardAnalyticsService.ts` is pure logic:
`summarizeRun` (orders / waiting / driving / throughput / top-5
bottlenecks), `bottlenecks` (sweep-line concurrency), `entityOccupancyTimeline`,
`truckGantt`. 21 unit tests against the three real sample runs in
`specifications/yard_logistics/Results/`.

### Seed script

`backend/scripts/seedYardSamples.ts` (run with `bun run seed:yard`) calls
`YardIngestService.createSimulation()` with `{ caseId: "yard-sample-001",
replace: true }` so the MainPage button can link to a stable id. Mounts
`./specifications:/usr/src/specifications:ro` were added to
`docker-compose.yml` so the seed (running inside the backend container)
can read the sample JSON files.

---

## Phase 2 — UI

### Page structure

`/yard/:caseId` → `YardSimulationPage.tsx`. Three top-level tabs:
**Comparison** (cross-run table), **Improvements** (proposals), and one
**per-run tab** per loaded run (`Smooth`, `SequencedOk`,
`WaitingProblem` in the seeded case).

The per-run tabs render:

- `RunSummaryCard` — 5 KPIs at a glance
- `BottlenecksList` — top 5, click to select an entity
- `OccupancyTimelineChart` — Recharts area chart of trucks-at-entity
  over time with a red dashed `max_occupancy` reference line
- `TruckGanttChart` — colour-coded action bands per truck. Hover any
  row to see a floating tooltip with the per-action time breakdown +
  composition bar.

`FloatingYardChat.tsx` mirrors education's `FloatingStressChat` for
ad-hoc Q&A with the Ollama-backed LLM. Context includes the case
overview, per-run KPIs, top bottlenecks, and (when a discussion is
active) the full proposal under review.

### `(off-yard waiting)` synthetic bottleneck

The simulator emits `Action: "Waiting", Location: ""` for trucks
queued *outside* the yard pending a free CheckIn terminal. The
initial analytics surfaced these as an unhelpful `""`/`Unknown` row.
Renamed to `(off-yard waiting)` with type `ExternalWait`, given a
violet hourglass treatment in `BottlenecksList`, and explicitly
handled in `entityOccupancyTimeline` so the chart plots gate-queue
depth over time when selected. The proposal validator rejects
capacity changes against the synthetic name and tells the user the
real fix is CheckIn capacity or order pacing.

### Drizzle-kit cleanup

The repo's drizzle-kit CLI surface (drizzle.config.ts, db:push,
db:generate, db:studio, the dead migrate-and-start.sh) was broken
for a long time — driver `"pg"` vs the modern `"postgresql"`
dialect, and the container command was `bun dev` directly, not
`dev:migrate`. Removed:

- `backend/drizzle.config.ts`
- `backend/scripts/migrate-and-start.sh`
- `backend/drizzle/` (two stale Nov 2025 migrations)
- `db:push`, `db:generate`, `db:studio`, `dev:migrate` from
  `backend/package.json`
- `drizzle-kit` package dependency

`drizzle-orm` runtime queries are unaffected. Schema management is
now exclusively via `db/schema.sql` (first-boot) and idempotent
`db/<name>_migration.sql` files (existing databases). Documented
in CLAUDE.md and QUICK_START.md.

---

## Phase 3 — AI features

### Proposal generation

`YardImprovementsTab.tsx` + `GenerateProposalsPanel.tsx`. Targets the
worst-performing run by default. UI-driven LLM call via the existing
`useOllama` hook; output parsed by a tolerant brace-walking JSON
extractor in `yardProposalPrompt.ts` that handles `<think>...</think>`
blocks, ```json fences, single-quote drift, and one-bad-proposal-out-of-N
without killing the whole batch.

`num_predict: 2048` cap keeps even pathological reasoning models from
running for the full proxy timeout. Tip in the panel header points
users at non-reasoning models (phi4, gpt-oss) for this task.

### Local-storage drafts

`useProposalDrafts` mirrors generated-but-unsaved drafts to
`localStorage` under `yard-proposals-drafts:<caseId>`. Drafts survive
accidental refresh / tab switch; they clear on Save (which persists
to DB) or Discard. The manual entry form autosaves its in-progress
fields to `yard-proposal-manual-form:<caseId>` for the same reason.

### Discuss-a-proposal

Each saved proposal card has a *Discuss* button that opens the
floating chat with the proposal injected into the system context
plus the target-run KPIs. The chat retitles to *"Discuss: <title>"*
and re-seeds its welcome with proposal-specific suggested questions.
Closing the chat clears the discussion target.

### Ollama proxy hardening

Three CORS-shaped failures bit during AI feature development; all
turned out to be downstream nginx errors (502 → no Ollama, 504 →
upstream timeout, etc.) with the CORS header missing on the
non-success response. Hardened `ollama_proxy/nginx.conf`:

- `proxy_read_timeout 1200s` (was implicit 60s)
- `proxy_send_timeout 1200s`
- `proxy_buffering off` + `proxy_http_version 1.1` for streaming
- nginx.conf mounted as a volume in docker-compose for live edits

Documented diagnose → match → verify procedure in
`ollama_readme.md` so the same diagnostic muscle memory works next
time.

---

## Phase 4 — Forward to simulator (stub)

`POST /api/simulations/yard/{caseId}/proposals/{id}/run` is defined
in the OpenAPI spec but currently returns 503. When partners ship
their input API:

1. Backend reads proposal + case → applies the proposal's `changes`
   to a working copy of yard/processes/orders → POSTs the resulting
   `SimulationExportData`-shaped payload (minus `Measurements`) to
   `{SIMULATOR_BASE}/run`.
2. Simulator acks (HTTP 202 + `simulatorTraceId`); runs async.
3. Simulator pushes the result back via our existing
   `POST /:caseId/runs` webhook with `run_id = "proposal_<id>"` so
   we can correlate.

Full partner-side contract sketched in
[../../specifications/yard_logistics/design.md §14](../../specifications/yard_logistics/design.md).

---

## Phase 5 — Documentation & tests

### OpenAPI spec

[specifications/yard_logistics/specification.yml](../../specifications/yard_logistics/specification.yml)
covers all 10 yard endpoints + 48 component schemas including the
discriminated `ProposalChange` union and the simulator-export
passthroughs. Annotated where reality is non-obvious
(`TimeEntry.Location == ""` ⇒ off-yard wait; `Storage.Stock` is
volatile; `BottleneckEntry.type` enumerates `ExternalWait`;
capacity-change against the synthetic name is rejected).

### Examples

`specifications/examples/{education,yard_logistics}/` carries hand-
curated request bodies with per-domain READMEs and end-to-end curl
walkthroughs. The yard minimal example (1 terminal, 1 parking, 1
silo, 1 truck) is ~150 lines — readable end-to-end — and
double-checked against the live backend (HTTP 201 from POST).

### Integration tests

`backend/src/tests/integration/` adds two skip-aware HTTP suites:

- `education.test.ts` (6 tests) — create → fetch (asserts 4 adjustments)
  → drill into one → select → read selection → 404 path
- `yard.test.ts` (10 tests) — create from minimal example → fetch
  overview → add second run → run detail → timeline (with and
  without `entity`) → select / read selection → save proposal →
  list/contains → validate-reject unknown entity → DELETE → 404
  → forward-stub

Both ping `/api/health` first and `describe.skipIf(!reachable)`
themselves, so `bun test` stays green whether or not the stack is
running. Backed by the same JSON fixtures the human docs use, so
the docs can't drift from the tests.

`backend/package.json` gains `test:unit` and `test:integration`
scripts.

### Final test counts

| Suite | Count |
|---|---:|
| `stressCalculation.test.ts` | 47 |
| `optimizationEngine.test.ts` | 24 |
| `extensionService.test.ts` | 22 |
| `yardAnalyticsService.test.ts` | 21 |
| `yardProposalService.test.ts` | 16 |
| `simulation.test.ts` (HTTP, education legacy) | 4 |
| `education.test.ts` (HTTP) | 6 |
| `yard.test.ts` (HTTP) | 10 |
| **Total** | **139 pass / 0 fail** when stack is up |

When the stack is down: the 16 integration tests skip cleanly; the
older `simulation.test.ts` is not skip-aware and fails. Converting
it to the same skip pattern is one outstanding cleanup item.

---

## Open items

- **`POST /:caseId/proposals/:id/run`** still returns 503. Implement
  when partners ship their input API. The contract is in
  `specification.yml` and `design.md §14`.
- **`DELETE /:caseId`** missing. The yard integration test leaves
  one orphan `yard_simulations` row per run. UUIDs prevent
  collisions but it's untidy. ~10 lines of code when wanted.
- **`simulation.test.ts` skip-awareness.** Convert to the
  `describe.skipIf(!reachable)` pattern so `bun test` is green
  even with the stack down. One file, ~4 lines.
- **Recompute endpoint.** `summary_metrics` is materialised at
  ingest. When analytics changes (as happened with the
  `(off-yard waiting)` rename), existing rows need re-seeding to
  pick up the new fields. A `POST /:caseId/recompute` would let
  the user refresh in place.
- **AIExplanationBox on yard.** Education has a top-of-page
  one-shot AI summary card; yard has only the floating chat.
  Deliberately skipped for the first iteration — small port if
  wanted.
- **Send-to-simulator UI button.** The *Send to simulator* button
  on saved proposal cards is disabled with a tooltip today.
  Wire it up to `POST /:caseId/proposals/:id/run` when that route
  goes live.
