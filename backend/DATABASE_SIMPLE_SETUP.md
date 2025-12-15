# Database Setup (Simple Approach)

## Overview

This project uses PostgreSQL's built-in initialization system (`docker-entrypoint-initdb.d`) to automatically create and seed the database on first startup. **No migration tools needed!**

## How It Works

### 🎯 The Simple Approach

```
PostgreSQL Container First Startup:
1. PostgreSQL image starts
2. Detects empty database (/var/lib/postgresql/data)
3. Automatically runs scripts in /docker-entrypoint-initdb.d/:
   - 01-schema.sql → Creates all tables
   - 02-seed.sql   → Inserts sample data
4. Database is ready!
```

**Files:**

-   [/db/schema.sql](../db/schema.sql) - Complete database schema (all tables, indexes, triggers)
-   [/db/seed.sql](../db/seed.sql) - Sample data for development

**Configuration:** [docker-compose.yml](../docker-compose.yml) lines 70-73

```yaml
volumes:
    - ./postgres_whatif_data:/var/lib/postgresql/data
    - ./db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    - ./db/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
```

## 🚀 Getting Started

### First Time Setup

```bash
git clone <repository-url>
cd ai4work_what_if_tool
docker-compose up -d
```

That's it! ✅ Database is automatically initialized.

### Fresh Database Reset

```bash
# Stop services
docker-compose down

# Delete database volume (⚠️ deletes all data!)
rm -rf postgres_whatif_data/

# Start fresh (schema & seed run automatically)
docker-compose up -d
```

## 📝 Modifying the Schema

### When You Add/Change Tables

1. **Update Drizzle Schema** (source of truth):

    ```bash
    vim backend/src/db/schema.ts
    ```

2. **Generate SQL** from Drizzle schema:

    ```bash
    cd backend
    bunx drizzle-kit generate:pg
    ```

3. **Update db/schema.sql** manually:

    - Copy relevant CREATE TABLE statements from `drizzle/NNNN_*.sql`
    - Add to [/db/schema.sql](../db/schema.sql)
    - Keep it clean and well-organized

4. **Test the schema**:

    ```bash
    docker-compose down
    rm -rf postgres_whatif_data/
    docker-compose up -d

    # Verify tables exist
    docker-compose exec postgres psql -U whatifuser -d whatifdatabase -c "\dt"
    ```

5. **Commit changes**:
    ```bash
    git add backend/src/db/schema.ts db/schema.sql
    git commit -m "feat(db): add new_table"
    ```

## 🗄️ Database Management

### Connect to Database

```bash
docker-compose exec postgres psql -U whatifuser -d whatifdatabase
```

**Common queries:**

```sql
-- List all tables
\dt

-- Describe table structure
\d educational_simulations

-- Count records
SELECT COUNT(*) FROM educational_simulations;

-- Exit
\q
```

### View Database in GUI

Use **Drizzle Studio**:

```bash
cd backend
bun run db:studio
```

Opens at: http://localhost:4983

### Backup & Restore

**Backup:**

```bash
docker-compose exec postgres pg_dump -U whatifuser whatifdatabase > backup_$(date +%Y%m%d).sql
```

**Restore:**

```bash
cat backup_20250113.sql | docker-compose exec -T postgres psql -U whatifuser -d whatifdatabase
```

## 🔧 Configuration Files

### Source of Truth: backend/src/db/schema.ts

This is the **authoritative schema definition** using Drizzle ORM:

```typescript
export const educational_simulations = pgTable("educational_simulations", {
    case_id: text("case_id").primaryKey(),
    name: text("name").notNull(),
    course_info: jsonb("course_info").notNull()
    // ...
});
```

**Why Drizzle schema is source of truth:**

-   Type-safe queries in TypeScript
-   Automatic type inference
-   Runtime validation
-   Better developer experience

### Deployment Schema: db/schema.sql

This is the **deployment version** in pure SQL:

```sql
CREATE TABLE educational_simulations (
    case_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    course_info JSONB NOT NULL,
    -- ...
);
```

**Why SQL version exists:**

-   PostgreSQL's native initialization format
-   No external tools needed
-   Simple, reliable, portable
-   Perfect for development & fresh deployments

### Workflow

```
1. Modify: backend/src/db/schema.ts (TypeScript)
2. Generate: bunx drizzle-kit generate:pg (creates SQL)
3. Update: db/schema.sql (manually copy from generated SQL)
4. Test: Fresh database reset
5. Commit: Both files together
```

## 📊 Current Tables

### Legacy Simulations (coursework scenarios)

-   **simulation_sets** - Main simulation containers
-   **scenarios** - Individual scenarios with course details
-   **assignments** - Assignment schedules per scenario
-   **stress_metrics** - Calculated stress values

### Educational Stress (new system)

-   **educational_simulations** - Complete course analysis input
-   **adjustment_scenarios** - Optimization scenarios (4 per simulation)

## 🔄 Schema Update Example

**Scenario:** Add `priority` field to educational_simulations

**Step 1:** Update Drizzle schema

```typescript
// backend/src/db/schema.ts
export const educational_simulations = pgTable("educational_simulations", {
    case_id: text("case_id").primaryKey(),
    name: text("name").notNull(),
    priority: integer("priority").default(1).notNull() // NEW!
    // ... rest of fields
});
```

**Step 2:** Generate migration

```bash
cd backend
bunx drizzle-kit generate:pg
```

**Step 3:** Update db/schema.sql

```sql
-- db/schema.sql
CREATE TABLE educational_simulations (
    case_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    priority INTEGER DEFAULT 1 NOT NULL, -- NEW!
    -- ... rest of fields
);
```

**Step 4:** Test

```bash
docker-compose down
rm -rf postgres_whatif_data/
docker-compose up -d

docker-compose exec postgres psql -U whatifuser -d whatifdatabase -c "\d educational_simulations"
```

**Step 5:** Commit

```bash
git add backend/src/db/schema.ts db/schema.sql
git commit -m "feat(db): add priority field to educational_simulations"
```

## ❓ FAQ

### Q: Do I need to run migrations?

**A: No!** In development, just delete `postgres_whatif_data/` and restart. PostgreSQL auto-initializes from schema.sql.

### Q: What if I pull changes with schema updates?

**A: Two options:**

**Option 1 (Simple):** Fresh reset

```bash
docker-compose down
rm -rf postgres_whatif_data/
docker-compose up -d
```

**Option 2 (Keep data):** Manual ALTER

```bash
# Check what changed in db/schema.sql
git diff db/schema.sql

# Apply changes manually
docker-compose exec postgres psql -U whatifuser -d whatifdatabase
whatifdatabase=# ALTER TABLE educational_simulations ADD COLUMN priority INTEGER DEFAULT 1 NOT NULL;
```

### Q: When do I need Drizzle Kit?

**A:** Only for:

-   Generating SQL from TypeScript schema changes
-   Using Drizzle Studio GUI
-   Production migrations (future)

### Q: What about production deployments?

**A:** For production, you'll want proper migrations with:

-   Version tracking
-   Rollback capability
-   Zero-downtime updates

But for now (development/demo), the simple approach works perfectly!

### Q: Why not just use Drizzle migrations?

**A:** The simple approach is:

-   ✅ Easier to understand
-   ✅ No migration tool needed in Docker
-   ✅ PostgreSQL handles it natively
-   ✅ Perfect for development
-   ✅ Easy to reset
-   ✅ One source of truth (schema.sql is visible)

For production, we can add proper migrations later.

## 🎯 Best Practices

1. **Always update both files together:**

    - `backend/src/db/schema.ts` (TypeScript definition)
    - `db/schema.sql` (SQL deployment)

2. **Test schema changes locally first:**

    ```bash
    docker-compose down
    rm -rf postgres_whatif_data/
    docker-compose up -d
    ```

3. **Keep schema.sql clean and readable:**

    - Add comments
    - Group related tables
    - Consistent formatting

4. **Use meaningful table and column names:**

    - `educational_simulations` not `ed_sims`
    - `case_id` not `cid`

5. **Always add indexes for foreign keys:**
    ```sql
    CREATE INDEX idx_scenarios_case_id ON scenarios(case_id);
    ```

## 📚 Additional Resources

-   **PostgreSQL Init**: https://hub.docker.com/_/postgres (see "Initialization scripts")
-   **Drizzle ORM**: https://orm.drizzle.team/
-   **Project Overview**: [../CLAUDE.md](../CLAUDE.md)

---

**Last Updated:** 2025-12-09
**Maintained By:** AI4Work Team
