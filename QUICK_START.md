# Quick Start Guide

## 🚀 First Time Setup (New Developer)

1. **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd ai4work_what_if_tool
    ```

2. **Generate SSL certificates:**

    ```bash
    # Install mkcert (one-time setup)
    # macOS: brew install mkcert
    # Linux: See https://github.com/FiloSottile/mkcert

    mkcert -install
    mkcert "*.localhost" traefik.localhost ollama.localhost app.localhost backend.localhost postgres.localhost

    mkdir -p traefik/certs
    mv _wildcard.localhost+5.pem traefik/certs/cert.pem
    mv _wildcard.localhost+5-key.pem traefik/certs/key.pem
    chmod 600 traefik/certs/*
    ```

3. **Install all packages + build the Docker images**

    First, you need to install the local packages and then build the actual Docker images.
    The development has been done using [Bun](https://bun.sh) but Node.js should work as well.
    (The Docker build itself uses Bun.)

    ```bash
    ./install_local_packages.sh
    ./build_docker_images.sh
    ```

4. **Start Ollama on the host (required for AI features)**

The dockerised app talks to your host's Ollama through the
`ollama-proxy`. Ollama must already be running on the host **before**
you `docker-compose up`, with both env vars set, or the model dropdown
will show `502 Bad Gateway` + a misleading CORS error.

```bash
# macOS / Linux
OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS='https://app.localhost,https://backend.localhost' ollama serve
```

Quick check that the host process is reachable:

```bash
curl -sS http://localhost:11434/api/tags | head -c 200
```

See [ollama_readme.md](ollama_readme.md) for full background,
troubleshooting, and a LaunchAgent recipe to keep Ollama running
across reboots.

5. **Start the application:**

    ```bash
    docker-compose up -d
    ```

6. **Load the case-specific demo data**

    Postgres auto-runs `db/schema.sql` + `db/seed.sql` on its first
    boot — that populates the legacy *educational stress* case. The
    yard and kiosk-log cases have their own seed scripts because their
    sample data is too large to embed in SQL:

    ```bash
    docker-compose exec backend bun run seed:yard   # 3 simulator runs, ~70 entities
    docker-compose exec backend bun run seed:logs   # 5764 events / 34 sessions
    ```

    After this the **Load Yard Simulation** and **Open Check-in Logs**
    buttons on the home page will work.

7. **Access the application:**
    - Frontend: https://app.localhost
    - Backend API: https://backend.localhost
    - Swagger Docs: https://backend.localhost/swagger
    - Traefik Dashboard: https://traefik.localhost

**✅ That's it!** From here, the [getting-started guides per case](#-documentation)
walk through every panel in the UI.

---

## 🔄 Daily Development Workflow

### Start the application

```bash
docker-compose up -d
```

### View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ui
docker-compose logs -f postgres
```

### Stop the application

```bash
docker-compose down
```

### Restart a service

```bash
docker-compose restart backend
```

---

## 🗄️ Database Management

### Automatic Initialization

Database schema and sample data load automatically on first startup from:

-   [db/schema.sql](db/schema.sql) - All tables, indexes, triggers
-   [db/seed.sql](db/seed.sql) - Sample development data

No manual setup needed!

### Fresh Database Reset

⚠️ **Warning: Deletes all data!**

```bash
docker-compose down
rm -rf postgres_whatif_data/
docker-compose up -d
```

### Database Tools

```bash
# Connect via psql
docker-compose exec postgres psql -U whatifuser -d whatifdatabase
```

> The `drizzle-kit` CLI (and the `db:push` / `db:generate` / `db:studio`
> scripts) was removed — it had been broken for a long time and nothing
> depended on it. Schema is managed via plain SQL — see "Adding or
> changing tables" below.

### Adding or changing tables

The schema lives in two synced files:

-   `db/schema.sql` — canonical SQL, runs once on a **fresh** database.
-   `backend/src/db/schema.ts` — Drizzle definitions used by `db.query.*`
    at runtime.

Workflow:

1. Edit **both** files; keep them aligned.
2. For an **existing** database (your usual dev box), write an idempotent
    migration in `db/<name>_migration.sql` and apply it:
    ```bash
    docker-compose exec -T postgres psql -U whatifuser -d whatifdatabase \
        < db/<name>_migration.sql
    ```
    See [db/yard_logistics_migration.sql](db/yard_logistics_migration.sql)
    for a working example.
3. For a **fresh** database, just blow away the volume and let Postgres
    re-run `db/schema.sql` automatically (see the reset block above).

---

## 🧪 Testing

### Run everything

```bash
cd backend
bun test                  # full suite (unit + HTTP integration)
```

### Just unit tests (no network)

```bash
cd backend
bun run test:unit
```

These cover the pure logic: `stressCalculation`, `optimizationEngine`,
`extensionService` on the education side; `yardAnalyticsService`,
`yardProposalService`, `yardCompare` on the yard side;
`logAnalyticsService` for the kiosk logs.

### Just HTTP integration tests (needs stack running)

```bash
cd backend
bun run test:integration
```

Hits the running backend at `https://backend.localhost` and walks
**all three domains** end-to-end (education, yard, kiosk logs).
Each suite probes `/api/health` first and `describe.skipIf(!reachable)`'s
itself if the stack is down — so the command stays green either way.

### Try the API with curl

Hand-curated request bodies live in
[specifications/examples/](specifications/examples/) with per-domain
READMEs:

```bash
# Education — generates 4 optimisation scenarios server-side
curl -ksS -X POST https://backend.localhost/api/simulations/education/ \
  -H 'Content-Type: application/json' \
  -d @specifications/examples/education/01_create_simulation.json | jq .

# Yard — ingests a tiny synthetic SimulationExportData (1 truck, ~7 KB)
curl -ksS -X POST https://backend.localhost/api/simulations/yard/ \
  -H 'Content-Type: application/json' \
  -d @specifications/examples/yard_logistics/01_create_simulation.minimal.json | jq .

# Kiosk logs — minimal synthetic check-in session (~3.5 KB)
curl -ksS -X POST https://backend.localhost/api/logs/ \
  -H 'Content-Type: application/json' \
  -d @specifications/examples/logistic_logs/01_create_case.json | jq .
```

For **realistic** bodies (full-sized vendor data wrapped in our wire
shape), see [`05_full_three_runs.json`](specifications/examples/yard_logistics/05_full_three_runs.json)
and [`02_full_year_lt010.json`](specifications/examples/logistic_logs/02_full_year_lt010.json) —
same content the seed scripts ingest, ready to POST.

---

## 📚 Documentation

### Getting started by case (start here if you're new)

-   🚚 **Yard logistics:** [instructions/yard_logistics/getting_started.md](instructions/yard_logistics/getting_started.md) — zero-prior-knowledge walkthrough
-   🔑 **Kiosk check-in logs:** [instructions/logistic_logs/getting_started.md](instructions/logistic_logs/getting_started.md) — zero-prior-knowledge walkthrough
-   📊 **Educational stress:** [instructions/stress_simulation_instructions.md](instructions/stress_simulation_instructions.md)

### Reference (for partner integrations + developers)

-   **Project overview:** [CLAUDE.md](CLAUDE.md) — comprehensive project guide
-   **Database setup:** [backend/DATABASE_SIMPLE_SETUP.md](backend/DATABASE_SIMPLE_SETUP.md)
-   **Interactive API docs:** https://backend.localhost/swagger — auto-generated by Elysia
-   **API request examples:** [specifications/examples/](specifications/examples/) — curl recipes + JSON bodies for every domain
-   **OpenAPI specs:** [specifications/specification.yml](specifications/specification.yml) (education), [specifications/yard_logistics/specification.yml](specifications/yard_logistics/specification.yml), [specifications/logistic_logs/specification.yml](specifications/logistic_logs/specification.yml)
-   **Design docs:** [specifications/yard_logistics/design.md](specifications/yard_logistics/design.md), [specifications/logistic_logs/design.md](specifications/logistic_logs/design.md)

---

## 🐛 Common Issues

### "relation does not exist" error

**Cause:** Database was not properly initialized.

**Solution:**

```bash
docker-compose down
rm -rf postgres_whatif_data/
docker-compose up -d
```

Schema will load automatically on fresh startup.

### Database connection failed

**Check PostgreSQL is running:**

```bash
docker-compose ps postgres
docker-compose logs postgres
```

**Restart if needed:**

```bash
docker-compose restart postgres
docker-compose restart backend
```

### Port already in use

**Find and kill the process holding the port:**

```bash
lsof -i :80    # Traefik (HTTP)
lsof -i :443   # Traefik (HTTPS)
lsof -i :5433  # PostgreSQL (host-side mapping; container uses 5432 internally)
lsof -i :11434 # Ollama (on the host)
kill -9 <PID>
```

> Postgres host port is **5433**, not 5432, to avoid colliding with
> another local Postgres many of us run (`alverion-postgres-local`).
> Inside the Docker network the backend reaches Postgres as
> `postgres:5432` — the remap only affects host-side tooling.

### Frontend not loading

**Check UI service:**

```bash
docker-compose logs ui
docker-compose restart ui
```

---

## 💻 Local Development (Without Docker)

### Backend

```bash
cd backend
bun install
bun run dev          # bun --watch src/index.ts (hot reload)
```

Requires Postgres reachable at `localhost:5433` (or whatever
`DATABASE_URL` you set in `backend/.env`).

### Frontend

```bash
cd ui
bun install
bun run dev
```

### Database

You still need PostgreSQL running (via Docker, locally, or anywhere
the `DATABASE_URL` points). The fastest path is the Dockerised one:
`docker-compose up -d postgres`.

---

## 🔧 Useful Commands

### Docker

```bash
# Rebuild images
docker-compose build

# Rebuild specific service
docker-compose build backend

# Remove all containers and volumes
docker-compose down -v

# View container resource usage
docker stats
```

### Database

```bash
# Connect to database
docker-compose exec postgres psql -U whatifuser -d whatifdatabase

# Backup database
docker-compose exec postgres pg_dump -U whatifuser whatifdatabase > backup.sql

# Restore database
docker-compose exec -T postgres psql -U whatifuser -d whatifdatabase < backup.sql
```

### Backend

```bash
# Shell into backend container
docker-compose exec backend /bin/bash

# Seed scripts — case-specific demo data the SQL seed doesn't cover
docker-compose exec backend bun run seed:yard   # yard logistics demo
docker-compose exec backend bun run seed:logs   # kiosk check-in logs demo

# Recompute server-side analytics for a stored case (logs only today)
curl -ksS -X POST https://backend.localhost/api/logs/lt010-2025-2026/recompute
```

---

## 🎯 Key Concepts

### Hot Reload

-   **Backend:** Code changes reload automatically (via `bun --watch`)
-   **Frontend:** HMR (Hot Module Replacement) enabled
-   **Database:** Schema changes require editing **both** `db/schema.sql`
    and `backend/src/db/schema.ts`, then either resetting the DB volume
    (fresh boot reads `schema.sql`) or applying an SQL migration via
    `psql`. See "Adding or changing tables" above.

### Database Initialization

On the **first** Postgres startup the volume is empty, so Postgres'
`docker-entrypoint-initdb.d` automatically runs:

1. `db/schema.sql` — creates all tables, indexes, triggers
2. `db/seed.sql` — inserts sample data

After that the volume persists. To re-run them, delete
`postgres_whatif_data/` and `docker-compose up -d` again.

> An older auto-migration script (`backend/scripts/migrate-and-start.sh`)
> existed in this repo but was never wired up — `docker-compose` runs
> `bun dev` directly. It and the broken `drizzle-kit` CLI config were
> removed during the yard-logistics work. If we want auto-migrations back
> later, see the note in [CLAUDE.md](CLAUDE.md) under "Database schema
> workflow".

### Network Architecture

All services use the same Docker network (`what_if_network`), allowing:

-   Backend → Database communication
-   Traefik → All services routing
-   Isolated from host network (security)

---

## 🆘 Getting Help

1. **Check logs first:**

    ```bash
    docker-compose logs -f
    ```

2. **Read documentation:**

    - Database issues → [backend/DATABASE_SETUP.md](backend/DATABASE_SETUP.md)
    - Project questions → [CLAUDE.md](CLAUDE.md)

3. **Verify services are running:**

    ```bash
    docker-compose ps
    ```

4. **Test with known-good data:**
    ```bash
    curl -ksS -X POST https://backend.localhost/api/simulations/education/ \
      -H 'Content-Type: application/json' \
      -d @specifications/examples/education/01_create_simulation.json | jq .
    ```

---

**For detailed information, see [CLAUDE.md](CLAUDE.md). For a
case-by-case walkthrough, see the guides under [instructions/](instructions/).**
