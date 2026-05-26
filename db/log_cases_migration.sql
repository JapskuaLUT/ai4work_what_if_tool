-- Logistic Logs — additive migration.
-- Idempotent: safe to re-run. Apply via:
--   docker-compose exec -T postgres psql -U whatifuser -d whatifdatabase \
--       < db/log_cases_migration.sql
--
-- Mirrors the corresponding sections of db/schema.sql; on a fresh
-- database the schema.sql definitions run automatically and this file
-- is unused.

CREATE TABLE IF NOT EXISTS log_cases (
    case_id              TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    description          TEXT,
    location             TEXT NOT NULL,
    topic                TEXT NOT NULL,
    summary_metrics      JSONB NOT NULL,
    related_yard_case_id TEXT,
    metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at           TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS log_rows (
    id              BIGSERIAL PRIMARY KEY,
    case_id         TEXT NOT NULL,
    source_id       INTEGER NOT NULL,
    date            TIMESTAMP NOT NULL,
    location        TEXT NOT NULL,
    topic           TEXT NOT NULL,
    process         INTEGER NOT NULL,
    proc            INTEGER NOT NULL,
    procstep        INTEGER NOT NULL,
    procsteptype    TEXT NOT NULL,
    procstepinfo    TEXT NOT NULL,
    procstepaction  TEXT NOT NULL,
    message         TEXT,
    value           TEXT,
    FOREIGN KEY (case_id) REFERENCES log_cases(case_id) ON DELETE CASCADE,
    CONSTRAINT log_rows_procsteptype_chk CHECK (procsteptype IN ('PROCESS', 'DIALOG')),
    CONSTRAINT log_rows_procstepaction_chk CHECK (procstepaction IN ('Start', 'End'))
);

CREATE INDEX IF NOT EXISTS idx_log_cases_location ON log_cases(location);
CREATE INDEX IF NOT EXISTS idx_log_rows_case_proc ON log_rows(case_id, process, date);
CREATE INDEX IF NOT EXISTS idx_log_rows_case_step ON log_rows(case_id, procstepinfo);
CREATE INDEX IF NOT EXISTS idx_log_rows_case_date ON log_rows(case_id, date);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_log_cases_updated_at'
    ) THEN
        CREATE TRIGGER update_log_cases_updated_at
            BEFORE UPDATE ON log_cases
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
