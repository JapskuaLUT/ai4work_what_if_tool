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

3. \*_Install all packages + build the docker images_

First, you need to install the local packages and then build the actual docker images.
The development has been done using `bun.sh` but `node.js` should work as well. (Notice the docker builds itself using bun.sh)

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

6. **Access the application:**
    - Frontend: https://app.localhost
    - Backend API: https://backend.localhost
    - Swagger Docs: https://backend.localhost/swagger
    - Traefik Dashboard: https://traefik.localhost

**✅ That's it! Database is automatically initialized with schema and sample data.**

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

### Backend Tests

```bash
cd backend
bun test
```

### Test Educational Stress API

```bash
cd backend
curl -X POST https://backend.localhost/api/simulations/education/ \
  -H "Content-Type: application/json" \
  -d @test_simulation_realistic.json
```

---

## 📚 Documentation

-   **Project Overview:** [CLAUDE.md](CLAUDE.md) - Comprehensive project guide
-   **Database Setup:** [backend/DATABASE_SIMPLE_SETUP.md](backend/DATABASE_SIMPLE_SETUP.md) - Database management guide
-   **API Documentation:** https://backend.localhost/swagger - Interactive API docs
-   **Educational Stress:** [instructions/stress_simulation_instructions.md](instructions/stress_simulation_instructions.md)

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

**Find and kill process:**

```bash
lsof -i :8000  # Backend
lsof -i :5432  # PostgreSQL
kill -9 <PID>
```

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
bun run dev:migrate  # Runs migrations then starts server
```

### Frontend

```bash
cd ui
bun install
bun run dev
```

### Database

You still need PostgreSQL running (via Docker or locally).

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

# Run a one-off script inside the backend (e.g. seed yard sample data)
docker-compose exec backend bun run seed:yard
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
    cd backend
    curl -X POST https://backend.localhost/api/simulations/education/ \
      -H "Content-Type: application/json" \
      -d @test_simulation_realistic.json
    ```

---

**Last Updated:** 2025-01-13
**For detailed information, see [CLAUDE.md](CLAUDE.md)**
