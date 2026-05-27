# Kiosk Check-in Logs — Getting Started

A complete walk-through for someone who has never opened this case
before. By the end you will: have the demo data loaded, understand
every panel in the UI, know how to read the German step names, and be
able to send your own log batch through the API.

---

## Table of Contents

1. [What this case is about](#1-what-this-case-is-about)
2. [Five-minute quick start](#2-five-minute-quick-start)
3. [Walking through the UI](#3-walking-through-the-ui)
4. [Common tasks](#4-common-tasks)
5. [Sending your own data through the API](#5-sending-your-own-data-through-the-api)
6. [Data format reference](#6-data-format-reference)
7. [Glossary](#7-glossary)
8. [Where to go next](#8-where-to-go-next)

---

## 1. What this case is about

**The problem.** Before a truck enters the yard it has to check in at
a self-service kiosk: pick a language, scan an ident code, type its
license plate, the trailer plate, the driver name, prior cargo,
cleaning history, sign on screen, get a pager. Every screen and every
internal state transition is logged.

If a driver spent 41 seconds on the language picker, is that the kiosk
being slow or the driver being confused? If 2 out of 34 sessions never
reached the closing screen, did the driver walk away? Where are the
*real* time-sinks in the flow?

**What this tool does.** It accepts batches of raw kiosk logs (5764
events for the seeded year), reconstructs **driver sessions** (groups
events by the kiosk's `process` id), computes **per-step time
aggregates** across all sessions (p50 / p95 / max for each dialog),
and lets an analyst:

- Browse the session list sorted by start time, duration, event count.
- Drill into one session and see a colour-coded step-by-step timeline
  with German step names translated to English.
- See a **plain-English summary card** that interprets the top KPIs
  without making you read the chart.
- See a **per-phase breakdown** for any session — where did this
  driver's time actually go? Identification? Vehicle info? Documents?
- Ask an **AI assistant** scoped to the dataset: *"which dialog
  benefits most from a UX change?"*, *"is this session a stall?"*
- Toggle **PII masking** for driver name and signature fields.

What it **doesn't** do: replay the kiosk interactively, or modify the
kiosk's flow. This is observability over what the kiosk actually did.

**Why two domains?** This case sits *upstream* of [Yard
Logistics](../yard_logistics/getting_started.md). The yard simulator
treats CheckIn as a single "took 100 seconds" event; this data lets
you see what those 100 seconds were actually spent on.

---

## 2. Five-minute quick start

### Prerequisites

Same as for yard — **Docker**, **mkcert** with the certs already
generated, **Ollama** running on the host. Full setup steps are in
[../yard_logistics/getting_started.md §2](../yard_logistics/getting_started.md#2-five-minute-quick-start)
or in [../../QUICK_START.md](../../QUICK_START.md).

### Steps

```sh
# 1. Stack up
docker-compose up -d

# 2. Load the LT 010 kiosk dataset (5764 rows / 34 sessions)
docker-compose exec backend bun run seed:logs
```

Open [https://app.localhost/](https://app.localhost/) and click the
violet **🔑 Open Check-in Logs** button. You should land on the demo
case at `/logs/lt010-2025-2026`.

That's it. The page is now fully populated and you can read on while
exploring.

---

## 3. Walking through the UI

The seeded case is **one terminal (LT 010), one year of events**
covering 34 driver visits.

The page is organised top-to-bottom into:

### 3.1 Header

Title and a one-line scope summary: total raw events, sessions,
date range. The **Back** button returns to the home page.

### 3.2 Plain-English summary card (violet)

This is the *most important* panel for first-time readers. Five bullet
points auto-generated from the data:

1. The case's scope (sessions, dates, median session duration, p95).
2. The slowest driver-facing dialogs ranked by p50.
3. Which workflow phase consumes the most total time.
4. Outlier sessions much longer than the median.
5. Whether any sessions look abandoned (didn't reach the closing
   screen).

It's pure logic — no LLM round-trip — so it renders instantly.

### 3.3 KPI strip

Five at-a-glance numbers: sessions, total events, median duration with
p95 sub-line, median events per session, distinct dialogs encountered.

### 3.4 Time per step chart

Horizontal bar chart of the top 12 dialogs ranked by median time
drivers spent. **Solid bar = p50** (median), **faded bar = p95**.

Bars are coloured by **workflow phase**:

| Colour | Phase | Examples |
|---|---|---|
| Grey | Setup | Language picker, initialisation |
| Blue | Identification | Ident-code entry, lookup |
| Purple | Routing | "Loading or Unloading?", "Food or Feed?" |
| Green | Vehicle & driver | License plate, trailer, driver name |
| Amber | Safety & loads | PPE / site rules ack, previous-load history |
| Cyan | Cleaning | When/how was the trailer last cleaned, certificate |
| Rose | Documents | Scan, signature |
| Slate | Internal | Save-record / branch / sub-process steps |
| Emerald | Completion | Pager hand-out, closing screen |

A long p95 tail (the faded part) usually means *some* drivers got
stuck or walked away mid-dialog — worth investigating.

### 3.5 Session list + detail (side by side)

#### Sessions table (left)

One row per driver visit. Columns: process id, started, duration,
events, distinct steps, license plate (when captured). Click a row to
focus the detail panel on the right.

#### Session detail (right)

For the focused session:

**Header.** Process id + started timestamp + duration + event counts.
**Reveal PII (n)** button on the right — when the session has fields
containing personal data (driver name, signature) the button shows the
count. Clicking flips them between masked (`M7••••••••••••••••••••XR`)
and revealed.

**PII banner.** Explicit feedback below the header so the masking
state is visible even when you've scrolled past the PII rows:
"2 field(s) hidden — driver name and signature appear later in this
session. Click Reveal PII to show them."

**"Where did the time go?"** Stacked horizontal bar showing each phase's
share of the session, with per-phase totals and percentages. For an
unfamiliar session this is the fastest way to see what happened.

**Step-by-step list.** Each step shows:

- A phase pill (colour-coded as above)
- The English description (primary label)
- The German raw step name (subtitle, smaller)
- The captured input value (if any) — masked if PII
- A bar showing duration relative to the longest step in this session
- Absolute duration

**Every row is clickable.** Expand to see:

- Full English description
- Phase
- Exact start / end ISO timestamps
- Duration both formatted (`8.0s`) and raw (`8.000s`)
- The captured value (PII-masked or not, depending on the toggle)
- The raw `message` text the kiosk emitted ("Zustandswechsel ...")
- Internal debugging fields: `process`, `proc`, `procstep`, row ids

### 3.6 Floating AI chat (bottom-right)

Always available. Click the bubble. Knows about:

- Overview KPIs and the top-20 dialogs by time
- 5 slowest sessions in the case
- The currently focused session, with per-phase totals

System prompt tells the model to:

- Always speak English, referencing the German label in parentheses on
  first mention so you can correlate.
- Distinguish p50 ("typical") from p95 ("tail").
- Treat sessions that reached `ANZEIGE SCHLUSSBILD` as completed,
  others as possibly abandoned.
- Never quote masked PII verbatim.

Try: *"Which dialog has the longest tail and what could explain it?"*
or *"Pick a session and tell me what stands out about it."*

### 3.7 About card

A short note explaining what data drives the view and where to find
the raw vendor file.

---

## 4. Common tasks

### 4.1 "Where do drivers actually spend their time?"

Look at the **Time per step** chart. The longest solid bar (p50) is
your candidate. Hover any bar to see how many times it occurred and
the German name. The phase legend tells you whether it's a
driver-facing input or internal kiosk processing.

### 4.2 "Find the session(s) that took longest"

Read the **Plain-English summary card** — the fourth bullet flags
outliers if any session is >5x the median. Or sort by clicking
mentally through the session table by *Duration* column.

### 4.3 "What did this driver do, step by step?"

Click any session in the table. The **Where did the time go?** bar at
the top of the detail card shows the high-level breakdown. The
**Step-by-step list** shows everything. Click a row to expand and see
the raw German message + timestamps.

### 4.4 "Did this session abandon, or complete?"

Look at the *completed* column in the session table, or the focus
session's "Where did the time go?" bar. Backend marks `completed:
true` when the session reached the `ANZEIGE SCHLUSSBILD` (Show closing
screen) step.

### 4.5 "What's the AI's read on this session?"

Click the floating chat bubble. The chat already has the focused
session in context. Ask *"Is there anything unusual about this
session?"* or *"How does this compare to typical visits?"*. Pick
**phi4** in the model picker if responses feel slow.

### 4.6 "Reveal driver name and signature for debugging"

Click **Reveal PII (n)** in the session detail header. A rose banner
warns you've enabled it. Click again to re-mask.

### 4.7 "I want to investigate a step's German name"

Hover the small subtitle text under the English label. The full German
name appears as a tooltip. The glossary mapping (German → English +
phase) lives in
[../../ui/src/services/logisticLogsGlossary.ts](../../ui/src/services/logisticLogsGlossary.ts) —
it's exhaustively curated for the seeded dataset and falls back to
heuristics ("EINGABE X" → "Enter: X") for new dialogs.

---

## 5. Sending your own data through the API

The tool exposes a REST API at `https://backend.localhost/api/logs/`.
Interactive Swagger at
[https://backend.localhost/swagger](https://backend.localhost/swagger).

### 5.1 Create a fresh case

The shape is straightforward: name + location + topic + a rows array.
Each row is one Start or End event from the kiosk.

```sh
# Tiny synthetic (~3.5 KB, 9 rows, 1 session) — readable end-to-end
curl -ksS -X POST https://backend.localhost/api/logs/ \
    -H 'Content-Type: application/json' \
    -d @specifications/examples/logistic_logs/01_create_case.json

# Realistic — full year of LT 010 events (~1.8 MB, 5764 rows, 34 sessions)
curl -ksS -X POST https://backend.localhost/api/logs/ \
    -H 'Content-Type: application/json' \
    -d @specifications/examples/logistic_logs/02_full_year_lt010.json
```

Response:

```json
{
  "caseId":       "<uuid>",
  "rowCount":     9,
  "sessionCount": 1,
  "resultsUrl":   "https://app.localhost/logs/<uuid>"
}
```

Open `resultsUrl` to see your case in the UI. **Note:** the seed
script ingests the realistic body under a fixed `case_id`
(`lt010-2025-2026`) so the MainPage button can link there reliably.
Manual POSTs get a fresh UUID.

### 5.2 Read endpoints

| What you want | Endpoint | Notes |
|---|---|---|
| Case overview + step aggregates | `GET /api/logs/{caseId}` | Pre-computed at ingest; cheap. |
| All sessions' metadata | `GET /api/logs/{caseId}/sessions` | Powers the UI table. No raw rows. |
| One session's full rows | `GET /api/logs/{caseId}/sessions/{processId}` | Lazy-loaded when you click a row. |
| Step aggregates only | `GET /api/logs/{caseId}/aggregates` | Alias for `.aggregates` on the overview. |
| Recompute `summary_metrics` | `POST /api/logs/{caseId}/recompute` | Use after analytics-code changes. |
| Delete the case | `DELETE /api/logs/{caseId}` | Cascade-deletes rows. |

### 5.3 When to re-run analytics

The case's `summary_metrics` (overview + step aggregates) is computed
**once at ingest** for fast reads. If the analytics code changes
(e.g. you add a new aggregation), the stored summary won't reflect
that until you call:

```sh
curl -ksS -X POST https://backend.localhost/api/logs/<caseId>/recompute
```

The endpoint re-runs `buildSummaryMetrics` over the rows currently in
the DB and overwrites the cached blob. No need to re-ingest.

---

## 6. Data format reference

### 6.1 One log row

```jsonc
{
  "id": 1,                              // kiosk's own row id (becomes source_id server-side)
  "date": "2025-04-28T14:21:06",        // ISO 8601 local time, no zone
  "location": "LT 010",
  "topic": "Check-In",
  "process": 1388,                      // 0 = idle sentinel; >0 = session id
  "proc": 1,
  "procstep": 3,
  "procsteptype": "DIALOG",             // DIALOG | PROCESS
  "procstepinfo": "EINGABE KENNZEICHEN",// German step name (verbatim, do not translate)
  "procstepaction": "Start",            // Start | End — comes in pairs
  "message": "Display license plate input",
  "value": "HB-OAS 03"                  // captured user input, when applicable
}
```

**Identity rule.** Session identity is `(case_id, process)`, never
bare `process`. The kiosk's `process` counter recycles, so the same
number across two cases is two different drivers.

**Type rule.** `DIALOG` = something the driver sees and interacts
with. `PROCESS` = an internal state transition the kiosk records (save
record, branch, set status). Driver-perceived latency only accumulates
during DIALOG steps and the gaps between them.

**Action rule.** Every meaningful step emits a Start row when entered
and an End row when finished. Duration = `End.date - Start.date`. The
analytics pairs them by `(process, procstepinfo)` and skips orphan
Starts.

### 6.2 The wrapper — LogCaseCreateInput

```jsonc
{
  "name":        "LT 010 — 2026 Q1",
  "description": "Three months of weekday afternoon traffic",
  "location":    "LT 010",
  "topic":       "Check-In",
  "related_yard_case_id": "yard-sample-001",  // optional — link to a yard case
  "metadata":    { "uploader": "ops@example.com" },
  "rows": [
    { /* LogRow */ },
    { /* LogRow */ },
    ...
  ]
}
```

The smallest possible body is in
[../../specifications/examples/logistic_logs/01_create_case.json](../../specifications/examples/logistic_logs/01_create_case.json) —
9 rows producing one complete session, readable end-to-end.

### 6.3 The 8 workflow phases

The UI groups steps into phases for at-a-glance interpretation. The
mapping is hand-curated in
[../../ui/src/services/logisticLogsGlossary.ts](../../ui/src/services/logisticLogsGlossary.ts).

| Phase | Examples |
|---|---|
| **Setup** | INITIALISIERUNG, SPRACHAUSWAHL |
| **Identification** | EINGABE IDENTCODE ANMELDUNG, AKTION IDENTCODE ANMELDUNG AUSWERTEN |
| **Routing** | ENTSCHEIDUNG WARENRICHTUNG, ENTSCHEIDUNG FOOD-FEED, branch steps |
| **Vehicle & driver** | EINGABE KENNZEICHEN, EINGABE KENNZEICHEN ANHÄNGER, EINGABE FAHRERNAME |
| **Safety & loads** | QUITTIERUNG PSA, QUITTIERUNG WERKSVORSCHRIFTEN, EINGABE ERSTE/ZWEITE/DRITTE VORBELADUNG |
| **Cleaning** | EINGABE DATUM LETZTE REINIGUNG, ENTSCHEIDUNG REINIGUNGSZERTIFIKAT VORHANDEN |
| **Documents** | DOKUMENTE SCANNEN, EINGABE UNTERSCHRIFT |
| **Internal** | AKTION VORGANG SPEICHERN, AKTION VORGANG STATUS SETZEN |
| **Completion** | AKTION PAGER SPENDEN, ANZEIGE SCHLUSSBILD |

If you add new dialogs to the kiosk and they don't appear in the
glossary, the page falls back to heuristics (`EINGABE X` →
"Enter: X" / `setup` if it contains "INITIAL", etc.) so new dialogs
still get a reasonable English label and a guessed phase.

### 6.4 PII handling

The dataset already **pseudonymises** driver names and signatures at
the source — they arrive as opaque 32-char hashes. Our handling on top:

1. We store the value verbatim (no further redaction at the DB layer).
2. The UI **masks** them by default: only the first two and last two
   characters show, the middle becomes bullets (`M7••••••••••••••••••••XR`).
3. The PII button counts how many such fields exist in the focused
   session and toggles masking on demand. A coloured banner makes the
   masking state explicit.
4. The AI chat is prompted never to quote masked PII verbatim.

Steps tagged as PII in [logisticLogsService.ts](../../ui/src/services/logisticLogsService.ts):
- `AKTION FAHRERNAME ERFASST`, `EINGABE FAHRERNAME`
- `AKTION UNTERSCHRIFT ERFASST`, `EINGABE UNTERSCHRIFT`

---

## 7. Glossary

**Case.** A batch of kiosk logs covering some window from one
terminal. Has a `case_id` (UUID or fixed for seed). Stored in
`log_cases`.

**Row.** One raw Start or End event from the kiosk. Stored in
`log_rows`. About 5764 rows in the seeded sample.

**Session.** A driver's full kiosk visit — all rows sharing the same
non-zero `process` id within the case. Reconstructed at read time, not
stored as its own row.

**Step.** A single dialog or internal action, identified by
`procstepinfo`. Has a Start row and (usually) an End row. The
**average session in the seeded sample has 110 events** = ~55 steps
roughly.

**`process: 0` sentinel.** When the kiosk is idle (nobody using it)
it emits events with `process: 0`. The session reconstruction
explicitly skips these — they're not real driver visits.

**Completed session.** One that reached the `ANZEIGE SCHLUSSBILD`
(Show closing screen) step. Otherwise it may have been abandoned
mid-flow — driver walked away, system was reset, etc.

**Step aggregate.** Per-`procstepinfo` rollup across all sessions:
count, total seconds, mean, p50, p95, max. Sorted by total descending.
Stored on `log_cases.summary_metrics.aggregates`.

**Phase.** One of 8 high-level workflow buckets (Setup, Identification,
Routing, Vehicle & driver, Safety & loads, Cleaning, Documents,
Internal, Completion). Pure UI concept — the kiosk doesn't know about
phases. Curated in [`logisticLogsGlossary.ts`](../../ui/src/services/logisticLogsGlossary.ts).

**PII.** Personally identifying information. In this dataset: driver
name and signature. The kiosk already pseudonymises both; we add UI
masking on top.

---

## 8. Where to go next

- **Architecture + design decisions:**
  [../../specifications/logistic_logs/design.md](../../specifications/logistic_logs/design.md) —
  why the schema is `log_cases + log_rows` rather than session-as-row,
  what's deferred (kiosk-UX proposals, cross-case comparison), the
  full open-questions list.
- **Full API schema:**
  [../../specifications/logistic_logs/specification.yml](../../specifications/logistic_logs/specification.yml) —
  authoritative OpenAPI 3.1.
- **Interactive Swagger:**
  [https://backend.localhost/swagger](https://backend.localhost/swagger)
- **Curl walkthroughs:**
  [../../specifications/examples/logistic_logs/README.md](../../specifications/examples/logistic_logs/README.md)
- **Vendor's own description of the dataset:**
  [../../specifications/logistic_logs/Short desciption of logdata.docx](../../specifications/logistic_logs/Short%20desciption%20of%20logdata.docx)
  (the partner's Word doc)
- **Sister case — yard logistics:**
  [../yard_logistics/getting_started.md](../yard_logistics/getting_started.md) —
  what happens *inside* the yard once a truck checks in.
