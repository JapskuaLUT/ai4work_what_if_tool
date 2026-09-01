-- AI4Work What-If Tool - Complete Database Schema
-- This file contains all tables needed for the application
-- PostgreSQL will automatically run this on first startup (docker-entrypoint-initdb.d)

-- Table: simulation_sets
-- Stores main information about a simulation set
CREATE TABLE simulation_sets (
    case_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table: scenarios
-- Stores scenario details including course information (legacy simulations)
CREATE TABLE scenarios (
    scenario_id INTEGER NOT NULL,
    case_id TEXT NOT NULL,
    description TEXT,

    -- Course Info
    course_name TEXT NOT NULL,
    course_id TEXT,
    teaching_total_hours INTEGER NOT NULL,
    teaching_days TEXT[],
    teaching_time TEXT,
    lab_total_hours INTEGER NOT NULL,
    lab_days TEXT[],
    lab_time TEXT,
    ects INTEGER NOT NULL,
    topic_difficulty INTEGER NOT NULL,
    prerequisites BOOLEAN DEFAULT FALSE NOT NULL,
    weekly_homework_hours INTEGER NOT NULL,
    total_weeks INTEGER NOT NULL,
    attendance_method TEXT NOT NULL,
    success_rate_percent NUMERIC(5, 2) NOT NULL,
    average_grade NUMERIC(3, 2) NOT NULL,
    student_count INTEGER NOT NULL,

    -- Current Status
    current_week INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

    PRIMARY KEY (case_id, scenario_id),
    FOREIGN KEY (case_id) REFERENCES simulation_sets(case_id) ON DELETE CASCADE
);

-- Table: assignments
-- Stores assignment details for each scenario
CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    case_id TEXT NOT NULL,
    scenario_id INTEGER NOT NULL,
    assignment_number INTEGER NOT NULL,
    start_week INTEGER,
    end_week INTEGER NOT NULL,
    hours_per_week INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,

    FOREIGN KEY (case_id, scenario_id) REFERENCES scenarios(case_id, scenario_id) ON DELETE CASCADE,
    CONSTRAINT case_scenario_assignment_unique UNIQUE(case_id, scenario_id, assignment_number)
);

-- Table: stress_metrics
-- Stores output stress metrics for each scenario
CREATE TABLE stress_metrics (
    stress_metric_id SERIAL PRIMARY KEY,
    case_id TEXT NOT NULL,
    scenario_id INTEGER NOT NULL,
    current_week_average NUMERIC(4, 2),
    current_week_maximum NUMERIC(4, 2),
    predicted_next_week_average NUMERIC(4, 2),
    predicted_next_week_maximum NUMERIC(4, 2),
    calculated_at TIMESTAMP DEFAULT NOW() NOT NULL,

    FOREIGN KEY (case_id, scenario_id) REFERENCES scenarios(case_id, scenario_id) ON DELETE CASCADE
);

-- Table: educational_simulations
-- Stores educational stress simulations with full course analysis input
CREATE TABLE educational_simulations (
    case_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    course_info JSONB NOT NULL,
    assignment_weeks JSONB NOT NULL,
    current_status JSONB NOT NULL,
    optimization_request JSONB NOT NULL,
    students JSONB,
    metadata JSONB NOT NULL,
    selected_adjustment_id TEXT,
    selected_at TIMESTAMP,

    -- course_stress_prediction v1.0 fields. The domain objects are what make
    -- assignment/exam what-if adjustments possible: exam side effects and
    -- assignment distributions are derived from these on every rebuild.
    course_assignments JSONB,
    course_exams JSONB,
    baseline_schedule JSONB,
    observed_stress JSONB,
    -- The versioned model block this case was computed with. Cases predating
    -- v1.0 carry {"version": "legacy-0"} and are rendered by the old calculator.
    stress_model JSONB,

    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table: adjustment_scenarios
-- Stores both engine-generated optimization scenarios and user-authored
-- what-if scenarios. Both flow through the same simulation engine and share
-- one output shape, so they share one table; `origin` tells them apart.
CREATE TABLE adjustment_scenarios (
    id SERIAL PRIMARY KEY,
    case_id TEXT NOT NULL,
    adjustment_id TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'generated',
    name TEXT,
    description TEXT,
    week_schedules JSONB NOT NULL,
    assignment_weeks JSONB,
    extensions_applied JSONB,
    summary_metrics JSONB,

    -- Audit trail (§11): what was requested, what happened to each request,
    -- where redistributed hours went, and the baseline/simulation comparison.
    adjustments JSONB,
    adjustment_outcomes JSONB,
    redistribution_flows JSONB,
    comparison JSONB,
    warnings JSONB,
    stress_model_version TEXT,

    created_at TIMESTAMP DEFAULT NOW() NOT NULL,

    FOREIGN KEY (case_id) REFERENCES educational_simulations(case_id) ON DELETE CASCADE,
    CONSTRAINT case_adjustment_unique UNIQUE(case_id, adjustment_id),
    CONSTRAINT adjustment_scenarios_origin_check CHECK (origin IN ('generated', 'user'))
);

CREATE INDEX idx_adjustment_scenarios_case_origin
    ON adjustment_scenarios(case_id, origin);

-- Table: yard_simulations
-- Parent record for a yard logistics comparison set (one yard, many simulator runs).
-- Fed by JSON drops today; the same shape will receive simulator-API webhooks later.
CREATE TABLE yard_simulations (
    case_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,

    -- Yard graph + processes are usually shared across runs in a set.
    -- Stored once at parent level when all runs share the same hash;
    -- a run that diverges carries its own copy in yard_runs.
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

-- Table: yard_runs
-- One simulator run / scenario inside a yard_simulations set.
CREATE TABLE yard_runs (
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

-- Table: yard_proposals
-- AI-generated or human-authored improvement proposals against a yard
-- simulation set. Each proposal targets a specific run (the "before" state)
-- and lists structured changes that will eventually be forwarded to the
-- simulator API for re-evaluation.
CREATE TABLE yard_proposals (
    id SERIAL PRIMARY KEY,
    case_id TEXT NOT NULL,
    target_run_id TEXT,                       -- which run is the "before"; nullable
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    target_bottleneck TEXT,                   -- entity name addressed (e.g. "B010")
    changes JSONB NOT NULL,                   -- typed change list (capacity / stagger / reroute / add_entity)
    expected_impact TEXT,
    risks TEXT,
    source TEXT NOT NULL DEFAULT 'ai',        -- "ai" | "manual"
    sent_to_simulator_at TIMESTAMP,           -- populated when forwarded later
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

    FOREIGN KEY (case_id) REFERENCES yard_simulations(case_id) ON DELETE CASCADE,
    CHECK (source IN ('ai', 'manual'))
);

-- Table: log_cases
-- Parent record for a kiosk-log ingest batch. Carries pre-computed
-- summary metrics for cheap reads; raw rows live in log_rows.
CREATE TABLE log_cases (
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

-- Table: log_rows
-- Flat fact table — one row per kiosk Start/End event. Sessions are
-- reconstructed at read time by grouping on (case_id, process).
CREATE TABLE log_rows (
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

-- Indexes for performance
CREATE INDEX idx_simulation_sets_kind ON simulation_sets(kind);
CREATE INDEX idx_simulation_sets_name ON simulation_sets(name);
CREATE INDEX idx_scenarios_course_name ON scenarios(course_name);
CREATE INDEX idx_scenarios_course_id ON scenarios(course_id);
CREATE INDEX idx_scenarios_current_week ON scenarios(current_week);
CREATE INDEX idx_assignments_weeks ON assignments(start_week, end_week);
CREATE INDEX idx_stress_metrics_calculated_at ON stress_metrics(calculated_at);
CREATE INDEX idx_stress_metrics_scenario ON stress_metrics(case_id, scenario_id);
CREATE INDEX idx_yard_simulations_name ON yard_simulations(name);
CREATE INDEX idx_yard_runs_case ON yard_runs(case_id);
CREATE INDEX idx_yard_proposals_case ON yard_proposals(case_id);
CREATE INDEX idx_yard_proposals_target_run ON yard_proposals(case_id, target_run_id);
CREATE INDEX idx_log_cases_location ON log_cases(location);
CREATE INDEX idx_log_rows_case_proc ON log_rows(case_id, process, date);
CREATE INDEX idx_log_rows_case_step ON log_rows(case_id, procstepinfo);
CREATE INDEX idx_log_rows_case_date ON log_rows(case_id, date);

-- Triggers for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_simulation_sets_updated_at
    BEFORE UPDATE ON simulation_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at
    BEFORE UPDATE ON scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_educational_simulations_updated_at
    BEFORE UPDATE ON educational_simulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_yard_simulations_updated_at
    BEFORE UPDATE ON yard_simulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_yard_proposals_updated_at
    BEFORE UPDATE ON yard_proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_log_cases_updated_at
    BEFORE UPDATE ON log_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
