# Yard Logistics — Getting Started

A complete walk-through for someone who has never opened this case before.
By the end of this doc you will have: the stack running, the demo data
loaded, a clear picture of every panel in the UI, and you'll know how to
send your own data through the API.

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

**The problem.** A truck yard has a fixed physical layout (a check-in
gate, a barrier, parking spots, silos, weigh scales, a check-out gate)
and a daily inflow of trucks arriving at scheduled times. As load grows,
trucks queue at bottlenecks — the parking fills up, the silo gets two
trucks waiting, the check-in terminal can't admit more. Yard planners
want to know **where the bottlenecks are** and **what change would help
the most** before they invest in new infrastructure.

**What this tool does.** It accepts simulator outputs from a partner
simulation tool, derives per-run KPIs and bottleneck rankings, and lets
a planner:

- Compare several simulator runs side by side (different order loads
  over the same yard).
- See a per-truck timeline (Gantt) of what happened, with hover detail.
- See per-entity occupancy over time, with a capacity reference line.
- Mark one run as the preferred outcome ("we should aim for this one").
- Generate **AI improvement proposals** ("if you double parking, expect
  ≈40% less wait at the silo") and discuss them with a local LLM.
- Upload a yard layout image so the page shows the real physical map.

What it **doesn't** do: run the simulator itself. The simulator is owned
by the partner team and lives elsewhere. This tool ingests their results
and surfaces them.

---

## 2. Five-minute quick start

### Prerequisites you need installed once

- **Docker** + **Docker Compose** (recent versions).
- **[mkcert](https://github.com/FiloSottile/mkcert)** for trusted local
  HTTPS — used by Traefik to terminate `https://app.localhost`.
- **[Ollama](https://ollama.com/)** running on your host machine (for
  the AI features). See
  [../../ollama_readme.md](../../ollama_readme.md) for env vars.
- **[Bun](https://bun.sh/)** if you want to run the seed script
  directly from your host instead of inside the container.

### Steps

```sh
# 1. Generate local SSL certificates (one-time setup)
mkcert -install
mkcert "*.localhost" traefik.localhost ollama.localhost \
       app.localhost backend.localhost postgres.localhost
mkdir -p traefik/certs
mv _wildcard.localhost+5.pem      traefik/certs/cert.pem
mv _wildcard.localhost+5-key.pem  traefik/certs/key.pem
chmod 600 traefik/certs/*

# 2. Start Ollama on your host (separate terminal, keep it running)
OLLAMA_HOST=0.0.0.0 \
    OLLAMA_ORIGINS='https://app.localhost,https://backend.localhost' \
    ollama serve

# 3. Bring the stack up
docker-compose up -d

# 4. Wait ~10s for Postgres to initialise, then load the demo yard
docker-compose exec backend bun run seed:yard
```

Open [https://app.localhost/](https://app.localhost/) and click the
green **🚚 Load Yard Simulation** button. You should land on the demo
case at `/yard/yard-sample-001`.

**Trouble?** First-time stack issues are almost always Ollama-related —
see [../../ollama_readme.md](../../ollama_readme.md) (the troubleshooting
table at the bottom is ranked by frequency).

---

## 3. Walking through the UI

The demo case has three simulator runs over the same physical yard:

| Run | What it represents |
|---|---|
| **Smooth** | 30 orders, no waiting anywhere. The yard breezes through. |
| **SequencedOk** | 52 orders. A few small queues form but everything completes within reasonable time. |
| **WaitingProblem** | 71 orders. The yard saturates — trucks queue 30+ minutes at the barrier. |

The page is organised top-to-bottom into:

### 3.1 Header

The yard's name and case description. **Back** returns to the home page.

### 3.2 Yard layout card

The physical map of the yard. You can:

- **Upload an image** — click *Upload image* (or *Replace* if one exists)
  to attach a PNG / JPEG / WebP / SVG up to 5 MB. The image is served
  from the backend and persists across stack restarts.
- **Remove the image** — trash icon next to *Replace*.

If no image is set, you'll see a dropzone CTA.

### 3.3 Yard contents card

A small table on the right of the yard map: counts of Terminals,
ParkingAreas, Scales, Storages, Crossings, Streets. Tells you how big
the yard is at a glance.

### 3.4 Tabs

Four tabs (or three + the per-run tabs, depending on how you count):

#### **Comparison** (default)

A table comparing every run on shared KPIs: orders completed, total
waiting time, average wait, maximum wait, throughput per hour, top
bottleneck. The "best" run by your chosen metric is easy to spot.

A **Select** button on each row marks that run as your preferred
outcome. The selected run gets a ⭐ next to its tab name.

#### **Improvements**

The AI-proposal workflow. Pick a target run (defaults to the worst),
pick how many proposals to generate, click *Generate suggestions*. The
LLM returns 1-5 structured proposals as **drafts** that live only in
your browser's localStorage until you save them.

Each draft has:

- A short title and summary
- A target bottleneck (the entity this addresses)
- A list of structured **changes**: `capacity` (bump an entity's
  capacity), `stagger_orders` (re-schedule arrivals), `reroute` (send a
  material to a different silo), `add_entity` (introduce a new entity)
- An expected impact and a risks/caveats line

**Save** persists the proposal to the database. **Discard** drops it.

Saved proposals get a **Discuss** button — clicking it opens the AI
chat scoped to that proposal, with the proposal + target-run KPIs
pre-loaded into the system context. Ask things like *"how confident
are you that this fixes the bottleneck?"* or *"what could go wrong?"*

You can also **Add manual proposal** if you want to type your own.

#### Per-run tabs (one per run: Smooth, SequencedOk, WaitingProblem)

For a single run, you get:

| Panel | What it shows |
|---|---|
| **KPI summary** | 5 big numbers: orders done/total, total wait, max wait, total drive, throughput. |
| **Top bottlenecks** | Top-5 entities ranked by `queue_score = max_concurrent / capacity`. Click one to drive the chart. The `(off-yard waiting)` entry is special — see [§7](#7-glossary). |
| **Entity occupancy timeline** | Recharts area chart. X-axis is minutes, Y-axis is trucks-present. A red dashed line marks the entity's capacity. Peaks above the line are saturation events. |
| **Per-truck Gantt** | One row per truck, coloured bands per action (CheckIn / Parking / Driving / Waiting / Loading / etc.). Hover any truck row to get a floating tooltip with per-action totals + completion state. Use the *All trucks* dropdown to filter to a single truck. |

### 3.5 Floating AI chat (bottom-right bubble)

Always available. Click the bubble to open. The chat knows about:

- The case overview and every run's KPIs
- The current run if you're on a per-run tab
- The current proposal if you arrived here via *Discuss*

You can ask anything from *"which run is best?"* through *"why is B010
saturated?"* to *"what would the simulator probably show if I doubled
parking?"*

The chat header has a model picker (top-right). Pick **phi4** or
**gpt-oss** for proposal generation — reasoning models like *qwen3.5*
can spin on JSON-output tasks. For free-text questions any model works.

---

## 4. Common tasks

### 4.1 "Show me where time is being wasted in the worst run"

1. Click the **WaitingProblem** tab.
2. Look at the **Top bottlenecks** card. The first row is the worst
   offender. `3/1` and score `3.00` means peak concurrency was 3 trucks
   simultaneously at an entity that serves one at a time.
3. Click that bottleneck row. The **Entity occupancy timeline** chart
   updates to show how long it was over capacity.
4. Below, scan the **Per-truck Gantt** for red bands (Waiting) — those
   are trucks that queued.

### 4.2 "Generate AI improvement ideas"

1. Click the **Improvements** tab.
2. In *Generate AI suggestions*, leave the target run on the worst one
   (defaults to highest max-wait).
3. Set count to **3** to start.
4. Pick **phi4:latest** in the model picker at the top-right of the
   page if you haven't already.
5. Click **Generate suggestions**. Takes 30s-2min depending on the model.
6. Review the draft cards. **Save** the ones that look reasonable;
   **Discard** the rest.
7. Click **Discuss** on a saved proposal to dig deeper with the AI.

### 4.3 "I have my own simulator run; load it into the tool"

Two paths — see [§5.2](#52-add-a-run-to-an-existing-case) for adding to
an existing case, or [§5.1](#51-create-a-fresh-case) to make a new one.

### 4.4 "I want to attach our actual yard image"

Click **Upload image** (or **Replace**) in the Yard layout card, pick a
file ≤5 MB. The page updates immediately. The file is served at
`https://backend.localhost/uploads/yard_images/{caseId}.{ext}` and
persists across container restarts.

### 4.5 "Mark our preferred outcome"

On the **Comparison** tab, click **Select** on the row you want. A ⭐
appears next to that run's tab. The selection is stored server-side and
visible to anyone else looking at this case.

---

## 5. Sending your own data through the API

The tool exposes a REST API at `https://backend.localhost/api/simulations/yard/`.
Every endpoint is documented in interactive Swagger at
[https://backend.localhost/swagger](https://backend.localhost/swagger).

### 5.1 Create a fresh case

The minimum is a name + at least one simulator run. The run's `export`
field is exactly the simulator's native `SimulationExportData` payload
(see [§6](#6-data-format-reference)).

**Easiest: use a pre-made example body.**

```sh
# Tiny synthetic — read this to learn the shape (~7 KB, 1 truck)
curl -ksS -X POST https://backend.localhost/api/simulations/yard/ \
    -H 'Content-Type: application/json' \
    -d @specifications/examples/yard_logistics/01_create_simulation.minimal.json

# Realistic — same three runs as the seeded demo (~900 KB)
curl -ksS -X POST https://backend.localhost/api/simulations/yard/ \
    -H 'Content-Type: application/json' \
    -d @specifications/examples/yard_logistics/05_full_three_runs.json
```

Both return:

```json
{
  "caseId":     "<uuid>",
  "runCount":   3,
  "resultsUrl": "https://app.localhost/yard/<uuid>"
}
```

Open the `resultsUrl` to see your case in the UI.

### 5.2 Add a run to an existing case

If you already created a case and want to push another simulator result
to the same yard:

```sh
curl -ksS -X POST https://backend.localhost/api/simulations/yard/<caseId>/runs \
    -H 'Content-Type: application/json' \
    -d @specifications/examples/yard_logistics/02_add_run.json
```

> This is the future **simulator-webhook target**. When the partner's
> simulator API is wired up, it will POST to this URL each time it
> finishes a what-if run; we already accept that shape.

### 5.3 Save an improvement proposal manually

If you have a proposal in mind (say, "increase P010 capacity from 12 to
18") and want to record it without going through the chat:

```sh
curl -ksS -X POST https://backend.localhost/api/simulations/yard/<caseId>/proposals \
    -H 'Content-Type: application/json' \
    -d @specifications/examples/yard_logistics/03_create_proposal.json
```

The server validates the proposal's references against your yard's
entity list. If the proposal targets an entity that doesn't exist,
you'll get a 400 with a structured `validation.errors` array
explaining what's wrong.

### 5.4 Read endpoints (for integrations / dashboards)

| What you want | Endpoint | Notes |
|---|---|---|
| Case overview + every run's summary | `GET /api/simulations/yard/{caseId}` | The bread and butter. |
| One run's full payload | `GET /api/simulations/yard/{caseId}/{runId}` | Includes raw `orders` + `measurements`. |
| Occupancy timeline at one entity | `GET /api/simulations/yard/{caseId}/{runId}/timeline?entity=B010` | Computed on demand, 30s sampling. |
| Selected preferred run | `GET /api/simulations/yard/{caseId}/selection` | |
| All proposals for a case | `GET /api/simulations/yard/{caseId}/proposals` | |

The full machine-readable contract is in
[../../specifications/yard_logistics/specification.yml](../../specifications/yard_logistics/specification.yml).
Browse it interactively at
[https://backend.localhost/swagger](https://backend.localhost/swagger).

### 5.5 Image upload

Multipart POST with the file in an `image` field. PNG / JPEG / WebP /
SVG accepted, up to 5 MB.

```sh
curl -ksS -X POST https://backend.localhost/api/simulations/yard/<caseId>/image \
    -F "image=@/path/to/your-yard-map.png"
```

Re-uploading replaces; `DELETE` on the same URL clears it.

---

## 6. Data format reference

The simulator's native shape (what comes out of the partner tool) is
called **SimulationExportData**. It has five top-level blocks:

```jsonc
{
  "ComparisonInformation": {
    "YardStructure": "<sha-256 hash>",
    "Processes":     "<sha-256 hash>",
    "Orders":        "<sha-256 hash>"
  },
  "YardStructure": { "Entities": { ... }, "Streets": [ ... ] },
  "Processes":     [ /* "recipe" each truck order follows */ ],
  "Orders":        [ /* arrival schedule */ ],
  "Measurements":  { "Summary": { ... }, "Measurements": [ /* per-truck */ ] }
}
```

### 6.1 YardStructure — the physical yard

Six kinds of entities, plus streets between them:

| Entity | What it is | Key field for analytics |
|---|---|---|
| **Terminal** | Check-in / check-out kiosk or barrier or scale terminal | `Typ` (CheckIn / CheckOut / Schrankenterminal / Waagenterminal) |
| **ParkingArea** | Truck holding lot | `Capacity` (parking spots) |
| **Scale** | Weighbridge | (1 truck at a time) |
| **Storage** | A silo with a specific material | `MaterialId`, `Loading_PerSecond`, `Stock` |
| **Crossing** | Pure routing node, no action | `MaxOccupancy` |
| **Street** | Directed edge between two entities | `MaxOccupancy`, `Cost_Seconds` |

Volatile fields: `Storage.Stock` changes per run (drivers loaded /
unloaded material). Our backend ignores `Stock` when deciding whether
two runs share the same yard topology — see
[../../specifications/yard_logistics/design.md §4.2](../../specifications/yard_logistics/design.md).

### 6.2 Process — what a truck does

A list of `Tasks`, each pinned to one or more entities or to *any
entity that can do this action*:

```json
{
  "Ident": "M186_Load",
  "Material": "186",
  "Action": "Loading",
  "Tasks": [
    { "Action": "CheckIn",  "Specifications": [] },
    { "Action": "Parking",  "Specifications": ["P010"] },
    { "Action": "Authenticate", "Specifications": ["B010"] },
    { "Action": "*",        "Specifications": ["SL729"] },
    { "Action": "CheckOut", "Specifications": [] }
  ]
}
```

`Action: "*"` means "the order's declared action" (Loading or
Unloading). Empty `Specifications` means "any entity that can do this
action".

### 6.3 Order — one truck arriving

```json
{
  "offsetMinutes": 70,
  "licensePlate":  "OAS-L 193-4",
  "action":        "Loading",
  "quantityKg":    4000,
  "material":      "193"
}
```

`offsetMinutes` is minutes after `t=0` when the truck arrives at the
gate.

### 6.4 Measurement — what actually happened

For each truck, the simulator records a `TimeEntries[]` array — every
action the truck took with absolute start/end timestamps:

```json
{
  "OrderIdent":   "OAS-L 186-1",
  "ProcessIdent": "M186_Load",
  "Summary": {
    "WaitingTime": "00:01:45",
    "DrivingTime": "00:01:13",
    "OrderState":  "Completed"
  },
  "TimeEntries": [
    { "Location": "LT010", "Action": "CheckIn",  "Start": "00:00:00", "End": "00:01:45", "Duration": "00:01:45" },
    { "Location": "S3",    "Action": "Driving",  "Start": "00:01:45", "End": "00:01:58", "Duration": "00:00:13" },
    { "Location": "P010",  "Action": "Parking",  "Start": "00:01:58", "End": "00:05:03", "Duration": "00:03:05" },
    ... etc
  ]
}
```

**Note: `Location` is the entity's `Name`, not its `Id`.** An empty
`Location` with `Action: "Waiting"` represents a truck queued
*outside* the yard before any CheckIn was free — the analytics buckets
these under the synthetic entity name `(off-yard waiting)` with type
`ExternalWait` (see [§7](#7-glossary)).

### 6.5 Our wrapper — YardSimulationIngestInput

To send a `SimulationExportData` to our API, wrap it in a thin
envelope that adds case metadata:

```jsonc
{
  "name": "Yard XYZ — Q1 2026",
  "description": "Three runs over our new gravel-shed layout",
  "yard_image_path": "/yard-xyz.png",
  "metadata": { "uploader": "ops@yard-xyz.example" },
  "runs": [
    {
      "run_id": "01_baseline",
      "label":  "Baseline",
      "description": "Today's typical order load",
      "simulated_at": "2026-03-15T10:30:00Z",
      "export": { /* full SimulationExportData here */ }
    }
  ]
}
```

The smallest possible body (one truck, one run) is in
[../../specifications/examples/yard_logistics/01_create_simulation.minimal.json](../../specifications/examples/yard_logistics/01_create_simulation.minimal.json) —
~150 lines, readable end-to-end.

---

## 7. Glossary

**Bottleneck.** An entity where multiple trucks were simultaneously
present even though the entity only serves one at a time
(`max_concurrent > max_occupancy`, so `queue_score > 1.0`). The
**Top bottlenecks** card ranks the top 5 across all serving entities;
Streets and Crossings are excluded because they're transient and not
actionable.

**`(off-yard waiting)`.** A *synthetic* bottleneck — not a real
entity. It surfaces when the simulator emits `Action: "Waiting"` with
empty `Location` (a truck queued outside the yard because the CheckIn
terminal was busy). Its type is `ExternalWait` and it gets a violet
hourglass icon to distinguish it visually. Addressing it means CheckIn
capacity or order pacing, not "expanding the gate".

**Case.** A yard simulation set — one yard, one or more simulator runs
over it. Stored in `yard_simulations` with a unique `case_id` (UUID, or
the fixed `yard-sample-001` for the seeded demo).

**Run.** One simulator execution — one specific order list ran against
the yard. Stored in `yard_runs` keyed by `(case_id, run_id)`.

**Proposal.** An AI- or human-authored suggested change to the yard
configuration or order schedule. Stored in `yard_proposals`. Each
proposal has a typed `changes[]` array (capacity / stagger_orders /
reroute / add_entity) so the future *forward to simulator* endpoint
can translate it into concrete mutations.

**queue_score.** `max_concurrent / max_occupancy`. ≥1.0 means the
entity was at or above capacity at some moment. The top bottlenecks
list is sorted by this score descending.

**ComparisonInformation hashes.** SHA-256 fingerprints the simulator
attaches to its three input blocks (yard, processes, orders). Equal
hash means identical content. The AI chat uses these to tell the model
*"only Orders changed between Smooth and WaitingProblem"* without
having to diff the JSON.

---

## 8. Where to go next

- **Architecture + design decisions:**
  [../../specifications/yard_logistics/design.md](../../specifications/yard_logistics/design.md) —
  why the schema looks the way it does, what's deferred, the proposed
  partner-side simulator contract.
- **Full API schema:**
  [../../specifications/yard_logistics/specification.yml](../../specifications/yard_logistics/specification.yml) —
  the authoritative OpenAPI 3.1 document.
- **Interactive Swagger:**
  [https://backend.localhost/swagger](https://backend.localhost/swagger)
- **Curl walkthroughs:**
  [../../specifications/examples/yard_logistics/README.md](../../specifications/examples/yard_logistics/README.md)
- **Build log / implementation history:**
  [../../worklog/yard_logistics/yard_logistics_log.md](../../worklog/yard_logistics/yard_logistics_log.md)
- **Partner's own data description:**
  [../../specifications/yard_logistics/_GeneralInfo/](../../specifications/yard_logistics/_GeneralInfo/) —
  the simulator team's native schema files, image, processes.
- **Sister case — kiosk logs:**
  [../logistic_logs/getting_started.md](../logistic_logs/getting_started.md) —
  what happens at the check-in kiosk *before* a truck enters the yard.
