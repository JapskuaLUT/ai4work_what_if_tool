-- Clear existing data
TRUNCATE TABLE simulation_sets, scenarios, assignments, stress_metrics RESTART IDENTITY CASCADE;

-- Insert data into simulation_sets
INSERT INTO simulation_sets (case_id, name, kind, description) VALUES
('10001', 'Course Workload Stress Simulation Set', 'stress', 'A dataset to simulate and evaluate university course workloads and student stress under varied conditions.');

-- Insert data for Scenario 1
INSERT INTO scenarios (case_id, scenario_id, description, course_name, course_id, teaching_total_hours, teaching_days, teaching_time, lab_total_hours, lab_days, lab_time, ects, topic_difficulty, prerequisites, weekly_homework_hours, total_weeks, attendance_method, success_rate_percent, average_grade, student_count, current_week) VALUES
('10001', 1, 'Standard workload distribution with moderate assignment schedule.', 'Data Structures and Algorithms', 'CS2040', 24, '{"Monday", "Wednesday"}', '10:00-12:00', 24, '{"Tuesday", "Thursday"}', '14:00-16:00', 6, 7, true, 5, 12, 'hybrid', 78.5, 3.2, 65, 4);

INSERT INTO assignments (case_id, scenario_id, assignment_number, start_week, end_week, hours_per_week) VALUES
('10001', 1, 1, 3, 5, 4),
('10001', 1, 2, 7, 9, 6),
('10001', 1, 3, 10, 12, 8);

INSERT INTO stress_metrics (case_id, scenario_id, current_week_average, current_week_maximum, predicted_next_week_average, predicted_next_week_maximum) VALUES
('10001', 1, 5.8, 8.2, 6.5, 8.7);

-- Insert data for Scenario 2
INSERT INTO scenarios (case_id, scenario_id, description, course_name, course_id, teaching_total_hours, teaching_days, teaching_time, lab_total_hours, lab_days, lab_time, ects, topic_difficulty, prerequisites, weekly_homework_hours, total_weeks, attendance_method, success_rate_percent, average_grade, student_count, current_week) VALUES
('10001', 2, 'High-intensity workload with overlapping assignments and increased homework.', 'Data Structures and Algorithms', 'CS2040', 24, '{"Monday", "Wednesday"}', '10:00-12:00', 24, '{"Tuesday", "Thursday"}', '14:00-16:00', 6, 7, true, 8, 12, 'hybrid', 78.5, 3.2, 65, 4);

INSERT INTO assignments (case_id, scenario_id, assignment_number, start_week, end_week, hours_per_week) VALUES
('10001', 2, 1, 2, 4, 6),
('10001', 2, 2, 3, 5, 7),
('10001', 2, 3, 5, 7, 8),
('10001', 2, 4, 8, 12, 10);

INSERT INTO stress_metrics (case_id, scenario_id, current_week_average, current_week_maximum, predicted_next_week_average, predicted_next_week_maximum) VALUES
('10001', 2, 7.9, 9.5, 8.4, 9.8);

-- Insert data for Scenario 3
INSERT INTO scenarios (case_id, scenario_id, description, course_name, course_id, teaching_total_hours, teaching_days, teaching_time, lab_total_hours, lab_days, lab_time, ects, topic_difficulty, prerequisites, weekly_homework_hours, total_weeks, attendance_method, success_rate_percent, average_grade, student_count, current_week) VALUES
('10001', 3, 'Light workload with gradual assignment distribution and reduced homework.', 'Data Structures and Algorithms', 'CS2040', 24, '{"Monday", "Wednesday"}', '10:00-12:00', 24, '{"Tuesday", "Thursday"}', '14:00-16:00', 6, 7, true, 3, 12, 'hybrid', 78.5, 3.2, 65, 4);

INSERT INTO assignments (case_id, scenario_id, assignment_number, start_week, end_week, hours_per_week) VALUES
('10001', 3, 1, 4, 6, 2),
('10001', 3, 2, 8, 10, 3),
('10001', 3, 3, 11, 12, 4);

INSERT INTO stress_metrics (case_id, scenario_id, current_week_average, current_week_maximum, predicted_next_week_average, predicted_next_week_maximum) VALUES
('10001', 3, 3.2, 5.5, 3.5, 5.8);