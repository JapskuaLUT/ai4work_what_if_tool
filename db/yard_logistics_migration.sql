-- Yard Logistics — additive migration.
-- Idempotent: safe to re-run. Applied via:
--   docker-compose exec -T postgres psql -U whatifuser -d whatifdatabase \
--       < db/yard_logistics_migration.sql
--
-- Owns the same definitions as the corresponding section in db/schema.sql;
-- on a fresh database those definitions run automatically and this file is
-- not needed.

CREATE TABLE IF NOT EXISTS yard_simulations (
    case_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    yard_structure JSONB,
    processes JSONB,
    yard_hash TEXT,
    processes_hash TEXT,
    yard_image_path TEXT,
    selected_run_id TEXT,
    selected_at TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS yard_runs (
    id SERIAL PRIMARY KEY,
    case_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    orders JSONB NOT NULL,
    measurements JSONB NOT NULL,
    yard_structure JSONB,
    processes JSONB,
    yard_hash TEXT,
    processes_hash TEXT,
    orders_hash TEXT,
    summary_metrics JSONB NOT NULL,
    simulated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    FOREIGN KEY (case_id) REFERENCES yard_simulations(case_id) ON DELETE CASCADE,
    CONSTRAINT yard_run_unique UNIQUE(case_id, run_id)
);

CREATE INDEX IF NOT EXISTS idx_yard_simulations_name ON yard_simulations(name);
CREATE INDEX IF NOT EXISTS idx_yard_runs_case ON yard_runs(case_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_yard_simulations_updated_at'
    ) THEN
        CREATE TRIGGER update_yard_simulations_updated_at
            BEFORE UPDATE ON yard_simulations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
