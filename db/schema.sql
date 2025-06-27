-- This table stores the main information about a simulation set.
CREATE TABLE simulation_sets (
    case_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    kind VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for common queries
CREATE INDEX idx_simulation_sets_kind ON simulation_sets(kind);
CREATE INDEX idx_simulation_sets_name ON simulation_sets(name);

-- This table stores the details for each scenario, including course information.
-- A composite primary key is used to uniquely identify a scenario within a case.
CREATE TABLE scenarios (
    scenario_id INTEGER NOT NULL,
    case_id VARCHAR(255) NOT NULL REFERENCES simulation_sets(case_id) ON DELETE CASCADE,
    description TEXT,
    
    -- Course Info from the 'input' object
    course_name VARCHAR(255) NOT NULL,
    course_id VARCHAR(50),
    teaching_total_hours INTEGER CHECK (teaching_total_hours >= 0),
    teaching_days TEXT[] CHECK (array_length(teaching_days, 1) <= 7), -- Max 7 days
    teaching_time VARCHAR(50),
    lab_total_hours INTEGER CHECK (lab_total_hours >= 0),
    lab_days TEXT[] CHECK (array_length(lab_days, 1) <= 7),
    lab_time VARCHAR(50),
    ects INTEGER CHECK (ects >= 0 AND ects <= 60), -- Reasonable ECTS range
    topic_difficulty INTEGER CHECK (topic_difficulty >= 1 AND topic_difficulty <= 10),
    prerequisites BOOLEAN NOT NULL DEFAULT FALSE,
    weekly_homework_hours INTEGER CHECK (weekly_homework_hours >= 0),
    total_weeks INTEGER CHECK (total_weeks > 0 AND total_weeks <= 52),
    attendance_method VARCHAR(50) CHECK (attendance_method IN ('in_person', 'online', 'hybrid', 'self_paced')),
    success_rate_percent DECIMAL(5, 2) CHECK (success_rate_percent >= 0 AND success_rate_percent <= 100),
    average_grade DECIMAL(3, 2) CHECK (average_grade >= 0 AND average_grade <= 10), -- Assuming 0-10 scale
    student_count INTEGER CHECK (student_count > 0),

    -- Current Status from the 'input' object
    current_week INTEGER CHECK (current_week > 0),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (case_id, scenario_id),
    
    -- Ensure current_week doesn't exceed total_weeks
    CONSTRAINT chk_current_week_valid CHECK (current_week <= total_weeks)
);

-- Indexes for performance
CREATE INDEX idx_scenarios_course_name ON scenarios(course_name);
CREATE INDEX idx_scenarios_course_id ON scenarios(course_id);
CREATE INDEX idx_scenarios_current_week ON scenarios(current_week);

-- This table stores assignment details for each scenario.
CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    case_id VARCHAR(255) NOT NULL,
    scenario_id INTEGER NOT NULL,
    assignment_number INTEGER NOT NULL CHECK (assignment_number > 0),
    start_week INTEGER NOT NULL CHECK (start_week > 0),
    end_week INTEGER NOT NULL CHECK (end_week > 0),
    hours_per_week INTEGER CHECK (hours_per_week >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (case_id, scenario_id) REFERENCES scenarios(case_id, scenario_id) ON DELETE CASCADE,
    
    -- Ensure end_week is after or equal to start_week
    CONSTRAINT chk_week_order CHECK (end_week >= start_week),
    
    -- Unique assignment number per scenario
    UNIQUE (case_id, scenario_id, assignment_number)
);

-- Index for querying assignments by week
CREATE INDEX idx_assignments_weeks ON assignments(start_week, end_week);

-- This table stores the output stress metrics for each scenario.
CREATE TABLE stress_metrics (
    stress_metric_id SERIAL PRIMARY KEY,
    case_id VARCHAR(255) NOT NULL,
    scenario_id INTEGER NOT NULL,
    current_week_average DECIMAL(4, 2) CHECK (current_week_average >= 0),
    current_week_maximum DECIMAL(4, 2) CHECK (current_week_maximum >= 0),
    predicted_next_week_average DECIMAL(4, 2) CHECK (predicted_next_week_average >= 0),
    predicted_next_week_maximum DECIMAL(4, 2) CHECK (predicted_next_week_maximum >= 0),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (case_id, scenario_id) REFERENCES scenarios(case_id, scenario_id) ON DELETE CASCADE,
    
    -- Ensure maximum values are greater than or equal to average values
    CONSTRAINT chk_current_week_max_avg CHECK (current_week_maximum >= current_week_average),
    CONSTRAINT chk_predicted_week_max_avg CHECK (predicted_next_week_maximum >= predicted_next_week_average)
);

-- Index for time-based queries
CREATE INDEX idx_stress_metrics_calculated_at ON stress_metrics(calculated_at);
CREATE INDEX idx_stress_metrics_scenario ON stress_metrics(case_id, scenario_id);

-- Create triggers to automatically update the updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_simulation_sets_updated_at 
    BEFORE UPDATE ON simulation_sets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at 
    BEFORE UPDATE ON scenarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();