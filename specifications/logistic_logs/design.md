# Logistic Logs — Design Document

**Status:** Draft → Phase 1+2 in flight
**Owner:** AI4Work team
**Last updated:** 2026-05-26

> Companion files in this folder:
> - [specification.yml](specification.yml) — OpenAPI 3.1 contract for every
>   `/api/logs/*` endpoint.
> - [logdata_aggregated.data.json](logdata_aggregated.data.json) — the
>   partner-supplied vendor input (BOM-prefixed UTF-8, ~5764 rows for LT 010).
> - [Short desciption of logdata.docx](Short%20desciption%20of%20logdata.docx) —
>   the partner's own description of the data semantics.

---

## 1. Goal

Add a third analysis domain to the What-If Tool: **kiosk check-in logs**.
Planners ingest raw process-mining logs from a self-service kiosk (today
LT 010), see per-driver-session timelines, per-step time aggregates, and
in-context AI commentary that helps interpret the kiosk experience.

The yard side already shows what happens *inside* the yard once a truck
is on the grounds; this side shows what happened *before* — every dialog
the driver tapped through to get a pager. The two domains are linked
conceptually via the shared `LT 010` entity name.

**Non-goals.** Editing log rows. Running the kiosk ourselves. Replaying
sessions interactively.

---

## 2. Scope of this iteration (Phase 1+2)

In:
- DB tables (`log_cases` parent + `log_rows` flat fact table).
- Ingest endpoint with chunked bulk-insert.
- Read endpoints for overview, per-session lists, per-session rows,
  step-duration aggregates, recompute, delete.
- OpenAPI spec covering all endpoints.
- Example request bodies + curl walkthrough in
  `specifications/examples/logistic_logs/`.
- Skip-aware integration tests.
- UI migration: page reads from API instead of the bundled static asset.

Out (later phases):
- Kiosk-UX proposals (analogue of `yard_proposals`). Defer until we know
  what kinds of changes are worth proposing.
- Cross-case comparison (multiple terminals, multiple time windows).
- Live webhook ingestion from the kiosk.

---

## 3. Domain model

| Concept | What it is | Maps to yard |
|---|---|---|
| **Log case** | A batch of raw kiosk logs covering some window from one terminal. `case_id` is UUID (or override-able for seed: `lt010-2025-2026`). | `yard_simulations` |
| **Log row** | One Start or End event from the kiosk. ~5764 rows in the seeded sample. | (no direct analogue) |
| **Session** | A driver's full visit, reconstructed by grouping rows by non-zero `process` id. **Derived** at read time. | A simulator run's `OrderMeasurement` |
| **Step aggregate** | Per-`procstepinfo` p50/p95/total across all sessions in a case. Pre-computed at ingest into `summary_metrics`. | `yard_runs.summary_metrics.bottlenecks` |

**Identity rule.** Session identity is `(case_id, process)`, never just
`process` — the kiosk's process counter recycles over time, so process id
1388 in last quarter's batch is a different driver than process id 1388
in next quarter's batch.

**PII rule.** The dataset already pseudonymises driver names (32-char
hash) and signatures. We store those values verbatim, mask them in the
UI by default, and the chat prompts the model never to quote masked PII.

---

## 4. Data layer

### 4.1 Tables

```sql
CREATE TABLE log_cases (
    case_id          TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    description      TEXT,
    location         TEXT NOT NULL,        -- "LT 010"
    topic            TEXT NOT NULL,        -- "Check-In"
    summary_metrics  JSONB NOT NULL,       -- overview + aggregates (computed at ingest)
    related_yard_case_id TEXT,             -- optional link to yard_simulations
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE log_rows (
    id               BIGSERIAL PRIMARY KEY,
    case_id          TEXT NOT NULL REFERENCES log_cases(case_id) ON DELETE CASCADE,
    source_id        INTEGER NOT NULL,        -- kiosk's own row id (not unique cross-case)
    date             TIMESTAMP NOT NULL,
    location         TEXT NOT NULL,
    topic            TEXT NOT NULL,
    process          INTEGER NOT NULL,        -- 0 = idle; >0 = session id
    proc             INTEGER NOT NULL,
    procstep         INTEGER NOT NULL,
    procsteptype     TEXT NOT NULL,
    procstepinfo     TEXT NOT NULL,
    procstepaction   TEXT NOT NULL,
    message          TEXT,
    value            TEXT,
    CHECK (procsteptype IN ('PROCESS', 'DIALOG')),
    CHECK (procstepaction IN ('Start', 'End'))
);

CREATE INDEX idx_log_rows_case_proc ON log_rows(case_id, process, date);
CREATE INDEX idx_log_rows_case_step ON log_rows(case_id, procstepinfo);
CREATE INDEX idx_log_rows_case_date ON log_rows(case_id, date);
```

Idempotent migration in `db/log_cases_migration.sql` for existing dev
databases; canonical definitions in `db/schema.sql` for fresh boots.

### 4.2 `summary_metrics` shape

```jsonc
{
  "overview": {
    "rowCount": 5764,
    "sessionCount": 34,
    "earliestDate": "2025-04-28T14:21:06",
    "latestDate":   "2026-04-15T16:01:56",
    "location": "LT 010",
    "topic":    "Check-In",
    "durationStats": { "minSec": 56, "medianSec": 145, "p95Sec": 2484, "maxSec": 17909287 },
    "eventStats":    { "min": 44, "median": 110, "p95": 134, "max": 742 }
  },
  "aggregates": [
    {
      "stepInfo": "SPRACHAUSWAHL",
      "type": "DIALOG",
      "count": 33, "totalSec": 1353, "avgSec": 41.0,
      "p50Sec": 41, "p95Sec": 1200, "maxSec": 1200
    }
    // …one entry per distinct procstepinfo
  ]
}
```

Identical to what the UI computes today — just materialised server-side
so reads are cheap.

---

## 5. Type definitions

`backend/src/types/logisticLogs.ts` mirrors the shapes in
`ui/src/types/logisticLogs.ts` (plus a new `LogCaseCreateInput`). The
two stay manually in sync; if the shape grows often we'll add a shared
package later.

---

## 6. Services

| File | Role |
|---|---|
| `backend/src/services/logAnalyticsService.ts` | Pure functions: `buildSessions(rows)`, `computeOverview(rows, sessions)`, `computeStepAggregates(rows)`, `reconstructSteps(rows)`. Ports the existing client-side service so the same numbers render whether we compute in browser or server. |
| `backend/src/services/logIngestService.ts` | Validates the body, chunks rows into ≤1000-row inserts (Postgres parameter cap defence), computes `summary_metrics`, writes everything in a single transaction. |

Both unit-testable against the seeded `logdata_aggregated.data.json`
fixture.

---

## 7. API

Prefix: `/api/logs/`. **Full OpenAPI contract:** [specification.yml](specification.yml).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/` | Ingest a batch (`{ name, description?, location, topic, metadata?, rows: LogRow[] }`). Returns `{ caseId, rowCount, sessionCount, resultsUrl }`. |
| `GET`  | `/:caseId` | Overview + step aggregates (no raw rows). |
| `GET`  | `/:caseId/sessions` | Per-session metadata array (powers the session table). |
| `GET`  | `/:caseId/sessions/:processId` | Full row list for one session (powers the detail drill-in). |
| `GET`  | `/:caseId/aggregates` | Step-duration aggregates only (alias for `overview.summary_metrics.aggregates`). |
| `POST` | `/:caseId/recompute` | Recompute `summary_metrics` from stored rows. For when analytics code evolves. |
| `DELETE` | `/:caseId` | Cascade-delete the case + its rows. |

**Future** `POST /:caseId/proposals` (kiosk-UX changes) is deliberately
absent. We add it once we know what change kinds are worth supporting.

---

## 8. Frontend changes

Tiny migration since the page already renders all the right things:

1. Add `/logs/:caseId` route alongside the existing `/logs/lt010`.
2. Update [logisticLogsService.ts](../../ui/src/services/logisticLogsService.ts):
   - `loadLogs(caseId)` → `fetch('/api/logs/{caseId}/sessions')` for the
     metadata + `fetch('/api/logs/{caseId}')` for the overview/aggregates.
   - Add `loadSessionRows(caseId, processId)` for the drill-in.
   - Keep the pure functions (`buildSessions`, `formatDuration`, etc.) —
     the client still reconstructs steps for the detail view.
3. MainPage button points at `lt010-2025-2026` (seeded case id).
4. Retire `ui/public/logistic_logs/logdata.json` once API path works.

The glossary, the floating chat, and the narrative card stay
client-side — they're interpretation, not data.

---

## 9. Bulk-import (seed)

`backend/scripts/seedLogisticLogs.ts`:
- BOM-aware read of
  `specifications/logistic_logs/logdata_aggregated.data.json`.
- `LogIngestService.createCase({ caseId: "lt010-2025-2026", replace: true, … })`.
- `bun run seed:logs` script.

Same pattern as `seedYardSamples.ts`. Dependent on the
`./specifications:/usr/src/specifications:ro` mount we already added on
the backend container.

---

## 10. AI features

Already shipped client-side ([FloatingLogsChat.tsx](../../ui/src/components/logisticLogs/FloatingLogsChat.tsx),
[LogNarrativeCard.tsx](../../ui/src/components/logisticLogs/LogNarrativeCard.tsx)).
No changes needed for this phase — they consume the same overview /
aggregates / selected-session shape regardless of where it comes from.

When we eventually add proposals (Phase 4), the prompt builder gets a
proposal block injected, mirroring the yard chat's discuss-a-proposal
mode.

---

## 11. Implementation phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Schema + ingest + read API + seed + UI migration | **in progress** |
| 2 | OpenAPI + examples + integration tests | **in progress (parallel)** |
| 3 (later) | Recompute endpoint UX in the page (a button), retention strategy | deferred |
| 4 (later) | Kiosk-UX proposals (`log_proposals` table, `changes[]` union covering merge/pre-fill/remove/reorder dialogs) | deferred |
| 5 (later) | Cross-case comparison view (compare two terminals or two time windows) | deferred |
| 6 (later) | Live webhook ingest from the kiosk | deferred |

---

## 12. Open questions

1. **One terminal or many?** Schema treats `location` as a column on
   `log_cases` so adding LT 810 later is just another case. If a
   single case should hold rows from multiple kiosks, `location` is
   already per-row too — no schema change.
2. **Idempotent re-ingest.** If partners push the same batch twice, we
   currently accept duplicates. Cheapest dedup: a unique constraint on
   `(case_id, source_id, procstepaction)` per row. Deferred.
3. **Retention.** One year × one kiosk = 6K rows. Five kiosks × five
   years = 150K. Still cheap. No retention strategy yet.
4. **Driver-name hashes.** Dataset already pseudonymises (`M7GcLq...`).
   We store the hash, mask in the UI; no further redaction at the DB
   layer.
5. **Process-id collisions across cases.** Handled — session identity
   uses `(case_id, process)`, never bare `process`.

---

## 13. File map (when this phase ships)

```
backend/
  src/
    db/schema.ts                              (+ log_cases, log_rows)
    types/logisticLogs.ts                     (NEW)
    services/
      logAnalyticsService.ts                  (NEW — port from UI)
      logAnalyticsService.test.ts             (NEW)
      logIngestService.ts                     (NEW)
    routes/
      logRoutes.ts                            (NEW — /api/logs/*)
      index.ts                                (+ .use(logRoutes))
  scripts/
    seedLogisticLogs.ts                       (NEW)
  tests/integration/
    logs.test.ts                              (NEW)

ui/
  src/
    pages/LogisticLogsPage.tsx                (+ uses /logs/:caseId)
    services/logisticLogsService.ts           (refactored to call API)
    pages/MainPage.tsx                        (button → /logs/lt010-2025-2026)
    App.tsx                                   (+ /logs/:caseId route)

db/
  schema.sql                                  (+ log_cases, log_rows)
  log_cases_migration.sql                     (NEW — idempotent)

specifications/
  logistic_logs/
    design.md                                 (this doc)
    specification.yml                         (NEW — OpenAPI 3.1)
    logdata_aggregated.data.json              (vendor input, untouched)
  examples/
    logistic_logs/
      README.md                               (NEW)
      01_create_case.json                     (NEW — minimal synthetic example)

ui/public/logistic_logs/
  logdata.json                                (REMOVED — API now owns this)
```
