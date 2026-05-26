# Yard logistics API examples

Bodies you can POST / PUT to `/api/simulations/yard/*`.

## Files

| File | POST/PUT to | Effect |
|---|---|---|
| `01_create_simulation.minimal.json` | `POST /api/simulations/yard/` | Creates a tiny synthetic yard (1 terminal, 1 parking, 1 silo, 1 truck) and one simulator run. ~150 lines — short enough to read end-to-end. |
| `02_add_run.json`                    | `POST /api/simulations/yard/{caseId}/runs` | Adds a second run to an existing case (same yard, different truck). |
| `03_create_proposal.json`            | `POST /api/simulations/yard/{caseId}/proposals` | Saves a manual proposal with two changes (capacity bump + stagger orders). |
| `04_select_run.json`                 | `PUT /api/simulations/yard/{caseId}/select` | Marks the run as the preferred one. |

For a **realistic** dataset, use the seeded sample at
`/yard/yard-sample-001` (created by `bun run seed:yard`) — three runs
over a 70-entity yard with the full WaitingProblem dynamics. The raw
simulator JSON for those runs is in
[../../yard_logistics/Results/](../../yard_logistics/Results/).

## End-to-end walkthrough

```sh
BASE=https://backend.localhost/api/simulations/yard

# 1. Create the case and capture the caseId
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
