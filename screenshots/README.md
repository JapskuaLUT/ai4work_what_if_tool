# What-If Tool — screenshot library

Slide-ready captures of every feature, taken from the running stack with the
local LLM (phi4 via Ollama). Every image in the numbered folders is 2880×1620 px (a 1440×810 browser
window at 2× scale, 16:9), framed on one section so it fills a slide.

Images marked **AI** show an LLM feature at work. The AI answers are real
model output from this capture run, not written by hand.

## Getting started

| Image | Shows | |
|---|---|---|
| [01_home.png](00_getting_started/01_home.png) | **Home page** — Landing page with one entry point per use case: stress simulation, yard simulation, check-in logs, and an Ollama chat test. |  |
| [02_model_picker.png](00_getting_started/02_model_picker.png) | **Global LLM model picker** — The model picker in the top bar lists the models installed in the local Ollama; the selected model is used by every AI feature. |  |
| [03_ollama_test_page.png](00_getting_started/03_ollama_test_page.png) | **Ollama connection test** — A plain chat page for checking that the local LLM is reachable before using the AI features. |  |
| [04_ollama_test_answer.png](00_getting_started/04_ollama_test_answer.png) | **Ollama connection test — answer** — The test chat answering, confirming the LLM connection works end to end. | AI |
| [05_api_docs_swagger.png](00_getting_started/05_api_docs_swagger.png) | **Backend API documentation (Swagger)** — Interactive OpenAPI documentation served by the backend at https://backend.localhost/swagger, for integrating simulators and data sources. |  |
| [06_api_docs_swagger_endpoints.png](00_getting_started/06_api_docs_swagger_endpoints.png) | **Backend API endpoints** — The endpoint list for education, yard logistics and log ingestion. |  |

## Education — course stress what-ifs

| Image | Shows | |
|---|---|---|
| [01_course_header.png](01_education/01_course_header.png) | **Education case — course overview** — Course card: dates, current week, difficulty, students, assignments and the exam that drive the stress model. |  |
| [02_overview_baseline_trajectory.png](01_education/02_overview_baseline_trajectory.png) | **Overview tab: Baseline trajectory** — Overview tab — the “Baseline trajectory” section. |  |
| [03_overview_scenarios.png](01_education/03_overview_scenarios.png) | **Overview tab: Scenarios** — Overview tab — the “Scenarios” section. |  |
| [04_balanced_balanced_redistribution_smooth_.png](01_education/04_balanced_balanced_redistribution_smooth_.png) | **Generated scenario “Balanced Redistribution”: Balanced Redistribution - Smooth Stress Curve** — Generated scenario “Balanced Redistribution” — the “Balanced Redistribution - Smooth Stress Curve” section. |  |
| [05_balanced_baseline_vs_simulation.png](01_education/05_balanced_baseline_vs_simulation.png) | **Generated scenario “Balanced Redistribution”: Baseline vs simulation** — Generated scenario “Balanced Redistribution” — the “Baseline vs simulation” section. |  |
| [06_balanced_adjustments_4.png](01_education/06_balanced_adjustments_4.png) | **Generated scenario “Balanced Redistribution”: Adjustments (4)** — Generated scenario “Balanced Redistribution” — the “Adjustments (4)” section. |  |
| [07_balanced_model_and_parameters.png](01_education/07_balanced_model_and_parameters.png) | **Generated scenario “Balanced Redistribution”: Model and parameters** — Generated scenario “Balanced Redistribution” — the “Model and parameters” section. |  |
| [08_balanced_weekly_breakdown.png](01_education/08_balanced_weekly_breakdown.png) | **Generated scenario “Balanced Redistribution”: Weekly breakdown** — Generated scenario “Balanced Redistribution” — the “Weekly breakdown” section. |  |
| [09_balanced_week11_components.png](01_education/09_balanced_week11_components.png) | **Week breakdown — the seven stress components** — Clicking a week expands the seven model components (base load, teaching density, homework, assignment, exam, overload, fatigue carry-over) behind its score. |  |
| [10_scenario_aggressive_optimization.png](01_education/10_scenario_aggressive_optimization.png) | **Generated scenario “Aggressive Optimization”** — Trajectory of the generated “Aggressive Optimization” scenario against the baseline. |  |
| [11_scenario_extension_based.png](01_education/11_scenario_extension_based.png) | **Generated scenario “Extension-Based”** — Trajectory of the generated “Extension-Based” scenario against the baseline. |  |
| [12_scenario_minimal_adjustment.png](01_education/12_scenario_minimal_adjustment.png) | **Generated scenario “Minimal Adjustment”** — Trajectory of the generated “Minimal Adjustment” scenario against the baseline. |  |
| [13_user_scenario_move_the_exam_and_ease_the.png](01_education/13_user_scenario_move_the_exam_and_ease_the.png) | **User what-if “Move the exam and ease the run-up”: Move the exam and ease the run-up** — User what-if “Move the exam and ease the run-up” — the “Move the exam and ease the run-up” section. |  |
| [14_user_scenario_baseline_vs_simulation.png](01_education/14_user_scenario_baseline_vs_simulation.png) | **User what-if “Move the exam and ease the run-up”: Baseline vs simulation** — User what-if “Move the exam and ease the run-up” — the “Baseline vs simulation” section. |  |
| [15_user_scenario_adjustments_4.png](01_education/15_user_scenario_adjustments_4.png) | **User what-if “Move the exam and ease the run-up”: Adjustments (4)** — User what-if “Move the exam and ease the run-up” — the “Adjustments (4)” section. |  |
| [16_user_scenario_redistribution_flows_2.png](01_education/16_user_scenario_redistribution_flows_2.png) | **User what-if “Move the exam and ease the run-up”: Redistribution flows (2)** — User what-if “Move the exam and ease the run-up” — the “Redistribution flows (2)” section. |  |
| [17_user_scenario_weekly_breakdown.png](01_education/17_user_scenario_weekly_breakdown.png) | **User what-if “Move the exam and ease the run-up”: Weekly breakdown** — User what-if “Move the exam and ease the run-up” — the “Weekly breakdown” section. |  |
| [18_scenario_selected.png](01_education/18_scenario_selected.png) | **Marking the preferred scenario** — “Select this scenario” records the instructor's chosen plan for the course. |  |
| [19_new_whatif_empty.png](01_education/19_new_whatif_empty.png) | **New what-if — builder** — The what-if builder: pick an adjustment type and its parameters; several adjustments can be combined into one scenario. |  |
| [20_new_whatif_filled.png](01_education/20_new_whatif_filled.png) | **New what-if — adjustments queued** — Two adjustments queued (reduce week-11 homework by 6h, extend the project report by a week), named “Ease week 11”, ready to simulate. |  |
| [21_new_whatif_result.png](01_education/21_new_whatif_result.png) | **New what-if — result** — The simulated “Ease week 11” scenario appears as its own tab: simulated trajectory against the baseline. |  |
| [22_new_whatif_result_numbers.png](01_education/22_new_whatif_result_numbers.png) | **New what-if — did it help?** — Peak before vs. after, warning/critical weeks, weeks changed and workload moved — the tool says plainly whether the change helped. |  |
| [23_chat_open.png](01_education/23_chat_open.png) | **AI chat — opened on the course** — The floating AI chat opens with the course, baseline and every scenario already in its context. Runs on the local LLM (phi4 via Ollama). | AI |
| [24_chat_peak_week.png](01_education/24_chat_peak_week.png) | **AI chat — explaining the peak week** — Asking the AI why week 11 is the peak: it answers from the model's component breakdown rather than guessing. | AI |
| [25_chat_peak_week_end.png](01_education/25_chat_peak_week_end.png) | **AI chat — explaining the peak week (end of answer)** — Asking the AI why week 11 is the peak: it answers from the model's component breakdown rather than guessing. End of the model's answer. | AI |
| [26_chat_scenario_critique.png](01_education/26_chat_scenario_critique.png) | **AI chat — critiquing a what-if** — On a scenario tab the chat is scoped to that scenario: here it explains why the user's what-if failed to lower the peak and suggests alternatives. | AI |
| [27_chat_scenario_critique_end.png](01_education/27_chat_scenario_critique_end.png) | **AI chat — critiquing a what-if (end of answer)** — On a scenario tab the chat is scoped to that scenario: here it explains why the user's what-if failed to lower the peak and suggests alternatives. End of the model's answer. | AI |

## Yard logistics — simulator runs and AI proposals

| Image | Shows | |
|---|---|---|
| [01_yard_layout.png](02_logistics/01_yard_layout.png) | **Yard case — layout and contents** — Imported simulator case: the physical yard map (terminals, parking, scale, 25 storages, 110 streets) and its entity counts. |  |
| [02_run_comparison.png](02_logistics/02_run_comparison.png) | **Run comparison** — All simulator runs side by side: orders, completed, total / average / max wait, throughput and top bottleneck. |  |
| [03_waitingproblem_orders.png](02_logistics/03_waitingproblem_orders.png) | **Run “WaitingProblem” (71 orders): ORDERS** — Run “WaitingProblem” (71 orders) — the “ORDERS” section. |  |
| [04_waitingproblem_per_truck_timeline.png](02_logistics/04_waitingproblem_per_truck_timeline.png) | **Run “WaitingProblem” (71 orders): Per-truck timeline** — Run “WaitingProblem” (71 orders) — the “Per-truck timeline” section. |  |
| [05_waitingproblem_per_truck_timeline_cont.png](02_logistics/05_waitingproblem_per_truck_timeline_cont.png) | **Run “WaitingProblem” (71 orders): Per-truck timeline (continued)** — Run “WaitingProblem” (71 orders) — lower part of “Per-truck timeline”. |  |
| [06_bottleneck_occupancy.png](02_logistics/06_bottleneck_occupancy.png) | **Bottleneck → occupancy timeline** — Clicking a bottleneck (here the LT010 check-in terminal) drives the occupancy chart: trucks present over time vs. the entity's capacity (red dashed line). |  |
| [07_gantt_hover.png](02_logistics/07_gantt_hover.png) | **Per-truck timeline with tooltip** — Hovering a truck shows its per-action totals; red bands are waiting time. |  |
| [08_run_sequencedok.png](02_logistics/08_run_sequencedok.png) | **Run “SequencedOk”** — KPIs and bottlenecks of the “SequencedOk” run. |  |
| [09_run_smooth.png](02_logistics/09_run_smooth.png) | **Run “Smooth”** — KPIs and bottlenecks of the “Smooth” run. |  |
| [10_chat_why_worse.png](02_logistics/10_chat_why_worse.png) | **AI chat — diagnosing the worst run** — The yard chat knows every run's KPIs and bottlenecks and explains where trucks lose time in the WaitingProblem run. | AI |
| [11_chat_why_worse_end.png](02_logistics/11_chat_why_worse_end.png) | **AI chat — diagnosing the worst run (end of answer)** — The yard chat knows every run's KPIs and bottlenecks and explains where trucks lose time in the WaitingProblem run. End of the model's answer. | AI |
| [12_improvements_tab.png](02_logistics/12_improvements_tab.png) | **Improvements — generate AI suggestions** — Pick a target run and how many proposals; the LLM drafts structured improvement proposals. |  |
| [13_generating.png](02_logistics/13_generating.png) | **Generating proposals** — The local LLM is generating proposals for the WaitingProblem run. | AI |
| [14_drafts.png](02_logistics/14_drafts.png) | **AI-generated proposal drafts** — Each draft has a title, the bottleneck it targets, typed changes (capacity / stagger orders / reroute / add entity), expected impact and risks — validated against the yard's entities. | AI |
| [15_drafts_more.png](02_logistics/15_drafts_more.png) | **AI-generated proposal drafts (continued)** — More drafts from the same generation run. | AI |
| [16_saved_proposal.png](02_logistics/16_saved_proposal.png) | **Saved proposal** — A saved proposal can be discussed with the AI or (once the partner API is live) sent to the simulator for re-evaluation. | AI |
| [17_chat_discuss_proposal.png](02_logistics/17_chat_discuss_proposal.png) | **Discuss with AI — critiquing a proposal** — “Discuss” opens the chat scoped to one proposal and the target run's KPIs: the AI weighs its likely impact and risks before anything is simulated. | AI |
| [18_chat_discuss_proposal_end.png](02_logistics/18_chat_discuss_proposal_end.png) | **Discuss with AI — critiquing a proposal (end of answer)** — “Discuss” opens the chat scoped to one proposal and the target run's KPIs: the AI weighs its likely impact and risks before anything is simulated. End of the model's answer. | AI |
| [19_manual_proposal_form.png](02_logistics/19_manual_proposal_form.png) | **Manual proposal form** — Planners can also write their own proposal with the same typed changes; it is validated the same way. |  |

## Check-in kiosk logs

| Image | Shows | |
|---|---|---|
| [01_summary.png](03_logs/01_summary.png) | **Check-in logs — plain-English summary** — Process-mining view over 5,764 kiosk events reconstructed into 34 driver sessions, opening with an automatic plain-English summary and KPIs. |  |
| [02_logs_time_per_step_top_12_dialogs.png](03_logs/02_logs_time_per_step_top_12_dialogs.png) | **Check-in logs: Time per step — top 12 dialogs** — Check-in logs — the “Time per step — top 12 dialogs” section. |  |
| [03_logs_sessions_34.png](03_logs/03_logs_sessions_34.png) | **Check-in logs: Sessions (34)** — Check-in logs — the “Sessions (34)” section. |  |
| [04_logs_about_this_view.png](03_logs/04_logs_about_this_view.png) | **Check-in logs: About this view** — Check-in logs — the “About this view” section. |  |
| [05_step_tooltip.png](03_logs/05_step_tooltip.png) | **Time per step — hover detail** — Hovering a dialog shows the original German step name, occurrences, and typical (p50) vs. tail (p95) time. |  |
| [06_session_detail.png](03_logs/06_session_detail.png) | **Session detail — where did the time go?** — Selecting a session shows its phase breakdown and every step, with personal data (driver name, signature) masked by default. |  |
| [07_session_step_expanded.png](03_logs/07_session_step_expanded.png) | **Session step expanded** — Each step expands to its raw kiosk message, exact timestamps and captured value. |  |
| [08_chat_longest_tail.png](03_logs/08_chat_longest_tail.png) | **AI chat — explaining the long tail** — The logs chat has the KPIs, slowest dialogs and sessions in context; it explains tail latency in English while citing the German kiosk labels. | AI |
| [09_chat_longest_tail_end.png](03_logs/09_chat_longest_tail_end.png) | **AI chat — explaining the long tail (end of answer)** — The logs chat has the KPIs, slowest dialogs and sessions in context; it explains tail latency in English while citing the German kiosk labels. End of the model's answer. | AI |
| [10_chat_session.png](03_logs/10_chat_session.png) | **AI chat — reading one session** — The chat also sees the session currently open in the detail panel, so it can interpret a single driver visit. | AI |
| [11_chat_session_end.png](03_logs/11_chat_session_end.png) | **AI chat — reading one session (end of answer)** — The chat also sees the session currently open in the detail panel, so it can interpret a single driver visit. End of the model's answer. | AI |

## Legacy stress simulation (pre-v1.0 model)

| Image | Shows | |
|---|---|---|
| [01_builder.png](04_legacy_stress/01_builder.png) | **Legacy stress simulation — builder** — The pre-v1.0 stress simulation reached from the home page's “Load Stress Simulation” button. |  |
| [02_results.png](04_legacy_stress/02_results.png) | **Legacy stress simulation — results** — Results of the pre-v1.0 coursework simulation (older model, numbers not comparable with v1.0). |  |
| [03_results_course_workload_stress_simulatio.png](04_legacy_stress/03_results_course_workload_stress_simulatio.png) | **Legacy results: Course Workload Stress Simulation Set** — Legacy results — the “Course Workload Stress Simulation Set” section. |  |
| [04_results_stress_level.png](04_legacy_stress/04_results_stress_level.png) | **Legacy results: Stress Level** — Legacy results — the “Stress Level” section. |  |
| [05_results_stress_level_comparison.png](04_legacy_stress/05_results_stress_level_comparison.png) | **Legacy results: Stress Level Comparison** — Legacy results — the “Stress Level Comparison” section. |  |
| [06_ai_analysis.png](04_legacy_stress/06_ai_analysis.png) | **Legacy results — AI analysis** — On the pre-v1.0 results page the LLM writes a narrative analysis of the scheduling plan and its scenarios. | AI |

## Cropped AI chat panels (for slides and documents)

| Image | Shows | |
|---|---|---|
| [edu_chat_peak_week.png](crops/edu_chat_peak_week.png) | **Education AI chat — the peak week** — Chat panel only (1728×1524): the AI explains what drives the week-11 stress peak. | AI |
| [edu_chat_scenario_critique.png](crops/edu_chat_scenario_critique.png) | **Education AI chat — critiquing a what-if** — Chat panel only: why “Move the exam and ease the run-up” did not lower the peak. | AI |
| [edu_chat_scenario_critique_end.png](crops/edu_chat_scenario_critique_end.png) | **Education AI chat — suggested alternatives** — Chat panel only: the end of the same answer, with what to try instead. | AI |
| [yard_chat_why_worse.png](crops/yard_chat_why_worse.png) | **Yard AI chat — diagnosing the worst run** — Chat panel only: why WaitingProblem is so much worse than SequencedOk. | AI |
| [yard_chat_discuss_proposal.png](crops/yard_chat_discuss_proposal.png) | **Yard AI chat — discussing a proposal** — Chat panel only: confidence and risks of the saved “Increase Check-In Terminal Capacity” proposal. | AI |
| [logs_chat_longest_tail.png](crops/logs_chat_longest_tail.png) | **Logs AI chat — the longest tail** — Chat panel only: which kiosk dialog has the longest tail, and possible explanations. | AI |
| [logs_chat_session.png](crops/logs_chat_session.png) | **Logs AI chat — reading one session** — Chat panel only: what is unusual about session #1420. | AI |

