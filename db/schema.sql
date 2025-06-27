-- This table stores the main information about a simulation set.
CREATE TABLE simulation_sets (
    case_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    kind VARCHAR(50),
    description TEXT
);

-- This table stores the details for each scenario, including course information.
-- A composite primary key is used to uniquely identify a scenario within a case.
CREATE TABLE scenarios (
    scenario_id INTEGER,
    case_id VARCHAR(255) REFERENCES simulation_sets(case_id),
    description TEXT,
    
    -- Course Info from the 'input' object
    course_name VARCHAR(255),
    course_id VARCHAR(50),
    teaching_total_hours INTEGER,
    teaching_days TEXT[],
    teaching_time VARCHAR(50),
    lab_total_hours INTEGER,
    lab_days TEXT[],
    lab_time VARCHAR(50),
    ects INTEGER,
    topic_difficulty INTEGER,
    prerequisites BOOLEAN,
    weekly_homework_hours INTEGER,
    total_weeks INTEGER,
    attendance_method VARCHAR(50),
    success_rate_percent DECIMAL(5, 2),
    average_grade DECIMAL(3, 2),
    student_count INTEGER,

    -- Current Status from the 'input' object
    current_week INTEGER,

    PRIMARY KEY (case_id, scenario_id)
);

-- This table stores assignment details for each scenario.
CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    case_id VARCHAR(255),
    scenario_id INTEGER,
    assignment_number INTEGER NOT NULL,
    start_week INTEGER,
    end_week INTEGER,
    hours_per_week INTEGER,
    FOREIGN KEY (case_id, scenario_id) REFERENCES scenarios(case_id, scenario_id)
);

-- This table stores the output stress metrics for each scenario.
CREATE TABLE stress_metrics (
    stress_metric_id SERIAL PRIMARY KEY,
    case_id VARCHAR(255),
    scenario_id INTEGER,
    current_week_average DECIMAL(4, 2),
    current_week_maximum DECIMAL(4, 2),
    predicted_next_week_average DECIMAL(4, 2),
    predicted_next_week_maximum DECIMAL(4, 2),
    FOREIGN KEY (case_id, scenario_id) REFERENCES scenarios(case_id, scenario_id)
);
