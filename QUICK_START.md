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

4. **Start the ollama**

Check the `ollama_readme.md` for more.

```bash
# OSX
`OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS='https://app.localhost,https://backend.localhost' ollama serve`
```

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
cd backend

# Open database GUI
bun run db:studio

# Connect via psql
docker-compose exec postgres psql -U whatifuser -d whatifdatabase
```

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
# Execute command in backend container
docker-compose exec backend bun run db:push

# Shell into backend container
docker-compose exec backend /bin/bash
```

---

## 🎯 Key Concepts

### Hot Reload

-   **Backend:** Code changes reload automatically (via `bun --watch`)
-   **Frontend:** HMR (Hot Module Replacement) enabled
-   **Database:** Schema changes require running `bun run db:generate` then restart

### Automatic Migrations

When backend starts:

1. Waits for PostgreSQL health check
2. Runs `bunx drizzle-kit push:pg`
3. Applies any pending migrations
4. Starts server

This ensures:

-   ✅ Fresh clones work immediately
-   ✅ Team members always have latest schema
-   ✅ No "relation does not exist" errors

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
