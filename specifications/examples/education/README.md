# Education API examples

Bodies you can POST to `/api/simulations/education/*`.

## Files

| File | POST to | Effect |
|---|---|---|
| `01_create_simulation.json` | `POST /api/simulations/education/` | Creates a "Full-Stack Web Development" course with 3 assignments. The backend runs the optimisation engine and returns 4 adjustment scenarios. |
| `02_select_adjustment.json`  | `PUT /api/simulations/education/{caseId}/select` | Marks `adjustment_2` as the preferred scenario. |

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

The full contract for every endpoint is in
[../../specification.yml](../../specification.yml).
