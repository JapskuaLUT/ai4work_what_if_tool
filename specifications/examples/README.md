# API examples

Hand-curated request bodies you can POST to the running What-If Tool to
exercise both halves of the API. Useful for:

- **Partner / consumer integration** — read these to learn the shape;
  send them with `curl` or Postman to see real responses.
- **Manual smoke testing** — quick sanity check that the stack is wired up.
- **Reference data for the automated tests** — the same payloads back the
  integration tests in [backend/src/tests/integration/](../../backend/src/tests/integration/).

## Layout

```
education/        — POST bodies for /api/simulations/education/*
yard_logistics/   — POST bodies for /api/simulations/yard/*
logistic_logs/    — POST bodies for /api/logs/*
```

Each subfolder has its own README.

## Two flavours of example, per domain

For both yard and logs we ship **two** bodies side by side:

- **Minimal synthetic** — tiny hand-built example (≤10 KB). Read it
  end-to-end to learn the shape. Trades realism for brevity.
- **Full realistic** — the actual vendor-supplied demo data wrapped
  into our wire shape. The same content the `bun run seed:yard` and
  `bun run seed:logs` scripts ingest. Drop-in POSTable; partners can
  use it to dry-run our endpoints against the real-world dataset.

| Domain | Minimal | Realistic |
|---|---|---|
| Yard logistics | [yard_logistics/01_create_simulation.minimal.json](yard_logistics/01_create_simulation.minimal.json) (7 KB) | [yard_logistics/05_full_three_runs.json](yard_logistics/05_full_three_runs.json) (897 KB) |
| Kiosk logs | [logistic_logs/01_create_case.json](logistic_logs/01_create_case.json) (3.5 KB) | [logistic_logs/02_full_year_lt010.json](logistic_logs/02_full_year_lt010.json) (1.8 MB) |

Education has only one example because its create endpoint *is* its
realistic example — there's no separate vendor JSON to wrap.

## Running them

Assumes the dev stack is up (`docker-compose up -d`) and reachable at
`https://backend.localhost`. The certs are mkcert-signed, so `curl -k`
is appropriate for local dev.

```sh
# Education: create a simulation, capture the caseId
CASE_ID=$(curl -ksS -X POST https://backend.localhost/api/simulations/education/ \
    -H 'Content-Type: application/json' \
    -d @specifications/examples/education/01_create_simulation.json \
  | jq -r .caseId)
echo "Created education case: $CASE_ID"

# Read it back
curl -ksS https://backend.localhost/api/simulations/education/$CASE_ID | jq .
```

```sh
# Yard: create a simulation set with one run
CASE_ID=$(curl -ksS -X POST https://backend.localhost/api/simulations/yard/ \
    -H 'Content-Type: application/json' \
    -d @specifications/examples/yard_logistics/01_create_simulation.minimal.json \
  | jq -r .caseId)
echo "Created yard case: $CASE_ID"

curl -ksS https://backend.localhost/api/simulations/yard/$CASE_ID | jq '.runs | map({run_id, label})'
```

## Authoritative schemas

The example bodies are illustrative; the canonical contract is the OpenAPI:

- Education: [../specification.yml](../specification.yml)
- Yard: [../yard_logistics/specification.yml](../yard_logistics/specification.yml)
