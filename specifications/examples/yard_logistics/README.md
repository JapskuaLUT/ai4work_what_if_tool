# Yard logistics API examples

Bodies you can POST / PUT to `/api/simulations/yard/*`.

## Files

| File | Size | POST/PUT to | Effect |
|---|---:|---|---|
| `01_create_simulation.minimal.json` | 7 KB | `POST /api/simulations/yard/` | Tiny **synthetic** yard (1 terminal, 1 parking, 1 silo, 1 truck) and one simulator run. ~150 lines — short enough to read end-to-end. Best for understanding the shape. |
| `05_full_three_runs.json` | 897 KB | `POST /api/simulations/yard/` | **Realistic** body — all three vendor-supplied Results runs (Smooth / SequencedOk / WaitingProblem) wrapped into one POST. Same content the `bun run seed:yard` script ingests; partners can drop this straight onto our endpoint. |
| `02_add_run.json` | 6 KB | `POST /api/simulations/yard/{caseId}/runs` | Adds a second run to an existing case (same yard, different truck). |
| `03_create_proposal.json` | 1 KB | `POST /api/simulations/yard/{caseId}/proposals` | Saves a manual proposal with two changes (capacity bump + stagger orders). |
| `04_select_run.json` | 0.1 KB | `PUT /api/simulations/yard/{caseId}/select` | Marks the run as the preferred one. |

The realistic body (`05_full_three_runs.json`) is auto-generated from
[../../yard_logistics/Results/](../../yard_logistics/Results/) — the raw
simulator JSONs the partner gave us. If those vendor files are ever
refreshed, regenerate by re-running the snippet in this folder's git
history (or just `bun run seed:yard` directly, which produces the same
data straight into Postgres under case id `yard-sample-001`).

## End-to-end walkthrough

```sh
BASE=https://backend.localhost/api/simulations/yard

# 1. Create the case and capture the caseId.
#    Use 01_create_simulation.minimal.json for a 1-truck synthetic yard,
#    or 05_full_three_runs.json for the full realistic dataset (~1 MB).
CASE_ID=$(curl -ksS -X POST $BASE/ \
    -H 'Content-Type: application/json' \
    -d @01_create_simulation.minimal.json \
  | jq -r .caseId)
echo "caseId: $CASE_ID"

# 2. Look at the overview (1 run, summary metrics)
curl -ksS $BASE/$CASE_ID | jq '{name, runs: (.runs | map({run_id, label, max_wait: .summary_metrics.waiting_seconds.max}))}'

# 3. Add a second run
curl -ksS -X POST $BASE/$CASE_ID/runs \
    -H 'Content-Type: application/json' \
    -d @02_add_run.json | jq .

# 4. Read run-level detail
curl -ksS $BASE/$CASE_ID/minimal_smooth | jq '.summary_metrics.bottlenecks'

# 5. Plot occupancy at one entity (the parking)
curl -ksS "$BASE/$CASE_ID/minimal_smooth/timeline?entity=P010" | jq '.points | length'

# 6. Select the preferred run
curl -ksS -X PUT $BASE/$CASE_ID/select \
    -H 'Content-Type: application/json' \
    -d @04_select_run.json | jq .

# 7. Read the selection back
curl -ksS $BASE/$CASE_ID/selection | jq .

# 8. Save a proposal
PROPOSAL_ID=$(curl -ksS -X POST $BASE/$CASE_ID/proposals \
    -H 'Content-Type: application/json' \
    -d @03_create_proposal.json \
  | jq -r .proposal.id)
echo "proposal id: $PROPOSAL_ID"

# 9. List proposals
curl -ksS $BASE/$CASE_ID/proposals | jq '.proposals | map({id, source, title})'

# 10. Delete it
curl -ksS -X DELETE $BASE/$CASE_ID/proposals/$PROPOSAL_ID | jq .
```

## Forward-to-simulator stub

The contract for `POST /{caseId}/proposals/{id}/run` is defined in the
spec but the route currently returns **503** — see
[../../yard_logistics/design.md §14](../../yard_logistics/design.md)
for what we'll send to the partner when they expose their API.

## Authoritative schema

Every field is documented in
[../../yard_logistics/specification.yml](../../yard_logistics/specification.yml).
The minimal example above is a faithful instance of the
`YardSimulationIngestInput` schema — partners can validate their
real payloads against it.
