# Re: Response to the Education Stress Model Questions

**From:** AI4Work What-If Tool team
**Date:** 2026-09-01
**Re:** [decisions.md](decisions.md) — your answers to [response.md](response.md)

---

Thanks for the quick and complete answers — every open point is now settled,
and the additive-contribution framing makes the whole model cohere: the 0–60
range, the soft cap, and why 75/85 sit where they do. Everything below is
already implemented and merged.

## What we changed on our side

Per your §1, the formula is untouched. The changes are presentation and
defaults:

1. **Displayed thresholds are now calibrated to the course-model scale:
   warning 45, critical 55.** You asked for calibration but left the numbers
   to us, so these are our proposal — two independent derivations land on the
   same values: subtracting a representative personal baseline of 30 (the
   middle of your 25–40 range) from the total-stress thresholds gives
   75−30 = 45 and 85−30 = 55; and they sit at a comparable depth of the
   reachable range (74% / 91% of the 60.45 ceiling, vs 83% / 94% for 75/85 on
   the nominal 0–90). **We will use 45/55 unless you tell us otherwise.**
   Per-case overrides are still honoured.

2. **The interface now says what the number is.** The UI, the AI chat
   grounding, and the API's `GET /stress-model` all state that the value is
   the course's estimated *contribution* to stress on top of an unobserved
   personal baseline, not anyone's complete stress level — your §1 wording,
   essentially verbatim.

3. **Total-scale thresholds are flagged, not silently useless.** If a caller
   passes 75/85 (or anything above the 60.45 ceiling), the response now
   carries a `thresholds_exceed_model_range` warning explaining the two
   scales, instead of returning permanently-empty warning lists that read as
   "this course is fine".

4. **`GET /stress-model` exposes both scales** — `thresholds.course_model`
   (45/55) and `thresholds.total_stress` (75/85, labelled as such) — plus the
   computed ceiling, so neither system can confuse them.

5. **Your accepted interpretations are locked in** exactly as you confirmed
   them: chronological exam processing with `exam_id` tie-break, the four-step
   build order (readable at runtime under `schedule_build.build_order`),
   extension cap as two events, and the rest. Nothing changed there; §5 of
   your letter simply removes them from the "unconfirmed" list.

## The parity fixtures — handed over

Attached: `course_stress_parity_fixtures_v1.0.zip`, per your §6. Contents:

- **18 fixture files**, one per §13 validation case. Each is self-contained:
  `input` plus `expected`, down to every intermediate component (`P_base`,
  `P_teach`, `P_home`, `P_assign`, `P_exam`, `P_over`, `P_fatigue`, `R`,
  `S-hat`, `S`) and the calibration bias in/out per week.
- **README.md** — format, coverage table, and how to run them.
- **stress-model.json** — a snapshot of our `GET /stress-model` output, so you
  can diff constants and build order before running anything.

Three things to know when running them:

- **Tolerance is `|Δ| < 1e-6`**, component-by-component, per the spec's §13.
- **Scenario fixtures pin `75/85` explicitly in their inputs** — the
  specification's values, so the fixtures stay independent of either tool's
  display calibration. Their expected warning-week lists are therefore empty,
  which is correct on the total-stress scale.
- **Quickest smoke test before the full run:** one week of
  `L=10, B=10, H=20, A=20, E=10`, no predecessor, no observation. We get
  `R = 118.0` exactly (the sum of the six component maxima) and `S = 59.29`.
  If you match that row, our component parameters agree.

If anything differs, send us the fixture id and your component values and we
will chase it down. Agreed: non-blocking.

## Two small questions that remain

Neither blocks anything; both are one-line answers.

1. **The Low/Moderate/High band table.** Your letter settled the warning and
   critical thresholds but not the §2 bands (Low ≤ 33, Moderate ≤ 66,
   High > 66). Under the additive interpretation, "High" is unreachable by
   schedule-only output, same as 75/85 were. We currently keep the bands as
   specified and display them with the additive framing. Should they stay
   as-is (a shared-spec label), or be calibrated for the course-model range
   like the thresholds were?

2. **What scale is observed stress on?** Your baseline framing raises this:
   when a weekly `actual_stress` reading arrives, is it *total* stress
   (baseline included, e.g. from self-report) or *course-only*? §5.1 blends it
   at α = 0.45 with the schedule prediction, and the learned bias is capped at
   ±12 — smaller than a 25–40 baseline. If observations are total-scale, the
   blend mixes two scales by design. We implement §5 exactly as written either
   way; we would just like to document which scale callers should supply.

## Where this leaves the acceptance criteria

Everything in §14 of the original specification is now done on our side; the
single open item is your parity run, which you have confirmed is non-blocking.
The correspondence trail lives in our repository:
[request.md](request.md) → [response.md](response.md) →
[decisions.md](decisions.md) → this letter.

Thanks again — this was an unusually smooth spec-to-integration loop.
