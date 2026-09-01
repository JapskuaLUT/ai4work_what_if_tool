# Education what-if — getting started

Zero prior knowledge assumed. This walks through what the education side of the
What-If Tool does, how to use it, and how to read the numbers it gives you.

- **What it is for:** deciding whether a change to a course plan — moving an
  exam, extending a deadline, cancelling a lecture — actually reduces the
  pressure the plan puts on students, before you commit to it.
- **What it is not:** a measurement of any individual student's stress. It
  models the *course plan*, not people. It is not a clinical instrument and
  should not be used as one.

---

## 1. The model in one page

Each week of the semester has five workload numbers:

| Field | Meaning |
|---|---|
| `lecture_hours` | scheduled lectures |
| `lab_hours` | scheduled laboratories |
| `homework_hours` | general homework and independent study |
| `assignment_hours` | work attributed to currently-active assignments |
| `exam_hours` | exam pressure — 2 × course difficulty, not real hours |

They are kept separate on purpose. Homework, assignment and exam load each
contribute differently and cap differently, so folding them together changes
the answer. An earlier version of this tool merged assignments into homework;
that is the main thing v1.0 fixed.

From those five numbers the model computes seven components — base load,
teaching density, homework, assignment, exam, overload, and a **fatigue
carry-over** worth 7% of *last week's* final score — sums them, and squashes the
sum into a 0–90 range.

**The fatigue term is why week order matters.** You cannot evaluate one week on
its own and get the right answer; the semester has to be computed front to back.

### Reading the numbers

**The number is the course's *contribution* to stress, not anyone's total
stress level.** The model owners have confirmed this interpretation
([decisions.md](../../specifications/education_stress/decisions.md)): a
student already carries a personal baseline of roughly 25–40 points — health,
work, life — that the model cannot see. What this tool predicts is what the
course plan *adds on top*. Schedule-only predictions top out around **60.45**;
even a 70-hour week with a maximum-difficulty exam scores about 60.

Thresholds shown in the tool are calibrated to that course-model scale:

| Threshold | Value | Meaning |
|---|---|---|
| Course warning | **45** | the course alone is adding a lot |
| Course critical | **55** | the course alone is near the model's ceiling |

(The specification also defines warning 75 / critical 85 — those apply to the
*total*-stress scale, baseline plus course, and can never fire on this model's
output. If an API caller passes them, the response says so with a
`thresholds_exceed_model_range` warning.)

The Low (0–33) / Moderate (33–66) / High (66–90) band labels come from the
shared specification. Under the additive interpretation, "High" is out of
reach for schedule-only predictions — so still **compare weeks against each
other** as well as against the thresholds. A week scoring 55 in a semester
whose median is 20 is your problem week, whatever the band label says.

### Where the weekly numbers come from

If you give the tool a course definition rather than a pre-built schedule, it
builds the weeks itself:

1. lectures and labs are added to every week
2. total homework is spread across the semester, heavily weighted toward the
   end — with 100h over 12 weeks, week 1 gets about 3 minutes and week 12 gets
   about 25 hours
3. each assignment's hours are spread over its active span, again weighted
   toward its deadline
4. each exam adds its load to its own week, adds 2h homework to the week
   before, and cuts the following week's homework by 30%

Exam and assignment effects are *derived*, never stored. That is what makes
"cancel this exam" work properly: rebuild without it and all three of its
effects vanish.

---

## 2. Using it

### Create a case

```sh
BASE=https://backend.localhost/api/simulations/education

CASE_ID=$(curl -ksS -X POST $BASE/ \
    -H 'Content-Type: application/json' \
    -d @specifications/examples/education/03_create_simulation_v1.json \
  | jq -r .caseId)

echo "https://app.localhost/education/$CASE_ID"
```

The response includes `warnings`. Read them. If you sent the older payload
format they will tell you that assignment and exam load could not be recovered,
which changes the numbers substantially.

### Look at it

Open the results URL. You get:

- **Overview** — the baseline trajectory and every scenario ranked by peak
  stress.
- **One tab per scenario** — chart, audit trail, and a week table where each row
  expands to the seven components behind its score.
- **New what-if** — build your own.

### Build a what-if

In the *New what-if* tab, pick adjustments and hit Simulate. Available moves:

| Adjustment | What it does |
|---|---|
| Cancel lecture / lab | zeroes that week's hours and moves them to later weeks, at most 3h at a time, always choosing the week where they cost least |
| Reduce homework | subtracts hours; those hours are gone, not moved |
| Move homework | moves hours between weeks, capped at what the source week actually has |
| Move assignment | new start and end dates; hours redistribute over the new span |
| Update assignment | change dates and/or estimated hours |
| Extend assignment | push the deadline out; recorded with a reason and a timestamp |
| Move exam | relocates the exam and both of its neighbour effects |
| Cancel exam | removes the exam and everything it caused |

Order is fixed and matters: assignment and exam changes are applied first, the
weekly schedule is rebuilt, and only then are lecture/lab/homework changes
applied. Otherwise the rebuild would wipe out your week-level edits.

### Read the result honestly

A successful request does **not** mean every adjustment worked. Each one comes
back as `applied`, `partially_applied` or `rejected`, with a reason. Common
rejections:

| Code | Meaning |
|---|---|
| `week_in_past` | the week has already happened; the current week is set on the case |
| `date_outside_semester` | the new date falls outside the course dates |
| `extension_not_later` | the new deadline is not later than the current one |
| `extension_limit_reached` | the policy caps extensions per assignment |
| `insufficient_homework` | the source week had less homework than you asked to move |
| `assignment_has_no_hours` | the assignment carries 0 hours, so the change moves nothing |

And a scenario that *ran* is not a scenario that *helped*. Check
`objective.improved`. Moving workload onto an already-bad week makes things
worse, and the tool will tell you so rather than hiding it.

---

## 3. From the API

Same thing without the UI:

```sh
# Simulate
curl -ksS -X POST $BASE/$CASE_ID/scenarios \
    -H 'Content-Type: application/json' \
    -d @specifications/examples/education/04_create_scenario.json > result.json

# Did it help?
jq '{baseline: .baseline.summary.peak_stress,
     simulated: .simulation.summary.peak_stress,
     improved: .objective.improved}' result.json

# What actually happened to each adjustment?
jq '.adjustment_outcomes[] | {id: .adjustment_id, status, code, message}' result.json

# Where did cancelled teaching hours go?
jq '.redistribution_flows' result.json
```

Two options worth knowing:

- `options.redistribution_objective` — `local_week` (default) scores candidate
  weeks in isolation and matches the main application. `trajectory_peak`
  recomputes the whole semester per candidate and genuinely minimises peak
  stress. The default is the compatible one, and it says so in
  `known_limitations` when used.
- `options.allow_past_week_changes` — off by default, so you cannot rewrite
  weeks that already happened.

### Checking the model itself

```sh
# What model is this backend running?
curl -ksS $BASE/stress-model | jq .stress_model

# Run weeks through it directly and see every component
curl -ksS -X POST $BASE/stress-model/evaluate \
    -H 'Content-Type: application/json' \
    -d '{"weeks":[{"lecture_hours":3,"lab_hours":2,"homework_hours":8,"assignment_hours":3,"exam_hours":0}]}' \
  | jq '.weeks[0].components'
```

That second endpoint is how the main AI4Work application should check that the
two systems still agree — see
[the parity fixtures](../../specifications/education_stress/parity/README.md).

---

## 4. Older cases

Cases created before v1.0 are tagged `stress_model.version: "legacy-0"` and
still open in the original view. Their numbers came from a completely different
formula with a different range, and are **not** comparable with v1.0 numbers.
Nothing recomputes them in place; create a new case to get v1.0 results.

The older creation payload is still accepted and up-converted, but assignment
hours and exams cannot be reconstructed from it — the response says so
explicitly.

---

## 5. Glossary

| Term | Meaning |
|---|---|
| **Baseline** | the course as planned, before any adjustment |
| **Scenario** | one adjustment list plus its simulated result |
| **Component** | one of the seven terms summed into a week's raw score |
| **Fatigue carry-over** | 7% of the previous week's final stress, added to this week |
| **Soft cap** | the curve that squashes the raw sum into 0–90 |
| **Calibration bias** | a correction learned from observed stress and carried forward |
| **Redistribution flow** | one placement of cancelled teaching hours into a later week |
| **`week_index` / `week_number`** | zero-based (canonical) / one-based (display). API responses carry both. |
| **Peak stress** | the highest weekly score in the semester — the thing optimisation minimises |

---

## 6. Further reading

- [The original request](../../specifications/education_stress/request.md) — the
  shared specification, reproduced verbatim.
- [Design document](../../specifications/education_stress/design.md) — how it was
  implemented, and what we found while implementing it.
- [API contract](../../specifications/education_stress/specification.yml).
- [Parity fixtures](../../specifications/education_stress/parity/README.md).
