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
```

Each subfolder has its own README.

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
