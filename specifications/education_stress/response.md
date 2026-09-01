# Re: What-If Tool — Stress Prediction and Course Adjustment Specification

**From:** AI4Work What-If Tool team
**Date:** 2026-08-24
**Re:** [request.md](request.md)
**Their answer:** [decisions.md](decisions.md) (2026-08-25) · **our follow-up:** [followup.md](followup.md)

---

Thanks for the specification — it was detailed enough to implement directly,
which is rare and made this much faster.

**It is done and merged.** We implemented `course_stress_prediction` v1.0
exactly as written: every constant, every component threshold, the order of
operations, and all ten consistency gaps you listed in §12. The tool now also
supports the assignment and exam adjustments, which it previously had no way
to express at all.

Two things we found while implementing need a decision from you. Neither
blocked us — we implemented the spec as written in both cases — but one of
them changes how you should read our output, so please start there.

---

## 1. Two things that need your decision

### 1.1 The warning and critical thresholds can never fire

This is the important one.

The component maxima sum to `34 + 10 + 12 + 18 + 30 + 14 = 118`, and fatigue
adds at most `0.07 × S`. Solving the fixed point through the soft cap
`Ŝ = 90(1 − e^{−0.82R/90})`:

| Path | Maximum attainable `S_w` |
|---|---|
| Schedule only (§4) | **60.45** |
| + maximum learned bias `b = +12` (§5.2) | **72.45** |
| + observed blend with `O_w = 90` (§5.1) | **73.75** |

§2 puts **High** at `> 66`, warning at `≥ 75` and critical at `≥ 85`. Under
v1.0 as specified, no input whatsoever reaches even the warning line. A
70-hour week with a maximum-difficulty exam scores about 60. The
classification tops out permanently in "Moderate".

Some real evaluations, so you can check these against your own implementation.
Each week here is evaluated **on its own**, so `P^fatigue = 0` and the numbers
are directly reproducible by posting a single week to
`POST /stress-model/evaluate` (§4.2) — no assumed predecessor (`L, B, H, A, E`):

| Week | `W` | `R` | `S` | Band |
|---|---|---|---|---|
| 3, 2, 8, 3, 0 — ordinary | 16 | 24.7 | 18.13 | Low |
| 3, 2, 16, 0, 0 — homework-heavy | 21 | 35.6 | 24.92 | Low |
| 3, 2, 4, 14, 0 — assignment-heavy | 23 | 46.0 | 30.82 | Low |
| 3, 2, 10, 8, 6 — exam, difficulty 3 | 29 | 78.0 | 45.78 | Moderate |
| 3, 2, 12, 12, 10 — exam, difficulty 5 | 39 | 101.8 | 54.40 | Moderate |
| 10, 10, 20, 20, 10 — every component saturated | 70 | 118.0 | 59.29 | Moderate |

The last row is the useful one for cross-checking: `R = 118.0` is exactly the
sum of the six component maxima, so if your implementation agrees there, your
component parameters match ours. The 60.45 ceiling in the table above is that
same week's fixed point once fatigue is allowed to accumulate across a
semester.

**What this meant for us.** §8 gives both a primary objective
(`min max_w S_w`) and a set of threshold constraints. Our previous engine
triggered entirely on thresholds — "adjust weeks above critical" — so adopting
v1.0 verbatim would have turned every generated scenario into a no-op for
every course ever submitted.

So we drive the scenario search off **your stated primary objective** instead:
minimise peak predicted stress. The thresholds are still implemented and
reported in every response; they simply never fire. On our seeded 12-week
course this takes the peak from 59.95 to 49.11, so the tool does useful work.

**What we need from you.** If the thresholds were meant to be meaningful, one
of these needs to change — all three are one-line edits on our side:

- **(a)** rescale the thresholds. Warning ≈ 45 and critical ≈ 55 sit at
  comparable percentiles of the reachable range.
- **(b)** raise `soft_cap_softness` above 0.82 so the 0–90 range is actually
  used.
- **(c)** treat the bands as belonging to a blended clinical scale that the
  schedule model only feeds, and stop gating on them entirely.

If you intended (c), everything already works — just tell us and we will drop
the thresholds from the UI so instructors are not misled by a "Moderate" label
on their worst week.

In the meantime our user documentation tells instructors explicitly:
**compare weeks against each other, not against the bands.** A week scoring 55
in a semester whose median is 20 is the problem week, whatever the label says.

### 1.2 Semester-wide homework skew is very aggressive

§3.3 spreads *all* course homework by `((i+1)/N)^2.5`. For `H_total = 100` and
`N = 12` that is:

```
0.05  0.29  0.79  1.63  2.84  4.48  6.59  9.20  12.35  16.07  20.39  25.34
```

Week 1 gets three minutes; week 12 gets 25 hours — before assignments and
exams are added on top. The model is then structurally guaranteed to peak in
the final week whatever the instructor actually planned.

The same `^2.5` weighting applied *per assignment* (§3.4) is well motivated —
pressure rising toward a deadline is exactly right. Applying it across a whole
semester is a different claim.

**Question:** is the semester-wide distribution meant to be flat, with the
skew applying only per-assignment? We implemented §3.3 as written; changing it
is one line.

---

## 2. Two smaller things we implemented as written

Flagging these because our audit output attributes them explicitly, so your
users will see them and ask.

**Exam load is counted three times.** `E_w = 2d` is a pressure value, not real
hours, yet it enters `W_w` — which feeds both `P^base` and `P^over` — *and*
drives `P^exam`, which additionally has a 12-point floor for any non-zero
exam. In the difficulty-3 exam week above, exam-attributable pressure is 27 of
`R = 80.1`, plus its contribution through base load. Intended?

**The 12-point exam floor is a discontinuity.** A difficulty-0.05 exam and a
difficulty-3 exam differ by 15 points, but *having* an exam versus not having
one differs by at least 12. That is a large cliff for a schedule-level model.
Worth confirming it is deliberate.

---

## 3. Decisions we took where the spec was silent

We picked something sensible in each case and documented it. Tell us if any
differs from your implementation — these are the places two faithful readings
can diverge.

**Exam side-effect ordering (§3.5).** The rules `H_{x−1} += 2` and
`H_{x+1} ← 0.7 H_{x+1}` are not commutative. With exams two weeks apart, week
`x+1` receives both, and `(H × 0.7) + 2 ≠ (H + 2) × 0.7`. We build exams in
**chronological order**, ties broken by `exam_id`, each exam applying all three
of its effects before the next is processed. Our full build order is:

1. lectures and labs into every week
2. homework across the semester
3. assignment hours across each active span
4. exams, chronologically

You can read this back at runtime from `GET /stress-model` under
`schedule_build.build_order`, so you can assert it matches yours.

**Extension cap (§6.2).** "At most two extensions per assignment" is read as
two extension *events*, not two weeks of total extension. Configurable per
case.

**`new_end_week` in extension records** is one-based, matching
`original_end_week` and the displayed week number.

**Authority when both are supplied (§9).** If a payload carries both
`week_schedules` and the assignment/exam domain objects, we take the supplied
schedule as the baseline and use our own rebuild only to check agreement — any
week differing by more than 1e-6 comes back as a `schedule_rebuild_mismatch`
warning. We only rebuild when an adjustment actually changes an assignment or
exam.

**Past weeks.** §8 restricts redistribution targets to future weeks. We
generalised it: by default no week-level adjustment may target a week before
the current one, and the past is identical between baseline and simulation.
Settable per request via `allow_past_week_changes`.

**Redistribution objective (§7).** Default is the `local_week` rule, matching
your current implementation, and the response says so in `known_limitations`.
`trajectory_peak` — recompute the whole semester per candidate and minimise
peak — is available per request. We did not make it the default because you
asked for compatibility first.

---

## 4. How to use it

Base URL in our dev environment: `https://backend.localhost/api/simulations/education`

### 4.1 Check which model a deployment is running

```bash
curl -ksS $BASE/stress-model | jq .stress_model
```

Returns the exact constants, component thresholds and schedule-construction
order in use. **We suggest asserting against this at boot on your side** — it
is the cheapest possible guard against the two systems drifting apart again.

### 4.2 Evaluate the model directly — the parity harness

This is the endpoint §13 effectively asks for. Weeks in, every intermediate
component out. Nothing is persisted.

```bash
curl -ksS -X POST $BASE/stress-model/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"weeks":[
        {"lecture_hours":3,"lab_hours":2,"homework_hours":8,"assignment_hours":3,"exam_hours":0},
        {"lecture_hours":3,"lab_hours":2,"homework_hours":10,"assignment_hours":8,"exam_hours":6,"actual_stress":55}
      ]}' | jq '.weeks[].components'
```

You get `base`, `teaching`, `homework`, `assignment`, `exam`, `overload`,
`fatigue`, `raw`, `soft_capped`, `schedule_only`, plus `calibration_bias_in` /
`calibration_bias_out` and the final `predicted_stress` — everything §13 asks
to be compared, not just final stress.

Week order matters: the fatigue term reads the previous week's *final* stress,
so weeks cannot be evaluated independently. Pass
`"use_observed_stress": false` to isolate the schedule-only model.

### 4.3 Create a case

The payload now carries the domain objects, per §9:

```json
{
  "name": "Full-Stack Web Development - Autumn 2026",
  "course": {
    "course_name": "Full-Stack Web Development",
    "course_id": "CS-220",
    "start_date": "2026-09-01T00:00:00Z",
    "end_date": "2026-11-24T00:00:00Z",
    "topic_difficulty": 4,
    "total_homework_hours": 120,
    "course_sessions": [{ "day": "Monday", "start_time": "10:00", "end_time": "12:00" }],
    "lab_sessions":   [{ "day": "Friday", "start_time": "13:00", "end_time": "15:00" }],
    "assignments": [
      {
        "assignment_id": "assignment-1",
        "name": "Project report",
        "start_date": "2026-09-29T00:00:00Z",
        "end_date": "2026-10-26T23:59:59Z",
        "estimated_hours": 30,
        "extensions": []
      }
    ],
    "exams": [
      { "exam_id": "exam-1", "name": "Final examination", "date_time": "2026-11-10T09:00:00Z" }
    ]
  },
  "observed_stress": [
    { "week_number": 1, "value": 22.0 },
    { "week_number": 2, "value": 28.5 }
  ],
  "current_status": { "current_week_index": 2 }
}
```

`week_schedules` is optional. Supply it and it becomes the baseline, with our
rebuild used only to diff. Omit it and we build from the course.

**Read the `warnings` array in the response.** It is where we tell you what we
could not do.

### 4.4 Simulate a what-if

```bash
curl -ksS -X POST $BASE/$CASE_ID/scenarios \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Move the exam and ease the run-up",
    "adjustments": [
      { "id": "adj-001", "type": "move_exam", "exam_id": "exam-1",
        "new_date": "2026-11-17T09:00:00Z",
        "reason": "Separate two high-pressure assessment weeks" },
      { "id": "adj-002", "type": "extend_assignment", "assignment_id": "assignment-1",
        "new_end_date": "2026-11-02T23:59:59Z",
        "reason": "Reduce the predicted stress peak" },
      { "id": "adj-003", "type": "move_homework",
        "source_week_index": 11, "target_week_index": 5, "hours": 6.0,
        "reason": "Reduce the final-week peak" }
    ],
    "options": { "redistribution_objective": "trajectory_peak" }
  }'
```

All nine adjustment types from §6 are supported: `cancel_lecture`,
`cancel_lab`, `reduce_homework`, `move_homework`, `move_assignment`,
`update_assignment`, `extend_assignment`, `move_exam`, `cancel_exam`.

They are applied in the §6.4 order — clone, domain changes, rebuild, week-level
changes, sequential recalculation, comparison — which is what stops a rebuild
from discarding a week-level edit.

### 4.5 Two things to know when reading the response

**A 201 does not mean every adjustment applied.** Each one gets its own
outcome:

```bash
jq '.adjustment_outcomes[] | {id: .adjustment_id, status, code, message}' result.json
```

`status` is `applied`, `partially_applied` or `rejected`, always with a
machine-readable `code` — `week_in_past`, `date_outside_semester`,
`extension_not_later`, `extension_limit_reached`, `insufficient_homework`,
`assignment_has_no_hours`, and so on. Nothing fails silently (§12.9). If you
integrate against this, read `adjustment_outcomes`; treating the status code as
success will misreport what happened.

**A scenario that ran is not a scenario that helped.** Check
`objective.improved`. Moving workload onto an already-bad week makes things
worse, and we report that rather than hiding it — the example above actually
raises the peak slightly, because moving the exam to the last week lands it on
top of the heaviest homework.

The response also carries: both weekly schedules and trajectories,
`redistribution_flows` (source, target, hours, workload type, target stress
before and after, impact), `extensions_applied` with full metadata, peak and
warning/critical weeks before and after, the objective improvement, and the
model version and parameters. That is all of §11.

### 4.6 In the UI

Instructors get a baseline-vs-simulated chart, a per-week table where each row
expands to the seven components behind its score, a **what-if builder** for
composing adjustments by hand, and an audit panel showing every applied,
partial and rejected adjustment with its reason. The AI chat is grounded in
the component breakdown, so it cites what actually drove a week rather than
paraphrasing one number.

---

## 5. Parity — what we need from you

We shipped 18 fixtures covering every case in §13, at
`specifications/education_stress/parity/`. Each is self-contained: inputs plus
expected output, compared component-by-component at `|Δ| < 1e-6`.

**The expected values in them are ours.** We wrote the inputs by hand and
generated the expected blocks from our implementation. So today they prove our
implementation is self-consistent and has not regressed. They do **not** prove
the two systems agree.

Closing that needs one of two things, and the first is cheap:

1. **Run our fixtures.** Post each `kind: "model"` fixture's `input.weeks` to
   `POST /stress-model/evaluate`, or through your own code, and diff against
   its `expected.weeks`. Send us anything that differs.
2. **Send us yours.** If you export your own component-level expectations we
   will reconcile the two sets into one agreed file.

Until one of those happens, please treat our "parity" as *implemented to the
written specification*, which is not the same thing. We would rather say that
plainly than imply more than we have verified.

### What we did do to raise confidence

We implemented the §4 and §5 equations a **second time**, independently, from
your specification text, and compared the two implementations across a
randomised sweep of the whole input space: 20,000 single weeks and 400
multi-week trajectories with mixed observations. **196,752 scalar comparisons,
zero mismatches at 1e-12.** That rules out transcription errors on our side.
It cannot rule out both of us reading an ambiguous passage the same wrong way,
which is what your fixtures would catch.

### One request about your implementation

§13 parity requires both sides to be pure functions. Ours now is — no clock,
no random source, asserted by tests that run the model repeatedly and compare
byte-for-byte. Worth checking on your side: our previous calculator generated
a student distribution with `Math.random()`, which would have made exact
comparison impossible no matter how correct the formula was.

---

## 6. Acceptance criteria (§14)

| Criterion | Status |
|---|---|
| Same input produces the same weekly stress values in both systems | **Pending** — needs a run from your side (§5) |
| Homework, assignments and exams represented separately | Done |
| Reduce or move homework | Done |
| Move, update and extend assignments | Done |
| Move and cancel exams | Done |
| Assignment/exam changes trigger a correct rebuild | Done |
| Stress recalculated sequentially for the whole semester | Done |
| Baseline and simulated results comparable | Done |
| All actions, flows, warnings and model parameters returned | Done |
| Automated parity tests pass for all agreed fixtures | Fixtures exist and pass; "agreed" pending (§5) |

All ten gaps in §12 are closed. §12.7 and §12.8 did not apply to us in the
form you described — we had neither a second distribution rule nor
positional observation mapping, because we had no assignment hours and no
observed stress at all. We implemented the gamma-weighted rule and date-based
matching directly.

---

## 7. Backwards compatibility

Nothing of yours breaks.

- **Your existing payload still works.** We up-convert it and return warnings
  naming exactly what could not be recovered — `assignment_hours` was folded
  into `homework_hours` (§12.1) so the split is unrecoverable, and there were
  no exams (§12.2). Both come through as 0, which materially changes the
  numbers, so the warnings say so rather than letting it pass quietly.
- **Cases created before v1.0** are tagged `stress_model.version: "legacy-0"`,
  still render through the original calculator, and are never recomputed in
  place. Their numbers came from a different formula family with a different
  range and are not comparable with v1.0 numbers. We deliberately did not
  migrate them.

---

## 8. On the shared library (§9)

We agree with your reasoning, and structured for it: the model lives in its
own directory that imports nothing from the rest of our backend, so it can be
extracted to a published package without moving any logic. We did not extract
it because we do not own your build.

If you want to go that way, the practical sequence is: we publish
`@ai4work/course-stress-model` from that directory, you depend on it, and the
fixtures move into the package. Happy to do our half whenever you are ready.

Until then, `GET /stress-model` plus the shared fixtures are the drift guard.

---

## 9. What we would like back

In rough priority order:

1. **Your answer on the thresholds (§1.1).** This one changes what instructors
   see, so it is the one we would like first.
2. **Your reading of the homework skew (§1.2).**
3. **A parity run against our fixtures**, or your own expected values (§5).
4. Confirmation on exam triple-counting and the 12-point floor (§2), and on
   the ordering decisions in §3.

Anything you find where our numbers differ from yours, send us the input and
we will chase it down. Thanks again for a spec we could actually build from.

---

### Reference

- Our design notes and findings: `specifications/education_stress/design.md`
- API contract: `specifications/education_stress/specification.yml`
- Parity fixtures: `specifications/education_stress/parity/`
- Instructor-facing guide: `instructions/education/getting_started.md`
- Your original request, kept verbatim: `specifications/education_stress/request.md`
