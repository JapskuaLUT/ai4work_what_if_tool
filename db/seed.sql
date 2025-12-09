-- Clear existing data
TRUNCATE TABLE simulation_sets, scenarios, assignments, stress_metrics, educational_simulations, adjustment_scenarios RESTART IDENTITY CASCADE;

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

-- Insert sample educational simulation with selected adjustment
INSERT INTO educational_simulations (case_id, name, description, course_info, assignment_weeks, current_status, optimization_request, students, metadata, selected_adjustment_id, selected_at) VALUES
('ed-sim-001', 'Web Development Spring 2025', 'Educational stress optimization for web development course',
'{"course_name": "Web Development", "course_id": "CS-301", "teaching_hours": 24, "lab_hours": 12, "ects": 5, "topic_difficulty": 3, "has_prerequisites": true, "total_homework_hours": 100, "total_weeks": 12, "total_assignments": 3, "attendance_method": "Hybrid", "success_rate_percent": 85.0, "average_grade": 3.5, "course_sessions": [{"day": "Monday", "start_time": "09:00", "end_time": "11:00"}], "lab_sessions": [{"day": "Wednesday", "start_time": "14:00", "end_time": "16:00"}]}',
'[{"id": 1, "start_week": 1, "end_week": 4, "extensions": []}, {"id": 2, "start_week": 5, "end_week": 8, "extensions": []}, {"id": 3, "start_week": 9, "end_week": 12, "extensions": []}]',
'{"current_week": 1, "latest_adjusted_week": 0}',
'{"optimization_target": "minimize_peak_stress", "stress_threshold_warning": 75, "stress_threshold_critical": 85, "allow_extensions": true, "max_extensions_per_assignment": 2, "consider_all_remaining_weeks": true}',
'{"count": 50}',
'{"created_at": "2025-01-13T10:00:00Z", "creator_id": "instructor_1", "semester_id": "spring_2025"}',
'adjustment_2',
NOW());

-- Insert sample adjustment scenarios for the educational simulation
INSERT INTO adjustment_scenarios (case_id, adjustment_id, week_schedules, assignment_weeks, extensions_applied, summary_metrics) VALUES
('ed-sim-001', 'adjustment_1',
'[{"week_number": 1, "adjusted": false, "teaching_hours": 2, "lab_hours": 1, "homework_hours": 8, "stress_metrics": {"average_stress": 65.2, "maximum_stress": 72.1}}]',
NULL, NULL,
'{"total_adjustments_made": 3, "hours_redistributed": true, "peak_stress": 72.1, "average_stress": 65.2, "total_hours_maintained": true}'),
('ed-sim-001', 'adjustment_2',
'[{"week_number": 1, "adjusted": true, "teaching_hours": 2, "lab_hours": 1, "homework_hours": 6, "stress_metrics": {"average_stress": 58.5, "maximum_stress": 68.3}}]',
NULL, NULL,
'{"total_adjustments_made": 5, "hours_redistributed": true, "peak_stress": 68.3, "average_stress": 58.5, "total_hours_maintained": true}'),
('ed-sim-001', 'adjustment_3',
'[{"week_number": 1, "adjusted": true, "teaching_hours": 2, "lab_hours": 1, "homework_hours": 5, "stress_metrics": {"average_stress": 52.1, "maximum_stress": 62.4}}]',
NULL, NULL,
'{"total_adjustments_made": 7, "hours_redistributed": true, "peak_stress": 62.4, "average_stress": 52.1, "total_hours_maintained": true}'),
('ed-sim-001', 'adjustment_4',
'[{"week_number": 1, "adjusted": true, "teaching_hours": 2, "lab_hours": 1, "homework_hours": 7, "stress_metrics": {"average_stress": 60.8, "maximum_stress": 70.5}}]',
'[{"id": 1, "start_week": 1, "end_week": 5, "extensions": [{"extension_id": 1, "new_end_week": 5, "reason": "Stress reduction", "weeks_extended": 1}]}]',
'[{"assignment_id": 1, "original_end_week": 4, "new_end_week": 5, "weeks_extended": 1}]',
'{"total_adjustments_made": 4, "hours_redistributed": true, "peak_stress": 70.5, "average_stress": 60.8, "total_hours_maintained": true}');