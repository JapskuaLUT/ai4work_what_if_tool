# What-If Tool

This repository contains the source code for the What-If Tool, a web
application for comparing alternative scenarios across three analysis
domains:

-   **Educational course planning** — model student stress under
    different course schedules, generate optimisation scenarios
    server-side, pick the best one. See
    [specifications/specification.yml](specifications/specification.yml).
-   **Yard logistics** — ingest truck-yard simulator outputs from a
    partner-owned simulator, surface KPIs and bottlenecks, let
    planners author improvement proposals (AI- or human-authored) and
    discuss them with a local LLM. See
    [specifications/yard_logistics/design.md](specifications/yard_logistics/design.md)
    and
    [specifications/yard_logistics/specification.yml](specifications/yard_logistics/specification.yml).
-   **Kiosk check-in logs** — process-mining over raw self-service
    check-in terminal logs (LT 010 today). Reconstruct driver
    sessions, see per-phase time breakdown, ask an AI assistant about
    the kiosk experience. See
    [specifications/logistic_logs/design.md](specifications/logistic_logs/design.md)
    and
    [specifications/logistic_logs/specification.yml](specifications/logistic_logs/specification.yml).

All three domains share a Bun + Elysia backend, Postgres + Drizzle ORM
(runtime queries only — schema is managed via plain SQL), a
React/Vite UI, and a dockerised Ollama-proxy that connects to a host
Ollama process for AI features. The whole stack is orchestrated with
Docker Compose behind mkcert-signed Traefik.

For request-body examples and curl recipes, see
[specifications/examples/](specifications/examples/).

## Getting started by case

The fastest way to learn a domain is a self-contained walkthrough. Each
guide below assumes zero prior knowledge — what the case is, how to
boot it, what every UI panel does, how to send your own data, and a
data-format reference.

- 🚚 **[Yard logistics](instructions/yard_logistics/getting_started.md)** —
  ingest truck-yard simulator runs, surface bottlenecks, generate AI
  improvement proposals, attach a yard image.
- 🔑 **[Kiosk check-in logs](instructions/logistic_logs/getting_started.md)** —
  process-mining over self-service check-in terminals; sessions,
  per-phase breakdown, PII-aware UI.
- 📊 **Educational stress** —
  [instructions/stress_simulation_instructions.md](instructions/stress_simulation_instructions.md)
  (legacy).

## Table of Contents

-   [Architecture](#architecture)
-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
    -   [Running the Application](#running-the-application)
-   [Services](#services)
    -   [UI (Frontend)](#ui-frontend)
    -   [Backend](#backend)
    -   [Database (PostgreSQL)](#database-postgresql)
    -   [Traefik (Reverse Proxy)](#traefik-reverse-proxy)
    -   [Ollama Proxy](#ollama-proxy)
-   [Local Development with Ollama](#local-development-with-ollama)
-   [Database Schema](#database-schema)

## Architecture

The What-If Tool is composed of several services that work together:

-   **UI (Frontend)**: A React application that provides the user interface for interacting with the tool.
-   **Backend**: An Elysia.js application that handles the business logic, data processing, and API for the UI.
-   **Database**: A PostgreSQL database that stores all the simulation data.
-   **Traefik**: A reverse proxy that manages routing and provides SSL for all services.
-   **Ollama Proxy**: An Nginx proxy to connect to a local Ollama instance for AI-powered features.

All services are orchestrated by Docker Compose, making the development environment consistent and easy to manage.

## Getting Started

### Prerequisites

-   [Docker](https://www.docker.com/get-started)
-   [Docker Compose](https://docs.docker.com/compose/install/)
-   [mkcert](https://github.com/FiloSottile/mkcert) for generating trusted local certificates.
-   [Bun](https://bun.sh/) (for local development outside of Docker)
-   [Ollama](https://ollama.com/) — must run on the **host machine**
    (not inside Docker) for the AI features. See
    [ollama_readme.md](ollama_readme.md) for the required env vars and
    troubleshooting.

### Installation

1.  **Clone the repository:**

    ```sh
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install `mkcert` and create a local Certificate Authority (CA):**

    Follow the instructions in the [mkcert documentation](https://github.com/FiloSottile/mkcert) to install it on your system.

    Then, create and install a local CA:

    ```sh
    mkcert -install
    ```

3.  **Generate a wildcard certificate for `*.localhost`:**

    ```sh
    mkcert "*.localhost" traefik.localhost ollama.localhost app.localhost backend.localhost postgres.localhost
    ```

4.  **Move the generated certificate and key to the Traefik directory:**

    ```sh
    mkdir -p traefik/certs
    mv _wildcard.localhost+5.pem traefik/certs/cert.pem
    mv _wildcard.localhost+5-key.pem traefik/certs/key.pem
    ```

    _Note: The exact filenames for the certificate and key may vary. Adjust the command accordingly._

5.  **Set read access for the certificate and key files:**
    ```sh
    chmod 600 traefik/certs/*
    ```

### Running the Application

Once the prerequisites are met, the certificates are in place, and
Ollama is running on the host, start the application:

```sh
docker-compose up -d
```

This builds the Docker images (if they don't exist) and starts all
services in the background.

**Database initialisation.** PostgreSQL runs [db/schema.sql](db/schema.sql)
and [db/seed.sql](db/seed.sql) automatically on first boot. That populates
the legacy *educational stress* case. The two newer cases have their
own seed scripts because their sample data is too large to embed in
SQL — run these once after `docker-compose up -d`:

```sh
docker-compose exec backend bun run seed:yard   # 3 simulator runs over a 70-entity yard
docker-compose exec backend bun run seed:logs   # 5764 events / 34 sessions of kiosk check-ins
```

Access the application at:

-   **UI**: `https://app.localhost`
-   **Backend API**: `https://backend.localhost`
-   **Swagger** (interactive API docs): `https://backend.localhost/swagger`
-   **Traefik Dashboard**: `https://traefik.localhost`

**Need a fresh database?** Delete `postgres_whatif_data/` and restart:
```sh
docker-compose down
rm -rf postgres_whatif_data/
docker-compose up -d
docker-compose exec backend bun run seed:yard   # re-seed the case-specific demo data
docker-compose exec backend bun run seed:logs
```

For detailed information about database management, see
[backend/DATABASE_SIMPLE_SETUP.md](backend/DATABASE_SIMPLE_SETUP.md)
and the "Database schema workflow" section in [CLAUDE.md](CLAUDE.md).

## Services

### UI (Frontend)

-   **Technology**: React, Vite, Bun
-   **URL**: `https://app.localhost`
-   **Source Code**: `/ui`

The UI is the main interface for users. It allows them to create, view, and compare simulation scenarios. It communicates with the backend service to fetch and store data. The local `ui` directory is mounted into the container, which enables live-reloading during development.

### Backend

-   **Technology**: Elysia.js, Drizzle ORM, Bun
-   **URL**: `https://backend.localhost`
-   **Source Code**: `/backend`

The backend service provides a RESTful API for the UI. It's responsible for all business logic, including creating and retrieving simulation sets, and interacting with the PostgreSQL database. It also exposes a Swagger UI for API documentation at `/swagger`.

### Database (PostgreSQL)

-   **Technology**: PostgreSQL
-   **Service Name**: `postgres`
-   **Source Code**: `/db`

The PostgreSQL database stores all the data for the application. The data is persisted in a Docker volume (`postgres_whatif_data`). On the first run, the database is initialized with a schema (`schema.sql`) and populated with seed data (`seed.sql`).

### Traefik (Reverse Proxy)

-   **Technology**: Traefik
-   **Dashboard URL**: `https://traefik.localhost`
-   **Configuration**: `/traefik`

Traefik serves as the reverse proxy for the application. It routes incoming requests to the appropriate service based on the hostname and automatically handles SSL encryption using the `mkcert`-generated certificates.

### Ollama Proxy

-   **Technology**: Nginx
-   **Service Name**: `ollama-proxy`
-   **Configuration**: `/ollama_proxy`

This service is an Nginx proxy that allows the Dockerized services to communicate with an Ollama instance running on the host machine. This is necessary for integrating AI features into the application.

## Local Development with Ollama

The AI features (model dropdown, explanations, chat) call your **host
machine's** Ollama through the dockerised `ollama-proxy`. Ollama must
already be running on the host **before** you open the UI; otherwise
the UI will show `502 Bad Gateway` plus a misleading CORS error.

Start Ollama on the host with both env vars set:

```sh
OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS='https://app.localhost,https://backend.localhost' ollama serve
```

-   `OLLAMA_HOST=0.0.0.0` — bind on all interfaces so the proxy
    container can reach Ollama through the Docker host gateway.
-   `OLLAMA_ORIGINS='https://app.localhost,https://backend.localhost'`
    — Ollama itself adds the `Access-Control-Allow-Origin` header for
    these origins, which is what the browser needs.

Verify with `curl -ksS -H 'Origin: https://app.localhost'
https://ollama.localhost/api/tags` — you should get a JSON `models`
array.

For full background, troubleshooting, and a LaunchAgent recipe to keep
Ollama running across reboots, see [ollama_readme.md](ollama_readme.md).

## Database Schema

Tables live across all three domains:

| Domain | Tables | Notes |
|---|---|---|
| Educational stress (legacy) | `simulation_sets`, `scenarios`, `assignments`, `stress_metrics` | The original coursework simulation set + per-scenario stress metrics. |
| Educational stress (current) | `educational_simulations`, `adjustment_scenarios` | Generative API: server-side `optimizationEngine` produces 4 adjustment scenarios per case. |
| Yard logistics | `yard_simulations`, `yard_runs`, `yard_proposals` | Parent case + N simulator runs + AI/manual improvement proposals. |
| Kiosk check-in logs | `log_cases`, `log_rows` | Parent case + flat fact table of raw kiosk events; sessions reconstructed at read time. |

The canonical schema is the SQL itself —
[db/schema.sql](db/schema.sql) is the single source of truth and runs
on a fresh Postgres boot. The Drizzle definitions used by runtime
queries live in [backend/src/db/schema.ts](backend/src/db/schema.ts);
both files are kept manually in sync.

For per-domain detail (column semantics, indexes, design rationale)
see the design docs:

-   [specifications/yard_logistics/design.md § Data layer](specifications/yard_logistics/design.md)
-   [specifications/logistic_logs/design.md § Data layer](specifications/logistic_logs/design.md)
