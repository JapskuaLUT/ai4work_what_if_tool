# Education API examples

Bodies you can POST to `/api/simulations/education/*`.

## Files

| File | POST to | Effect |
|---|---|---|
| `01_create_simulation.json` | `POST /api/simulations/education/` | The **pre-v1.0** payload. Still accepted and up-converted, but it folds assignment work into `homework_hours` and has no exams, so neither can be reconstructed — the response says so in `warnings`. |
| `02_select_adjustment.json`  | `PUT /api/simulations/education/{caseId}/select` | Marks `adjustment_2` as the preferred scenario. |
| `03_create_simulation_v1.json` | `POST /api/simulations/education/` | The **v1.0** payload: dated assignments with hours, an explicit exam, and two weeks of observed stress. Use this one. |
| `04_create_scenario.json` | `POST /api/simulations/education/{caseId}/scenarios` | A what-if against a v1 case: move the exam, extend an assignment, shift homework, cancel a lecture. All four adjustments apply — and the peak still goes up slightly, because moving the exam to the last week lands it on top of the semester's heaviest homework. That is deliberate: it shows the tool reporting a change that did not help (`objective.improved: false`) rather than hiding it. |

## End-to-end walkthrough

```sh
BASE=https://backend.localhost/api/simulations/education

# 1. Create a simulation and capture the caseId
CASE_ID=$(curl -ksS -X POST $BASE/ \
    -H 'Content-Type: application/json' \
    -d @01_create_simulation.json \
  | jq -r .caseId)
echo "caseId: $CASE_ID"

# 2. List all four generated adjustment scenarios
curl -ksS $BASE/$CASE_ID | jq '.week_schedules | map(.adjustment_id)'

# 3. Drill into one scenario
curl -ksS $BASE/$CASE_ID/adjustment_2 | jq '.feasibility_score, .key_changes'

# 4. Select the preferred one
curl -ksS -X PUT $BASE/$CASE_ID/select \
    -H 'Content-Type: application/json' \
    -d @02_select_adjustment.json | jq .

# 5. Read back the selection
curl -ksS $BASE/$CASE_ID/selection | jq .
```

## v1.0 walkthrough

```sh
BASE=https://backend.localhost/api/simulations/education

# 1. Create a case from a course definition
CASE_ID=$(curl -ksS -X POST $BASE/ \
    -H 'Content-Type: application/json' \
    -d @03_create_simulation_v1.json | jq -r .caseId)

# 2. Anything the payload lost, or that disagreed with our rebuild
curl -ksS -X POST $BASE/ -H 'Content-Type: application/json' \
    -d @03_create_simulation_v1.json | jq '.warnings'

# 3. Simulate a what-if
curl -ksS -X POST $BASE/$CASE_ID/scenarios \
    -H 'Content-Type: application/json' \
    -d @04_create_scenario.json > result.json

# 4. Did it help, and what actually happened to each adjustment?
jq '{peak_before: .baseline.summary.peak_stress,
     peak_after: .simulation.summary.peak_stress,
     improved: .objective.improved}' result.json
jq '.adjustment_outcomes[] | {id: .adjustment_id, status, code}' result.json

# 5. The model itself, for parity checks against the main application
curl -ksS $BASE/stress-model | jq .stress_model
```

A 201 does not mean every adjustment applied — read `adjustment_outcomes`.

## Contracts

- Pre-v1.0 endpoints: [../../specification.yml](../../specification.yml)
- v1.0 endpoints: [../../education_stress/specification.yml](../../education_stress/specification.yml)
- Walkthrough: [instructions/education/getting_started.md](../../../instructions/education/getting_started.md)
