# What-If Tool: Stress Prediction and Course Adjustment Specification

> **Source:** received from a user of the education what-if tool, 2026-08-24.
> Reproduced verbatim. Our analysis and implementation design live in
> [design.md](design.md).

## 1. Purpose

This document defines the functionality required for the education what-if tool so that its simulations remain consistent with the course stress prediction used by the main AI4Work education application.

The what-if tool must:

1. use the same weekly course stress prediction formula as the main application;
2. maintain homework, assignment, and exam workload as separate variables;
3. support assignment- and exam-related adjustments in addition to homework adjustments;
4. rebuild the affected weekly schedules after domain-level changes;
5. recalculate the complete semester stress trajectory after every scenario;
6. return an auditable comparison between the original and simulated schedules.

This is a **course-level workload stress prediction model**. It estimates the pressure created by the course plan. It is not a replacement for real-time, student-level stress detection based on physiological and self-reported measurements.

---

## 2. Scope and terminology

Let a semester contain $N$ weeks, indexed by:

$$
w \in \{0,1,\ldots,N-1\}.
$$

For every week $w$, the schedule must contain the following non-negative workload variables:

| Symbol | Field | Meaning |
|---|---|---|
| $L_w$ | `lecture_hours` | Scheduled lecture hours |
| $B_w$ | `lab_hours` | Scheduled laboratory hours |
| $H_w$ | `homework_hours` | General homework or independent-study hours |
| $A_w$ | `assignment_hours` | Work attributed to active assignments |
| $E_w$ | `exam_hours` | Exam-related pressure/load value |
| $S_w$ | `predicted_stress` | Final predicted stress for week $w$ |
| $O_w$ | `actual_stress` | Optional observed stress for week $w$ |

All workload fields must be stored separately. In particular:

$$
\texttt{homework\_hours} \neq
\texttt{homework\_hours}+\texttt{assignment\_hours}.
$$

Combining assignment hours with homework hours changes the stress result because the model gives assignments a different contribution and cap. Exams must also be included explicitly.

The output stress range is:

$$
0 \leq S_w \leq 90.
$$

The interpretation is:

| Range | Classification |
|---|---|
| $0 \leq S_w \leq 33$ | Low |
| $33 < S_w \leq 66$ | Moderate |
| $66 < S_w \leq 90$ | High |
| $S_w \geq 75$ | Warning |
| $S_w \geq 85$ | Critical |

---

## 3. Weekly schedule construction

The what-if tool must either receive the already constructed weekly schedule from the main application or reproduce the following construction rules exactly.

### 3.1 Semester length

Given course start date $d_s$ and end date $d_e$, the number of weeks is:

$$
N=\left\lceil\frac{\operatorname{days}(d_e-d_s)}{7}\right\rceil.
$$

The internal index is zero-based, while the displayed week number is one-based:

$$
\text{weekNumber}_w=w+1.
$$

### 3.2 Lectures and laboratories

For each recurring academic activity, its duration is:

$$
D=\frac{\text{end time in minutes}-\text{start time in minutes}}{60}.
$$

The duration is added to every semester week as either lecture load $L_w$ or laboratory load $B_w$, according to the activity type.

### 3.3 Homework distribution

Let $H_{\text{total}}$ be the total course homework hours. Homework is distributed across all $N$ weeks using normalized right-skewed weights:

$$
q_i=\left(\frac{i+1}{N}\right)^{2.5},
\qquad
g_i=\frac{q_i}{\sum_{j=0}^{N-1}q_j}.
$$

The homework load of week $i$ is:

$$
H_i=H_{\text{total}}g_i.
$$

### 3.4 Assignment distribution

For assignment $a$, let:

- $h_a$ be its estimated total hours;
- $s_a$ be its first active week;
- $e_a$ be its deadline week;
- $n_a=e_a-s_a+1$ be its active span.

The indices must be clamped to the valid semester range. Assignment hours are distributed across the active span using the same right-skewed weighting:

$$
q_{a,i}=\left(\frac{i+1}{n_a}\right)^{2.5},
\qquad
g_{a,i}=\frac{q_{a,i}}{\sum_{j=0}^{n_a-1}q_{a,j}}.
$$

For $i=0,\ldots,n_a-1$:

$$
A_{s_a+i}\mathrel{+}=h_a g_{a,i}.
$$

Therefore, assignment pressure increases as the deadline approaches. Moving a start date, moving a deadline, extending a deadline, or changing estimated assignment hours requires the assignment distribution to be calculated again.

### 3.5 Exam load

For exam $e$, let $x_e$ be its week and let $d$ be the course difficulty. The current implementation adds:

$$
E_{x_e}\mathrel{+}=2d.
$$

It also applies the current surrounding-week rules:

$$
H_{x_e-1}\mathrel{+}=2
\quad\text{if }x_e-1\geq 0,
$$

and:

$$
H_{x_e+1}\leftarrow0.7H_{x_e+1}
\quad\text{if }x_e+1<N.
$$

These rules mean that moving or cancelling an exam changes more than the exam week. The schedule must be rebuilt so that the old exam effects are removed and the new effects are applied only at the correct weeks.

---

## 4. Stress prediction model

### 4.1 Input sanitation

Each workload value must first be converted to a safe non-negative value:

$$
\operatorname{safe}(x)=
\begin{cases}
0, & x\text{ is missing, NaN, or infinite},\\
\max(0,x), & \text{otherwise}.
\end{cases}
$$

For clarity, all variables in the following equations refer to sanitized values.

Define:

$$
T_w=L_w+B_w
$$

as structured teaching hours,

$$
I_w=H_w+A_w
$$

as independent-work hours, and:

$$
W_w=L_w+B_w+H_w+A_w+E_w
$$

as total weekly load.

### 4.2 Bounded linear function

Several model components use the bounded linear function:

$$
\operatorname{BL}(x;s,e,m)=
\begin{cases}
0, & x\leq s,\\
m, & x\geq e,\\
m\displaystyle\frac{x-s}{e-s}, & s<x<e.
\end{cases}
$$

Here, $s$ is the activation point, $e$ is the saturation point, and $m$ is the maximum contribution.

### 4.3 Component equations

#### Base weekly load pressure

$$
P^{\text{base}}_w=\operatorname{BL}(W_w;5,30,34).
$$

#### Teaching density pressure

$$
P^{\text{teach}}_w=\operatorname{BL}(T_w;3,14,10).
$$

#### Homework pressure

$$
P^{\text{home}}_w=\operatorname{BL}(H_w;2,16,12).
$$

#### Assignment pressure

$$
P^{\text{assign}}_w=\operatorname{BL}(A_w;1,14,18).
$$

#### Exam pressure

$$
P^{\text{exam}}_w=
\begin{cases}
0, & E_w=0,\\
12+\min(2.5E_w,18), & E_w>0.
\end{cases}
$$

The maximum exam contribution is therefore $30$.

#### True overload pressure

$$
P^{\text{over}}_w=
\begin{cases}
0, & W_w\leq32,\\
\min\left(1.3(W_w-32)^{1.15},14\right), & W_w>32.
\end{cases}
$$

#### Fatigue carry-over

Let the previous final predicted stress be $S_{w-1}$, with $S_{-1}=0$. The fatigue contribution is:

$$
P^{\text{fatigue}}_w=0.07\operatorname{clip}(S_{w-1},0,90).
$$

The use of the previous **final** prediction is important. Stress must be calculated sequentially from the first week to the last; weeks cannot be evaluated independently if exact parity is required.

### 4.4 Raw stress

The raw schedule-based stress is:

$$
R_w=
P^{\text{base}}_w+
P^{\text{teach}}_w+
P^{\text{home}}_w+
P^{\text{assign}}_w+
P^{\text{exam}}_w+
P^{\text{over}}_w+
P^{\text{fatigue}}_w.
$$

### 4.5 Soft saturation

The raw score is compressed using:

$$
\operatorname{SoftCap}(R;c,\sigma)
=c\left(1-\exp\left(-\sigma\frac{R}{c}\right)\right).
$$

With $c=90$ and $\sigma=0.82$:

$$
\widehat{S}_w=
90\left(1-\exp\left(-0.82\frac{R_w}{90}\right)\right).
$$

The schedule-only prediction is:

$$
S^{\text{schedule}}_w=
\operatorname{clip}(\widehat{S}_w,0,90).
$$

This exact equation, constants, component thresholds, and order of operations must be shared by both systems.

---

## 5. Optional observed-stress calibration

Observed stress is optional. A missing, non-finite, or non-positive value is currently treated as unavailable. Valid observed values are clipped to $[0,90]$.

### 5.1 Same-week blending

When valid observed stress $O_w$ exists, the final weekly prediction is:

$$
S_w=\operatorname{clip}
\left(
\alpha O_w+(1-\alpha)S^{\text{schedule}}_w,
0,90
\right),
$$

where:

$$
\alpha=0.45.
$$

Thus, the final result uses 45% observed stress and 55% schedule prediction.

### 5.2 Learned calibration bias

Let $b_w$ be the calibration bias available before predicting week $w$, with:

$$
b_0=0.
$$

When observed stress is available, calculate the schedule-model error:

$$
\varepsilon_w=O_w-S^{\text{schedule}}_w.
$$

Update the bias using learning rate $\eta=0.25$:

$$
b_{w+1}
=\operatorname{clip}
\left(
(1-\eta)b_w+\eta\varepsilon_w,
-12,12
\right).
$$

When observed stress is missing:

$$
S_w=\operatorname{clip}
\left(
S^{\text{schedule}}_w+b_w,
0,90
\right),
$$

and the bias remains unchanged:

$$
b_{w+1}=b_w.
$$

For future-course what-if scenarios, the recommended behavior is to preserve calibration learned from historical weeks and apply it to future weeks. A scenario should not invent observed stress for weeks that have not occurred.

---

## 6. Required what-if adjustments

The tool should continue supporting lecture, laboratory, and homework operations, but must add assignment and exam operations as first-class adjustments.

### 6.1 Week-level adjustments

| Adjustment | Required parameters | Effect |
|---|---|---|
| Cancel lecture | source week | Set the source week's lecture hours to zero and redistribute the removed hours |
| Cancel lab | source week | Set the source week's lab hours to zero and redistribute the removed hours |
| Reduce homework | source week, hours | Subtract hours without allowing a negative result |
| Move homework | source week, target week, hours | Move at most the homework hours available in the source week |

### 6.2 Assignment adjustments

| Adjustment | Required parameters | Required behavior |
|---|---|---|
| Move assignment | assignment ID/index, new start date, new end date | Replace both dates and redistribute its estimated hours over the new active span |
| Update assignment | assignment ID/index and one or more changed fields | Update start date, end date, and/or estimated hours, then rebuild the schedule |
| Extend assignment | assignment ID/index, new end date, reason | Change the deadline, record extension metadata, and redistribute hours over the extended span |

An assignment extension record should include:

- extension identifier;
- new end week;
- reason;
- number of weeks extended;
- scenario identifier;
- creation timestamp.

At most two extensions per assignment should be allowed when the current optimization policy is applied.

### 6.3 Exam adjustments

| Adjustment | Required parameters | Required behavior |
|---|---|---|
| Move exam | exam ID/index, new date | Move the exam and rebuild exam-week, pre-exam, and post-exam effects |
| Cancel exam | exam ID/index | Remove the exam and rebuild the schedule so all associated effects disappear |

The requested extension should also support an explicit **exam update** operation if exam properties beyond the date are later introduced. With the present data model, moving the date and cancelling the exam cover the available exam fields.

### 6.4 Domain changes must precede weekly changes

Scenario operations must be applied in this order:

1. clone the original course;
2. apply assignment and exam changes to the cloned domain objects;
3. rebuild all weekly schedules if any assignment or exam changed;
4. apply week-level lecture, laboratory, and homework changes;
5. recalculate stress sequentially across all weeks;
6. produce the comparison and audit output.

This order prevents assignment or exam reconstruction from overwriting a week-level adjustment.

---

## 7. Redistribution rule for cancelled teaching hours

When lecture or laboratory hours are cancelled, the current engine attempts to move them to later weeks.

Let $r$ be the remaining hours and let:

$$
\Delta=\min(r,3).
$$

For every candidate future week $j>w$:

1. construct a temporary week with $\Delta$ additional lecture or laboratory hours;
2. calculate stress before the addition;
3. calculate stress after the addition;
4. compute:

$$
\operatorname{impact}_j=S^{\text{after}}_j-S^{\text{before}}_j;
$$

5. choose the week with the smallest stress increase.

At most three hours are added in one redistribution iteration. The process repeats until all hours are placed or no valid future week remains.

For temporal parity, candidate evaluation should use the semester stress trajectory rather than an isolated week. Adding hours to week $j$ can also affect later weeks through fatigue carry-over. A robust implementation should therefore compare the resulting peak stress or full-trajectory objective, for example:

$$
j^*=\arg\min_{j>w}
\left[
\max_k S^{(j)}_k
\right].
$$

If exact compatibility with the current implementation is required initially, use the local weekly impact rule first, but record this as a known limitation.

---

## 8. Optimization objective and constraints

The primary optimization objective is:

$$
\min \max_w S_w,
$$

that is, minimize peak predicted stress across the semester.

The following constraints should also be respected:

- warning threshold: $75$;
- critical threshold: $85$;
- no workload field may become negative;
- moved homework cannot exceed the source week's available homework;
- assignment and exam references must exist;
- dates must remain inside the semester unless an explicitly agreed exception is introduced;
- assignment start date must not be after its end date;
- only future weeks should receive redistributed cancelled teaching hours;
- each scenario must preserve the original course and operate on a clone;
- every accepted or rejected operation must be reported.

Where several scenarios produce the same peak stress, secondary criteria may include:

1. smallest number of changed academic events;
2. smallest total amount of moved workload;
3. smallest sum of weekly stress;
4. fewest warning or critical weeks;
5. earliest recovery below the warning threshold.

---

## 9. Required input contract

The existing what-if export must be extended. The present representation combines assignments into `homework_hours` and does not expose `exam_hours`; this is insufficient to reproduce the stress model.

A suitable weekly structure is:

```json
{
  "week_index": 0,
  "week_number": 1,
  "week_start": "2026-09-01T00:00:00Z",
  "week_end": "2026-09-07T00:00:00Z",
  "adjusted": false,
  "lecture_hours": 3.0,
  "lab_hours": 2.0,
  "homework_hours": 4.2,
  "assignment_hours": 1.8,
  "exam_hours": 0.0,
  "actual_stress": null,
  "adjustment_details": []
}
```

Assignments should include stable identifiers and their workload fields:

```json
{
  "assignment_id": "assignment-1",
  "name": "Project report",
  "start_date": "2026-10-01T00:00:00Z",
  "end_date": "2026-10-28T23:59:59Z",
  "estimated_hours": 20,
  "extensions": []
}
```

Exams should also be explicit:

```json
{
  "exam_id": "exam-1",
  "name": "Final examination",
  "date_time": "2027-01-20T09:00:00Z"
}
```

The payload should include a versioned model configuration:

```json
{
  "stress_model": {
    "name": "course_stress_prediction",
    "version": "1.0",
    "minimum_stress": 0.0,
    "maximum_stress": 90.0,
    "actual_stress_blend": 0.45,
    "calibration_learning_rate": 0.25,
    "maximum_calibration_bias": 12.0,
    "fatigue_carry_over": 0.07,
    "soft_cap_softness": 0.82
  }
}
```

The preferred long-term solution is to place the stress constants and implementation in one shared, versioned service or library. Copying the equation into two independent codebases without version control will eventually create inconsistent results.

---

## 10. Adjustment request contract

Each adjustment should have a stable identifier, type, scope, parameters, and reason. Examples follow.

### Move assignment

```json
{
  "id": "adj-001",
  "type": "move_assignment",
  "assignment_id": "assignment-1",
  "new_start_date": "2026-10-08T00:00:00Z",
  "new_end_date": "2026-11-04T23:59:59Z",
  "reason": "Avoid overlap with the midterm examination"
}
```

### Extend assignment

```json
{
  "id": "adj-002",
  "type": "extend_assignment",
  "assignment_id": "assignment-1",
  "new_end_date": "2026-11-11T23:59:59Z",
  "reason": "Reduce the predicted critical stress peak"
}
```

### Move exam

```json
{
  "id": "adj-003",
  "type": "move_exam",
  "exam_id": "exam-1",
  "new_date": "2027-01-27T09:00:00Z",
  "reason": "Separate two high-pressure assessment weeks"
}
```

### Move homework

```json
{
  "id": "adj-004",
  "type": "move_homework",
  "source_week_index": 7,
  "target_week_index": 9,
  "hours": 2.0,
  "reason": "Reduce the week-eight peak"
}
```

---

## 11. Required output contract

The response must include:

- the original weekly schedule and stress trajectory;
- the simulated weekly schedule and stress trajectory;
- all applied adjustments;
- rejected or partially applied adjustments and warnings;
- redistribution flows;
- peak stress before and after;
- warning and critical weeks before and after;
- the objective improvement;
- model version and calculation parameters.

Example summary:

```json
{
  "scenario_id": "scenario-2026-001",
  "stress_model_version": "1.0",
  "baseline": {
    "peak_stress": 82.4,
    "peak_week": 9,
    "warning_weeks": [8, 9]
  },
  "simulation": {
    "peak_stress": 70.8,
    "peak_week": 10,
    "warning_weeks": []
  },
  "applied_adjustment_ids": ["adj-001", "adj-003"],
  "warnings": [],
  "weekly_results": []
}
```

Every redistribution flow should record:

- source week;
- target week;
- number of hours;
- workload type;
- target stress before;
- target stress after;
- calculated impact.

---

## 12. Consistency requirements and known implementation gaps

The following points must be resolved to achieve numerical parity:

1. **Assignments must not be merged into homework.** The current export uses `homeworkHours + assignmentHours`. This loses the separate assignment contribution.
2. **Exam load must be exported.** The current weekly what-if payload omits `examHours`.
3. **Stress must be calculated sequentially.** Calling a one-week calculator with its default `previousStress = 0` removes the 7% fatigue carry-over.
4. **Calibration behavior must be agreed.** The current adjustment engine uses a simple `StressCalculator(WeekSchedule)` callback and therefore does not automatically reproduce multi-week observed-stress calibration.
5. **A common week key must be used.** Internal indices are zero-based, while displayed week numbers are one-based. API fields must distinguish `week_index` from `week_number`.
6. **Redistribution flows must actually be recorded.** The current data model defines `RedistributionFlow`, but the shown redistribution method does not add created flow objects to the output list.
7. **Assignment distribution must have one canonical rule.** `Course.buildWeekSchedules()` uses gamma weights, while `Assignment.applyToWeeks()` distributes integer hours approximately uniformly. The what-if implementation must use the gamma-weighted rule used by the active course schedule builder.
8. **Observed stress must be mapped by week/date, not merely by list position.** Sequential list mapping can assign a measurement to the wrong week when a week is missing.
9. **Invalid adjustment parameters must produce warnings.** Silent `false` returns are not sufficient for an auditable what-if service.
10. **Scenario timestamps and identifiers must be retained.** This is required for tracking which adjustment produced which preview.

---

## 13. Validation tests

Before integration, both systems should run the same fixed test fixtures and compare every weekly output within a small tolerance, for example:

$$
|S^{\text{main}}_w-S^{\text{what-if}}_w|<10^{-6}.
$$

Minimum tests:

1. empty/light week;
2. ordinary lecture and laboratory week;
3. homework-heavy week;
4. assignment-heavy week;
5. exam week;
6. combined overload week;
7. high-stress week followed by a normal week to test carry-over;
8. observed-stress blending;
9. learned bias applied to a future week;
10. assignment moved to another span;
11. assignment hours updated;
12. assignment deadline extended;
13. exam moved;
14. exam cancelled;
15. homework moved;
16. lecture/lab redistribution;
17. invalid date, index, and negative-hour inputs;
18. scenario producing stress above the raw range to verify soft saturation and clipping.

The comparison should cover not only final stress, but also every intermediate component:

$$
P^{\text{base}},
P^{\text{teach}},
P^{\text{home}},
P^{\text{assign}},
P^{\text{exam}},
P^{\text{over}},
P^{\text{fatigue}},
R,
\widehat{S},
S.
$$

---

## 14. Acceptance criteria

The work is complete when:

- the same input produces the same weekly stress values in both systems;
- homework, assignments, and exams are represented separately;
- the what-if tool can reduce or move homework;
- the what-if tool can move, update, and extend assignments;
- the what-if tool can move and cancel exams;
- assignment and exam changes trigger a correct weekly schedule rebuild;
- stress is recalculated sequentially for the entire semester;
- baseline and simulated results can be compared;
- all actions, flows, warnings, and model parameters are returned for auditing;
- automated parity tests pass for all agreed fixtures.

---

## 15. Short implementation summary

The what-if tool should treat a course scenario as a cloned semester plan. It first changes assignment and exam entities, rebuilds their weekly workload effects, applies lecture/lab/homework changes, and then recalculates the complete weekly stress trajectory using the exact shared formula. The result should show whether the changes reduce peak stress without losing workload or silently changing the course structure.
