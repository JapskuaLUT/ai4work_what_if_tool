-- db/education_stress_v1_migration.sql
--
-- Adds the columns needed by the `course_stress_prediction` v1.0 model and the
-- user-authored what-if scenario flow. See
-- specifications/education_stress/design.md.
--
-- Idempotent: safe to run against an existing database more than once.
-- A fresh database picks this up from db/schema.sql instead.
--
-- Apply with:
--   docker-compose exec -T postgres psql -U whatifuser -d whatifdatabase \
--       < db/education_stress_v1_migration.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- educational_simulations: carry the course domain objects, the baseline
-- schedule, observed stress and the model version each case was computed with.
-- ---------------------------------------------------------------------------

ALTER TABLE educational_simulations
    ADD COLUMN IF NOT EXISTS course_assignments JSONB,
    ADD COLUMN IF NOT EXISTS course_exams       JSONB,
    ADD COLUMN IF NOT EXISTS baseline_schedule  JSONB,
    ADD COLUMN IF NOT EXISTS observed_stress    JSONB,
    ADD COLUMN IF NOT EXISTS stress_model       JSONB;

-- Rows created before this migration were computed with the previous
-- (unversioned) calculator. Tag them so they are never silently reinterpreted
-- under the new model.
UPDATE educational_simulations
SET stress_model = '{"name": "legacy", "version": "legacy-0"}'::jsonb
WHERE stress_model IS NULL;

-- ---------------------------------------------------------------------------
-- adjustment_scenarios: generated and user-authored scenarios now share one
-- output shape, so they share this table. `origin` tells them apart.
-- ---------------------------------------------------------------------------

ALTER TABLE adjustment_scenarios
    ADD COLUMN IF NOT EXISTS origin               TEXT NOT NULL DEFAULT 'generated',
    ADD COLUMN IF NOT EXISTS name                 TEXT,
    ADD COLUMN IF NOT EXISTS description          TEXT,
    ADD COLUMN IF NOT EXISTS adjustments          JSONB,
    ADD COLUMN IF NOT EXISTS adjustment_outcomes  JSONB,
    ADD COLUMN IF NOT EXISTS redistribution_flows JSONB,
    ADD COLUMN IF NOT EXISTS comparison           JSONB,
    ADD COLUMN IF NOT EXISTS warnings             JSONB,
    ADD COLUMN IF NOT EXISTS stress_model_version TEXT;

UPDATE adjustment_scenarios
SET stress_model_version = 'legacy-0'
WHERE stress_model_version IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'adjustment_scenarios_origin_check'
    ) THEN
        ALTER TABLE adjustment_scenarios
            ADD CONSTRAINT adjustment_scenarios_origin_check
            CHECK (origin IN ('generated', 'user'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_adjustment_scenarios_case_origin
    ON adjustment_scenarios(case_id, origin);

COMMIT;
