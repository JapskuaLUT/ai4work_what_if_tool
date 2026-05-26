# Kiosk-log API examples

Bodies you can POST to `/api/logs/*`.

## Files

| File | POST to | Effect |
|---|---|---|
| `01_create_case.json` | `POST /api/logs/` | Creates a tiny synthetic case (1 driver session, 9 raw rows including the idle sentinel + one full SPRACHAUSWAHL → EINGABE KENNZEICHEN → ANZEIGE SCHLUSSBILD flow). Short enough to read in full. |

For a **realistic** dataset, use the seeded case at `/logs/lt010-2025-2026`
(created by `bun run seed:logs`) — ~5764 rows / 34 sessions of real LT 010
check-in events. The raw vendor JSON for that lives in
[../../logistic_logs/logdata_aggregated.data.json](../../logistic_logs/logdata_aggregated.data.json).

## End-to-end walkthrough

```sh
BASE=https://backend.localhost/api/logs

# 1. Create the case
CASE_ID=$(curl -ksS -X POST $BASE/ \
    -H 'Content-Type: application/json' \
    -d @01_create_case.json \
  | jq -r .caseId)
echo "caseId: $CASE_ID"

# 2. Read the overview + step aggregates
curl -ksS $BASE/$CASE_ID | jq '{
  name, rows: .overview.rowCount, sessions: .overview.sessionCount,
  top_step: (.aggregates | sort_by(-.p50Sec) | .[0])
}'

# 3. List sessions
curl -ksS $BASE/$CASE_ID/sessions | jq '.sessions | map({processId, durationSec, completed})'

# 4. Drill into one session
curl -ksS $BASE/$CASE_ID/sessions/9001 | jq '.session | {durationSec, rows: (.rows | length)}'

# 5. Step aggregates alone (alias for .aggregates on the overview)
curl -ksS $BASE/$CASE_ID/aggregates | jq '.aggregates[0:3]'

# 6. Recompute summary_metrics (after analytics code changes)
curl -ksS -X POST $BASE/$CASE_ID/recompute | jq .

# 7. Delete the case
curl -ksS -X DELETE $BASE/$CASE_ID | jq .
```

## Authoritative schema

Full contract:
[../../logistic_logs/specification.yml](../../logistic_logs/specification.yml).
The example body above is a faithful instance of `LogCaseCreateInput`.
