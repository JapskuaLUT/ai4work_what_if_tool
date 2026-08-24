# Education Stress Parity & Adjustment Engine — Design Document

**Status:** Implemented. The specification was adopted verbatim; §10 records
the decisions taken where it was silent, and the two things worth confirming.
**Owner:** AI4Work team
**Last updated:** 2026-08-24
**Request source:** "What-If Tool: Stress Prediction and Course Adjustment Specification"
(reproduced verbatim in [request.md](request.md))

> Companion files in this folder:
> - [specification.yml](specification.yml) — OpenAPI 3.1 contract for the v1.0
>   `/api/simulations/education/*` endpoints.
> - [parity/](parity/) — the §13 fixture set, shared with the main AI4Work
>   education application. Read [parity/README.md](parity/README.md) before
>   treating parity as established.
> - [probe_model.ts](probe_model.ts) — reproduces the numbers in §3.
> - User-facing walkthrough:
>   [instructions/education/getting_started.md](../../instructions/education/getting_started.md).

---

## 1. What is being asked

The main AI4Work education application has a course-level workload stress
model it calls `course_stress_prediction` v1.0. The request asks the What-If
Tool to:

1. compute stress with **exactly that model**, to 1e-6 parity;
2. stop merging assignment hours into homework hours, and start carrying exam
   load explicitly;
3. accept **user-authored adjustments** against assignments and exams, not just
   homework;
4. rebuild the weekly schedule after any domain-level (assignment/exam) change;
5. recompute the whole semester trajectory sequentially (fatigue carry-over
   makes weeks order-dependent);
6. return an **auditable** baseline-vs-simulation comparison.

Items 1–2 are a model swap. Items 3–4 are a genuinely new capability — today
the What-If Tool has *no* concept of a user-supplied adjustment at all. Item 6
is a new output contract.

---

## 2. How the tool works today

```
POST /api/simulations/education/          ← CourseAnalysisInput
   └─ CourseOptimizationEngine.generateOptimizationScenarios(input)
        ├─ adjustment_1  Minimal      (cut homework 20% on weeks > critical)
        ├─ adjustment_2  Balanced     (cut toward 0.9 × warning)
        ├─ adjustment_3  Aggressive   (cut 35% on weeks > warning)
        └─ adjustment_4  Extension    (DeadlineExtensionService)
              each week → StressCalculator.calculateWeeklyStress(factors)
   └─ persist educational_simulations + adjustment_scenarios (JSONB)
GET  /:caseId                 → all four scenarios
GET  /:caseId/:adjustmentId   → one scenario + feasibility score
PUT  /:caseId/select          → user picks one
GET  /:caseId/selection       → read the pick
```

Relevant files:

| Concern | File |
|---|---|
| Stress model | [stressCalculation.ts](../../backend/src/services/stressCalculation.ts) |
| Scenario generation | [optimizationEngine.ts](../../backend/src/services/optimizationEngine.ts) |
| Deadline extensions | [extensionService.ts](../../backend/src/services/extensionService.ts) |
| Types | [educationalStress.ts](../../backend/src/types/educationalStress.ts) |
| API | [educationalStressRoutes.ts](../../backend/src/routes/educationalStressRoutes.ts) |
| Tables | `educational_simulations`, `adjustment_scenarios` in [schema.ts](../../backend/src/db/schema.ts) |
| UI | [EducationalStressPage.tsx](../../ui/src/pages/EducationalStressPage.tsx), [components/stress/](../../ui/src/components/stress/) |

### 2.1 The current model is unrelated to the requested one

`StressCalculator.calculateWeeklyStress` is a different formula family:
piecewise-linear workload → deadline **count** × 15 × a sinusoid over semester
progress → × difficulty multiplier → × attendance modifier → × a cumulative
factor `1 + progress × 0.5`, capped at **100**.

Nothing survives the swap. Concretely, the requested model has no notion of
`topic_difficulty` outside exam load, no `attendance_method`, no deadline
*count*, and no semester-progress multiplier. Conversely the current model has
no fatigue carry-over, no exam term, no assignment term, and no soft cap.

Two further properties of the current code matter:

- `calculateDistribution` calls `generateNormalDistribution`, which uses
  `Math.random()`. **Stress output is therefore non-deterministic today** —
  `maximum_stress` is derived analytically so it is stable, but
  `stressDistribution` differs on every call. The requested model is a pure
  function and must stay one; parity testing is impossible otherwise.
- `week_schedules[].homework_hours` is the *only* independent-work field. There
  is no `assignment_hours`, no `exam_hours`, no dates, no `actual_stress`, and
  no `week_index`.

---

## 3. Findings from evaluating the proposed model

Before designing around v1.0 we implemented the §4 equations and probed them.
Two results change the shape of the work and need a decision from the
requester before we build.

### 3.1 The warning and critical thresholds are unreachable

Component maxima are `34 + 10 + 12 + 18 + 30 + 14 = 118`, and fatigue adds at
most `0.07 × S`. Solving the fixed point through the soft cap
`Ŝ = 90(1 − e^{−0.82R/90})`:

| Path | Maximum attainable `S_w` |
|---|---|
| Schedule only (§4) | **60.45** |
| + maximum learned bias `b = +12` (§5.2) | **72.45** |
| + observed blend with `O_w = 90` (§5.1) | **73.75** |

The request's own bands put **High** at `> 66`, **warning** at `≥ 75` and
**critical** at `≥ 85`. Under v1.0 as specified, *no input whatsoever* — not a
70-hour week with a maximum-difficulty exam — can reach even the warning line.
The classification table tops out permanently in "Moderate".

Sample evaluations (`L, B, H, A, E`):

| Week | `W` | `R` | `S` | Band |
|---|---|---|---|---|
| 3, 2, 8, 3, 0 — ordinary | 16 | 26.1 | 19.0 | Low |
| 3, 2, 16, 0, 0 — homework-heavy | 21 | 37.7 | 26.2 | Low |
| 3, 2, 4, 14, 0 — assignment-heavy | 23 | 48.1 | 31.9 | Low |
| 3, 2, 10, 8, 6 — exam, difficulty 3 | 29 | 80.1 | 46.6 | Moderate |
| 3, 2, 12, 12, 10 — exam, difficulty 5 | 39 | 104.6 | 55.3 | Moderate |
| 10, 10, 20, 20, 10 — absurd | 70 | 122.2 | 60.4 | Moderate |

**Consequence for this tool specifically.** Every trigger in
`optimizationEngine.ts` is of the form
`average_stress > stress_threshold_warning` or `> stress_threshold_critical`,
and `extensionService.ts` prioritises the same way. If we adopt v1.0 verbatim
and keep warning = 75 / critical = 85, **all four generated scenarios become
no-ops** — the optimiser will report "nothing to do" for every course. The
§8 objective `min max_w S_w` still works, but every constraint expressed
against the thresholds becomes vacuous.

This is not a reason to reject the model; it is a reason to pin down what the
thresholds mean before we wire them to behaviour. Options are laid out in
§10 Q1.

### 3.2 Semester-wide homework skew is very aggressive

§3.3 spreads *all* course homework by `((i+1)/N)^2.5`. For `H_total = 100`,
`N = 12`:

```
0.05  0.29  0.79  1.63  2.84  4.48  6.59  9.20  12.35  16.07  20.39  25.34
```

Week 1 gets 3 minutes; week 12 gets 25 hours — before assignments and exams are
added on top. The same `^2.5` weighting applied per-assignment (§3.4) is
well-motivated ("pressure increases as the deadline approaches"), but applying
it across an entire semester means the model is structurally guaranteed to peak
in the final week, whatever the instructor actually planned. Our existing
sample course carries a fairly flat 6–13 h/week. See §10 Q2.

### 3.3 Exam load is counted three times

`E_w = 2d` is a pressure value, not real hours, yet it enters `W_w`, which
feeds both `P^base` and `P^over`, and it also drives `P^exam`. On top of that
`P^exam` has a 12-point floor for any non-zero `E_w`. In the difficulty-3 exam
week above, exam-attributable pressure is `27 + (base contribution of 6 h)` out
of `R = 80.1`. Intentional or not, it should be confirmed (§10 Q3), because the
audit output will attribute it and users will ask.

### 3.4 Exam side effects are order-dependent

§3.5 mutates neighbouring weeks: `H_{x−1} += 2` and `H_{x+1} ← 0.7 H_{x+1}`.
For two exams two weeks apart (`x` and `x+2`), week `x+1` receives both a
`×0.7` and a `+2`, and `(H × 0.7) + 2 ≠ (H + 2) × 0.7`. The rebuild is
therefore not well-defined without a canonical ordering (§10 Q4). This matters
directly for "move exam", which is one of the requested adjustments.

### 3.5 The gaps listed in §12 of the request are all real

We confirmed each against the code:

| § | Claim | Verified |
|---|---|---|
| 12.1 | Assignments merged into homework | Yes — only `homework_hours` exists |
| 12.2 | `exam_hours` not exported | Yes — no exam concept at all |
| 12.3 | Stress not sequential | Yes — no `previousStress` parameter exists |
| 12.4 | Calibration not reproduced | Yes — no observed-stress input exists |
| 12.5 | Week key ambiguity | Yes — only 1-based `week_number` |
| 12.6 | Redistribution flows not recorded | Yes — `redistributeHours()` mutates weeks and returns `void` |
| 12.7 | Two assignment-distribution rules | N/A here — this tool has neither; we implement the gamma rule once |
| 12.8 | Observed stress mapped by position | N/A here — no observed stress today |
| 12.9 | Silent `false` returns | Yes — `applyExtension` failures are silent |
| 12.10 | Scenario identity not retained | Partly — `adjustment_id` exists, timestamps do not |

---

## 4. Design

### 4.1 Guiding decisions

**D1 — The model becomes a standalone, dependency-free module.**
`backend/src/services/stressModel/` imports nothing from the rest of the
backend. It is a pure function library: same input, same output, no clock, no
`Math.random`. This is the precondition for §9's "one shared, versioned
service or library" and lets us extract it to `@ai4work/course-stress-model`
later without moving logic.

**D2 — Versioned models coexist; nothing is silently reinterpreted.**
Every stored case records the `stress_model` block it was computed with. Rows
without one are `legacy-0` and keep rendering through today's
`StressCalculator`. New cases default to `course_stress_prediction@1.0`. No
migration recomputes historical numbers.

**D3 — One engine, two producers.**
The new capability is `simulateScenario(course, adjustments) → ScenarioResult`.
The existing optimiser is refactored to *emit `AdjustmentRequest[]`* rather
than mutate weeks directly, then feed the same engine. Generated and
user-authored scenarios then share one code path, one output contract, and one
audit trail. This is the single most valuable structural change in the work —
it is what makes §11's output contract free for both flows.

**D4 — The schedule builder is ours, and it is the arbiter.**
We implement §3.1–3.5 so that assignment/exam adjustments can trigger a
rebuild. When a caller *also* supplies `week_schedules`, we build from the
domain objects and diff; any week differing by more than 1e-6 raises a
`schedule_rebuild_mismatch` warning naming the weeks. That is the §13 parity
check applied to live traffic, and it is how we will find out whether our
reading of §3 matches theirs.

**D5 — Nothing fails silently.**
Every adjustment yields an outcome record — `applied`, `partially_applied`, or
`rejected` — with a machine code and a human message. §12.9 is a hard
requirement, not a nicety.

### 4.2 Module layout

```
backend/src/services/stressModel/          ← D1: zero backend imports
  constants.ts      StressModelConfig, the versioned v1.0 literal
  primitives.ts     safe(), clip(), boundedLinear(), softCap()
  week.ts           predictWeek()  → full component breakdown
  trajectory.ts     predictTrajectory() → sequential, fatigue + calibration
  scheduleBuilder.ts §3.1–3.5: course + assignments + exams → WeekSchedule[]
  index.ts          public surface

backend/src/services/education/
  adjustments.ts    the §10 AdjustmentRequest union + validation
  simulate.ts       simulateScenario(): the §6.4 pipeline
  redistribute.ts   §7, with recorded RedistributionFlow[]
  compare.ts        §11 baseline-vs-simulation summary
  optimizationEngine.ts  refactored: emits AdjustmentRequest[]
```

### 4.3 Types

Added to `types/educationalStress.ts` (existing types kept for `legacy-0`):

```ts
export interface WeekScheduleV1 {
    week_index: number;        // 0-based, canonical
    week_number: number;       // 1-based, display
    week_start: string;        // ISO
    week_end: string;          // ISO
    adjusted: boolean;
    lecture_hours: number;
    lab_hours: number;
    homework_hours: number;
    assignment_hours: number;
    exam_hours: number;
    actual_stress: number | null;
    predicted_stress?: number;
    components?: StressComponents;   // §13 requires component-level compare
    adjustment_details: AdjustmentDetail[];
}

export interface StressComponents {
    base: number; teaching: number; homework: number; assignment: number;
    exam: number; overload: number; fatigue: number;
    raw: number;               // R_w
    soft_capped: number;       // Ŝ_w
    schedule_only: number;     // S^schedule_w
    calibration_bias: number;  // b_w applied to this week
    final: number;             // S_w
}

export interface CourseAssignment {
    assignment_id: string;
    name: string;
    start_date: string;
    end_date: string;
    estimated_hours: number;
    extensions: AssignmentExtension[];
}

export interface CourseExam {
    exam_id: string;
    name: string;
    date_time: string;
}
```

`lecture_hours` replaces `teaching_hours`. The v1 API accepts both and
normalises, so the main application's naming wins going forward without
breaking today's callers.

The adjustment union follows the shape already proven by
[yardProposalService.ts](../../backend/src/services/yardProposalService.ts) —
a discriminated union validated against a catalogue on save:

```ts
type AdjustmentRequest =
  | { id, type: "cancel_lecture",    source_week_index, reason }
  | { id, type: "cancel_lab",        source_week_index, reason }
  | { id, type: "reduce_homework",   source_week_index, hours, reason }
  | { id, type: "move_homework",     source_week_index, target_week_index, hours, reason }
  | { id, type: "move_assignment",   assignment_id, new_start_date, new_end_date, reason }
  | { id, type: "update_assignment", assignment_id, new_start_date?, new_end_date?, new_estimated_hours?, reason }
  | { id, type: "extend_assignment", assignment_id, new_end_date, reason }
  | { id, type: "move_exam",         exam_id, new_date, reason }
  | { id, type: "cancel_exam",       exam_id, reason };
```

### 4.4 The simulation pipeline (§6.4)

`simulateScenario` is a pure function and executes strictly in this order:

1. **Clone** the course, assignments, exams and observed-stress series.
2. **Apply domain changes** — `move/update/extend_assignment`,
   `move/cancel_exam`. Each records an outcome. Extension records get an id,
   `new_end_week`, reason, `weeks_extended`, scenario id, timestamp, and are
   refused beyond `max_extensions_per_assignment`.
3. **Rebuild weekly schedules** if and only if step 2 changed something. The
   rebuild is total: old exam side effects vanish because they were never
   persisted, only derived.
4. **Apply week-level changes** — `cancel_lecture/lab`, `reduce/move_homework`.
   Cancelled teaching hours enter redistribution (§4.5).
5. **Recalculate sequentially** with `predictTrajectory`, week 0 → N−1,
   `S_{-1} = 0`, `b_0 = 0`, carrying both fatigue and calibration bias forward.
6. **Compare** baseline against simulation and emit the §11 payload.

Step 3 before step 4 is exactly why the ordering is specified: a rebuild after
a week-level edit would silently discard it.

### 4.5 Redistribution (§7)

Implemented with a pluggable objective, defaulting to the compatible one:

- `local_week` (default) — for each candidate future week `j`, compute
  `S_j` before and after adding `Δ = min(r, 3)` hours, pick the smallest
  increase. Matches the current main-app implementation; recorded as a known
  limitation in the response.
- `trajectory_peak` — recompute the whole trajectory per candidate and choose
  `argmin_j max_k S_k`. Correct under fatigue carry-over, and cheap enough at
  N ≤ 52 weeks.

Both emit a `RedistributionFlow` per placement — source week, target week,
hours, workload type, target stress before, target stress after, impact —
closing gap §12.6. The chosen objective is echoed in the response.

### 4.6 Observed stress and calibration (§5)

Observations are supplied as `{ week_start?, week_number?, value }` and matched
**by date containment first, `week_number` second, never by array position**
(§12.8). Unmatched observations become warnings rather than being dropped.

For what-if scenarios the rule is: bias learned from weeks that have already
happened (`week_index < current_week − 1`) is carried into future weeks as a
constant; **no scenario invents an observation for a future week**. Baseline
and simulation share the identical observation series — the past is not a
variable — and any adjustment targeting a past week is rejected with
`week_in_past`.

### 4.7 API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/simulations/education/stress-model` | The versioned `stress_model` block. Lets the main app assert agreement at boot. |
| `POST` | `/api/simulations/education/stress-model/evaluate` | Parity harness: weeks in, full component breakdown out. No persistence. |
| `POST` | `/api/simulations/education/` | Extended payload. Missing v1 fields are up-converted with warnings. |
| `POST` | `/api/simulations/education/:caseId/scenarios` | **New.** `{ adjustments[], options }` → §11 result, persisted. |
| `GET` | `/api/simulations/education/:caseId/scenarios/:scenarioId` | Read one back. |
| `GET` | `/api/simulations/education/:caseId` | Extended with `baseline` and `stress_model`. |

`stress-model/evaluate` is the highest-leverage endpoint in the set: it is how
the two systems check parity continuously rather than once at integration.

### 4.8 Persistence

Generated and user scenarios now have an identical shape, so they share a
table. Idempotent migration `db/education_stress_v1_migration.sql`, mirrored
into `db/schema.sql` and `backend/src/db/schema.ts` per the CLAUDE.md workflow:

```sql
ALTER TABLE educational_simulations
  ADD COLUMN IF NOT EXISTS course_assignments jsonb,
  ADD COLUMN IF NOT EXISTS course_exams       jsonb,
  ADD COLUMN IF NOT EXISTS baseline_schedule  jsonb,
  ADD COLUMN IF NOT EXISTS observed_stress    jsonb,
  ADD COLUMN IF NOT EXISTS stress_model       jsonb;

ALTER TABLE adjustment_scenarios
  ADD COLUMN IF NOT EXISTS origin               text NOT NULL DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS adjustments          jsonb,
  ADD COLUMN IF NOT EXISTS adjustment_outcomes  jsonb,
  ADD COLUMN IF NOT EXISTS redistribution_flows jsonb,
  ADD COLUMN IF NOT EXISTS comparison           jsonb,
  ADD COLUMN IF NOT EXISTS stress_model_version text;
```

### 4.9 UI

- `WeeklyScheduleTable` — split the hours column into lecture / lab / homework
  / assignment / exam; rescale to 0–90; show Low/Moderate/High bands.
- `StressTimelineChart` — overlay baseline and simulated trajectories, plot
  observed stress as points, draw threshold lines.
- **New** `AdjustmentBuilder` — pick an assignment, exam or week, compose an
  adjustment list, submit, see the comparison. This is the first time the tool
  lets a user *author* a what-if rather than choose among generated ones.
- **New** `ScenarioAuditPanel` — applied / partially applied / rejected
  adjustments with reasons, redistribution flows, model version.
- `FloatingStressChat` — feed it the component breakdown so explanations cite
  actual drivers ("week 9 is 27 of 80 raw points exam pressure") instead of
  paraphrasing a single number.

---

## 5. Parity testing (§13)

Eighteen fixtures live in [parity/](parity/), one per §13 case, each carrying
its own input and expected output. They are compared component-by-component —
`P^base`, `P^teach`, `P^home`, `P^assign`, `P^exam`, `P^over`, `P^fatigue`,
`R`, `Ŝ`, `S`, and the calibration bias in and out — at `|Δ| < 1e-6`, not just
on final stress. The runner is
[parity.test.ts](../../backend/src/services/education/parity.test.ts).

**The expected values are ours, not the main application's.** The inputs are
handwritten; the expected blocks were generated by this implementation and
frozen. So these fixtures currently prove that this implementation is
self-consistent and has not regressed. They do **not**, on their own, prove the
two systems agree.

Closing that gap needs one of two things: the main application runs these files
and reports the diff, or it exports its own component-level expectations and any
disagreement is resolved into a single agreed set.
`POST /api/simulations/education/stress-model/evaluate` exists so the first
option is cheap — post a fixture's `input.weeks`, diff the components.

Alongside parity: unit tests per component and per adjustment type, determinism
tests asserting byte-identical output across repeated runs, and the integration
suite extended with the v1 endpoints.

---

## 6. Backwards compatibility

| Concern | Handling |
|---|---|
| Stored cases | Tagged `legacy-0`, rendered by the existing calculator. Never recomputed. |
| Existing POST payloads | Accepted. `assignment_hours`/`exam_hours` default to 0, `teaching_hours` maps to `lecture_hours`, and a `legacy_payload_upconverted` warning is returned. |
| `teaching_hours` naming | Both accepted on input; both emitted on output for one release. |
| Week keys | Both `week_index` and `week_number` always emitted; inconsistent input is a validation error, not a guess. |
| Existing 4 scenarios | Preserved as generated scenarios, now flowing through the shared engine. |

---

## 7. What was built

All eight phases are done. The model was implemented exactly as specified —
every constant, threshold and order of operations in §4 and §5 of the request.

| Area | Files |
|---|---|
| Model core (pure, no backend imports) | [stressModel/](../../backend/src/services/stressModel/) — `constants`, `primitives`, `week`, `trajectory`, `scheduleBuilder` |
| Adjustment engine | [education/](../../backend/src/services/education/) — `adjustments`, `simulate`, `redistribute`, `compare`, `legacyBridge`, `optimizer` |
| API | [educationStressV1Routes.ts](../../backend/src/routes/educationStressV1Routes.ts), [educationSchemas.ts](../../backend/src/routes/educationSchemas.ts), extended [educationalStressRoutes.ts](../../backend/src/routes/educationalStressRoutes.ts) |
| Persistence | [db/education_stress_v1_migration.sql](../../db/education_stress_v1_migration.sql), synced into `db/schema.sql` and `backend/src/db/schema.ts` |
| UI | [StressTrajectoryChart](../../ui/src/components/stress/StressTrajectoryChart.tsx), [WeeklyStressTable](../../ui/src/components/stress/WeeklyStressTable.tsx), [AdjustmentBuilder](../../ui/src/components/stress/AdjustmentBuilder.tsx), [ScenarioAuditPanel](../../ui/src/components/stress/ScenarioAuditPanel.tsx), [EducationalStressV1View](../../ui/src/components/stress/EducationalStressV1View.tsx) |
| Tests | 275 total: 237 unit (including the 18 parity fixtures) + 38 integration |

### Verification

Two things were done beyond the unit suite, because "we implemented the
equations" is a weak claim on its own:

1. **Independent cross-check.** The §4/§5 equations were implemented a second
   time, directly from the request text, and the two implementations were
   compared over a randomised sweep of the whole input space — 20,000 single
   weeks and 400 multi-week trajectories with mixed observations. 196,752
   scalar comparisons, zero mismatches at 1e-12. The second implementation is
   [probe_model.ts](probe_model.ts).

2. **Determinism.** The model, the schedule builder and the whole pipeline are
   pure functions with no clock and no random source, asserted by tests that
   run them repeatedly and compare byte-for-byte. The previous calculator
   called `Math.random()`, which made parity testing impossible.

### The one deliberate departure, and why

§8 gives a primary objective (`min max_w S_w`) *and* a set of threshold
constraints (warning 75, critical 85). Both are implemented and both are
reported. But the **scenario search is driven by the primary objective**, not by
the thresholds.

That is forced by §3.1: the thresholds cannot fire. A threshold-driven search —
which is what the old engine did, and what a literal reading of §8's constraint
list suggests — would return "nothing to do" for every course ever submitted.
Optimising the stated primary objective instead makes the tool work and is
equally faithful to §8.

On the seeded 12-week course this takes the peak from 59.95 to 49.11.

## 8. Scope boundaries

**In:** everything in §4 and §7.

**Out, and deliberately so:**

- Extracting the model to a published shared package. We structure for it
  (D1) but do not own the main app's build.
- Student-level or physiological stress. The request is explicit that this is
  a course-plan model.
- Changing the main application. We can only make our side match and give them
  an endpoint to check against.
- An exact solver for §8's objective. The generator does a greedy descent on
  peak stress — it finds good adjustment lists, not provably optimal ones.

---

## 9. Risks

| Risk | Status |
|---|---|
| No reference fixtures from the main app, so parity is asserted rather than tested | **Open.** Mitigated as far as we can from this side: an independent second implementation agrees with ours across 196,752 comparisons, and `stress-model/evaluate` lets the other system check us continuously. It still needs someone on that side to run it. |
| Thresholds unreachable (§3.1) | **Handled, needs confirmation.** Implemented and reported as specified; the search runs on the primary objective instead, so the tool works. If the thresholds were meant to be meaningful, see §10. |
| Homework skew (§3.2) reshapes every baseline | **Handled.** Implemented as written. No stored case is recomputed in place — pre-v1.0 cases stay on `legacy-0` — and the rebuild diff surfaces disagreement with a supplied schedule immediately. |
| Model drifts again after this work | **Mitigated.** Versioned config block, model version on every stored row, `GET /stress-model` for boot-time assertion, and shared fixtures in version control. The model directory imports nothing from the rest of the backend, so it can be extracted to a package without moving logic. |

---

## 10. Decisions taken, and what to confirm

The instruction was to trust the specification completely, so nothing here
blocked delivery. These are the points where the request was silent or where
following it has a consequence worth knowing about.

### Decisions taken where the specification was silent

**Exam side-effect ordering (§3.5).** The rules `H_{x-1} += 2` and
`H_{x+1} ← 0.7 H_{x+1}` are not commutative: for exams in weeks `x` and `x+2`,
week `x+1` gets both, and `(H × 0.7) + 2 ≠ (H + 2) × 0.7`. We build exams in
**chronological order**, ties broken by `exam_id`, each exam applying all three
of its effects before the next is processed. The full build order — lectures
and labs, then homework, then assignments, then exams — is returned by
`GET /stress-model` under `schedule_build.build_order` so the other system can
check it against its own.

**Extension cap (§6.2).** "At most two extensions per assignment" is read as
two extension *events*, not two weeks of total extension. It is configurable
per case.

**`new_end_week` in extension records.** One-based, matching `original_end_week`
and the displayed week number.

**Authority when both are supplied (§9).** A supplied `week_schedules` becomes
the baseline; our own rebuild is used only to check agreement, and any week
differing by more than 1e-6 is reported as a `schedule_rebuild_mismatch`
warning. A rebuild only happens when an adjustment actually changes an
assignment or exam. (Up-converted legacy payloads skip this check — their
schedule cannot match a rebuild by construction, and warning on every week
would bury the warnings that matter.)

**Past weeks.** §8 restricts redistribution targets to future weeks. We
generalise: by default, no week-level adjustment may target a week before the
current one, and the past is identical between baseline and simulation. Set
`allow_past_week_changes` to lift it.

### Consequences worth confirming

**The thresholds cannot fire (§3.1).** Implemented as specified. Reported in
every response. Never reached by any input. The user-facing guide tells
instructors to compare weeks against each other rather than against the bands,
and the scenario search is driven by the primary objective instead — see §7.

If the intent was for these thresholds to be meaningful, one of three things
needs to change, and all three are one-line edits here:
 (a) rescale the thresholds (warning ≈ 45, critical ≈ 55 sit at comparable
 percentiles of the reachable range);
 (b) raise `soft_cap_softness` above 0.82 so the range is actually used;
 (c) treat the bands as belonging to a blended clinical scale that the
 schedule model only feeds, and stop gating on them entirely.

**Homework skew (§3.2).** `((i+1)/N)^2.5` is applied across the whole semester
as written. For 100h over 12 weeks that is 0.05h in week 1 and 25.3h in week 12,
which structurally guarantees a final-week peak whatever the instructor planned.
If the intent was a flat semester-wide distribution with the skew applying only
per-assignment (§3.4), that is a one-line change in `scheduleBuilder.ts`.

**Exam load counts three times (§3.3).** `E_w = 2d` feeds `P^base` and `P^over`
through `W_w` *and* drives `P^exam`, which also has a 12-point floor.
Implemented as written. The audit output attributes it explicitly, so users
will see it.

**Parity is asserted, not yet tested.** We have no reference fixtures from the
main application, so our expected values are our own. Running
`POST /stress-model/evaluate` from that side against
[parity/](parity/) closes this — see
[parity/README.md](parity/README.md).
