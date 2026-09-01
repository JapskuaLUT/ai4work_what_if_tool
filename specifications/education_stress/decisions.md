# Response to the Education Stress Model Questions

> **Source:** received from the main AI4Work education application team,
> 2026-08-25, as `Education_Stress_Model_Decisions.pdf`, answering the
> questions in our [response.md](response.md). Transcribed verbatim.
> What we changed as a result is recorded in [followup.md](followup.md) and
> in [design.md §10](design.md).

## 1. Stress formula and thresholds

The existing stress formula should be preserved. Its output represents the
additional stress attributable to the course schedule; it is not intended to
represent a person's complete stress level. A student may already have a
personal baseline stress level of approximately 25–40 points because of
health, work, other responsibilities, financial concerns, or other
circumstances that the course model cannot observe. An additional
course-related contribution in the approximate range of 0–60 is therefore
reasonable.

For this reason, the formula should not be rescaled merely so that its
schedule-only output can reach the existing warning and critical thresholds of
75 and 85. Those thresholds belong to a broader total-stress interpretation.
If thresholds are displayed inside the course what-if tool, they should be
described as course-model or additive-stress thresholds and should be
calibrated for this model's output range. The interface should also make clear
that the predicted value is the course's estimated contribution to stress,
rather than the student's complete psychological state.

## 2. Distribution of general homework

The increasing distribution of general homework across the semester should be
retained. An even distribution would be simpler and might describe an ideal
study pattern, but it would not reflect the behaviour the model is intended to
capture. In practice, students commonly invest relatively little time in
reviewing lecture and laboratory material during the first weeks and increase
their study effort as examinations approach.

The model is intended to represent this observed pattern rather than an
optimal, perfectly consistent study routine. General homework should therefore
continue to increase across the semester. The deadline-weighted distribution
for individual assignments should also remain, because assignment effort
normally intensifies as the deadline approaches.

## 3. Exam workload and dedicated exam pressure

The exam contribution should remain in both total workload and the dedicated
exam-pressure component. This is intentional. An examination creates
additional workload because students must prepare and study for it. At the
same time, it creates a distinct form of psychological pressure associated
with performance, uncertainty about the examined material, and the importance
of the result.

The two contributions represent different effects: the workload component
represents the additional effort, while the exam-pressure component represents
the stress associated specifically with being examined. Retaining both
pathways deliberately gives examinations greater weight than ordinary weekly
work.

## 4. Minimum 12-point exam contribution

The minimum 12-point exam contribution is intentional and should be retained.
The model assumes that the presence of an examination creates a meaningful
minimum level of pressure even when the examination is associated with a
relatively low difficulty value. Difficulty may increase the contribution
further, but the basic examination event itself is not treated as negligible.

## 5. Exam ordering and implementation interpretations

The implementation interpretations proposed by the What-If Tool team are
accepted. In particular, exams may be processed chronologically, with
`exam_id` used as a deterministic tie-breaker when necessary. The proposed
schedule build order and the other documented interpretations can also be
retained. A stable and explicit order is necessary so that both systems
produce the same result when several academic events affect the same week.

The surrounding-week exam behaviour is also intentional. Before an
examination, students tend to increase their study effort as they prepare and
attempt to cover the required material. After the examination, they commonly
relax and temporarily reduce their capacity or willingness to undertake
additional work. The pre-exam increase and post-exam reduction are therefore
deliberate parts of the model rather than accidental side effects.

## 6. Parity fixtures and verification

You can send us their complete parity fixtures, including the inputs and
expected component-level outputs, and we will run them against our
implementation in our dev environment. This verification should not be a
blocking issue for completing the implementation.
