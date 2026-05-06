-- Yard Proposals — additive migration.
-- Idempotent: safe to re-run. Apply via:
--   docker-compose exec -T postgres psql -U whatifuser -d whatifdatabase \
--       < db/yard_proposals_migration.sql
--
-- Mirrors the corresponding section of db/schema.sql; on a fresh database
-- the schema.sql definitions run automatically and this file is unused.

CREATE TABLE IF NOT EXISTS yard_proposals (
    id SERIAL PRIMARY KEY,
    case_id TEXT NOT NULL,
    target_run_id TEXT,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    target_bottleneck TEXT,
    changes JSONB NOT NULL,
    expected_impact TEXT,
    risks TEXT,
    source TEXT NOT NULL DEFAULT 'ai',
    sent_to_simulator_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    FOREIGN KEY (case_id) REFERENCES yard_simulations(case_id) ON DELETE CASCADE,
    CONSTRAINT yard_proposals_source_chk CHECK (source IN ('ai', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_yard_proposals_case ON yard_proposals(case_id);
CREATE INDEX IF NOT EXISTS idx_yard_proposals_target_run
    ON yard_proposals(case_id, target_run_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_yard_proposals_updated_at'
    ) THEN
        CREATE TRIGGER update_yard_proposals_updated_at
            BEFORE UPDATE ON yard_proposals
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
