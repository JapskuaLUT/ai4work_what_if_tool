# Kiosk-log API examples

Bodies you can POST to `/api/logs/*`.

## Files

| File | Size | POST to | Effect |
|---|---:|---|---|
| `01_create_case.json` | 3.5 KB | `POST /api/logs/` | Tiny **synthetic** case — 1 driver session, 9 raw rows (idle sentinel + a full SPRACHAUSWAHL → EINGABE KENNZEICHEN → ANZEIGE SCHLUSSBILD flow). Short enough to read in full. Best for understanding the shape. |
| `02_full_year_lt010.json` | 1.8 MB | `POST /api/logs/` | **Realistic** body — the full vendor-supplied year of LT 010 events wrapped into one POST (5764 rows / 34 sessions). Same content the `bun run seed:logs` script ingests; partners can drop this straight onto our endpoint. |

The realistic body (`02_full_year_lt010.json`) is auto-generated from
[../../logistic_logs/logdata_aggregated.data.json](../../logistic_logs/logdata_aggregated.data.json).
If that vendor file is refreshed, regenerate by running the snippet in
this folder's git history (or just `bun run seed:logs` directly, which
produces the same data straight into Postgres under case id
`lt010-2025-2026`).

## End-to-end walkthrough

```sh
BASE=https://backend.localhost/api/logs

# 1. Create the case.
#    Use 01_create_case.json for a 9-row synthetic example,
#    or 02_full_year_lt010.json for the full realistic dataset (~1.8 MB).
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
