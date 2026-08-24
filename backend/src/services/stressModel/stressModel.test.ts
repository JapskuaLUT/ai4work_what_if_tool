// backend/src/services/stressModel/stressModel.test.ts
//
// Unit coverage for the §4/§5 equations and the §3 schedule builder.
// Expected values are derived from the specification by hand where practical,
// and by structural property otherwise.

import { describe, expect, test } from "bun:test";
import {
    boundedLinear,
    buildWeekSchedules,
    classifyStress,
    clip,
    COURSE_STRESS_MODEL_V1,
    examPressure,
    normalizeObservedStress,
    overloadPressure,
    predictTrajectory,
    predictWeek,
    safe,
    semesterWeekCount,
    sessionHours,
    skewWeights,
    softCap,
    type CourseDefinition,
} from "./index";

const TOL = 1e-12;

describe("primitives", () => {
    test("safe() zeroes missing, non-finite and negative values (§4.1)", () => {
        expect(safe(undefined)).toBe(0);
        expect(safe(null)).toBe(0);
        expect(safe(NaN)).toBe(0);
        expect(safe(Infinity)).toBe(0);
        expect(safe(-Infinity)).toBe(0);
        expect(safe(-5)).toBe(0);
        expect(safe(0)).toBe(0);
        expect(safe(7.5)).toBe(7.5);
    });

    test("boundedLinear() honours activation, saturation and the linear ramp (§4.2)", () => {
        expect(boundedLinear(5, 5, 30, 34)).toBe(0);
        expect(boundedLinear(4, 5, 30, 34)).toBe(0);
        expect(boundedLinear(30, 5, 30, 34)).toBe(34);
        expect(boundedLinear(1000, 5, 30, 34)).toBe(34);
        // Midpoint of the 5..30 ramp is 17.5 -> half of 34.
        expect(boundedLinear(17.5, 5, 30, 34)).toBeCloseTo(17, 12);
        expect(boundedLinear(16, 5, 30, 34)).toBeCloseTo(14.96, 12);
    });

    test("softCap() is monotonic and asymptotic to the ceiling (§4.5)", () => {
        expect(softCap(0, 90, 0.82)).toBe(0);
        expect(softCap(1e9, 90, 0.82)).toBeCloseTo(90, 9);
        expect(softCap(50, 90, 0.82)).toBeLessThan(softCap(60, 90, 0.82));
        // 90 (1 - e^{-0.82 * 90 / 90}) at R = 90.
        expect(softCap(90, 90, 0.82)).toBeCloseTo(90 * (1 - Math.exp(-0.82)), 12);
    });

    test("clip() bounds and collapses NaN to the lower bound", () => {
        expect(clip(-1, 0, 90)).toBe(0);
        expect(clip(120, 0, 90)).toBe(90);
        expect(clip(45, 0, 90)).toBe(45);
        expect(clip(NaN, 0, 90)).toBe(0);
    });

    test("skewWeights() sums to one and is strictly increasing (§3.3)", () => {
        const g = skewWeights(12, 2.5);
        expect(g).toHaveLength(12);
        expect(g.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
        for (let i = 1; i < g.length; i++) expect(g[i]).toBeGreaterThan(g[i - 1]);
        expect(skewWeights(0, 2.5)).toEqual([]);
        expect(skewWeights(1, 2.5)).toEqual([1]);
    });
});

describe("component equations (§4.3)", () => {
    test("exam pressure carries a 12-point floor and a 30-point ceiling", () => {
        expect(examPressure(0)).toBe(0);
        // Any non-zero exam load jumps straight past 12.
        expect(examPressure(0.0001)).toBeGreaterThan(12);
        expect(examPressure(2)).toBeCloseTo(17, 12);
        expect(examPressure(6)).toBeCloseTo(27, 12);
        expect(examPressure(7.2)).toBeCloseTo(30, 12);
        expect(examPressure(1000)).toBe(30);
    });

    test("overload pressure activates above 32h and caps at 14", () => {
        expect(overloadPressure(32)).toBe(0);
        expect(overloadPressure(10)).toBe(0);
        expect(overloadPressure(33)).toBeCloseTo(1.3, 12);
        expect(overloadPressure(1000)).toBe(14);
    });

    test("a fully-loaded week reproduces the documented component maxima", () => {
        const c = predictWeek(
            {
                lecture_hours: 40,
                lab_hours: 40,
                homework_hours: 60,
                assignment_hours: 60,
                exam_hours: 40,
            },
            90
        );
        expect(c.base).toBe(34);
        expect(c.teaching).toBe(10);
        expect(c.homework).toBe(12);
        expect(c.assignment).toBe(18);
        expect(c.exam).toBe(30);
        expect(c.overload).toBe(14);
        expect(c.fatigue).toBeCloseTo(6.3, 12);
        expect(c.raw).toBeCloseTo(124.3, 12);
    });

    test("an ordinary week matches hand-computed components", () => {
        const c = predictWeek(
            {
                lecture_hours: 3,
                lab_hours: 2,
                homework_hours: 8,
                assignment_hours: 3,
                exam_hours: 0,
            },
            0
        );
        expect(c.total_load).toBe(16);
        expect(c.teaching_load).toBe(5);
        expect(c.independent_load).toBe(11);
        expect(c.base).toBeCloseTo(34 * (11 / 25), 12); // 14.96
        expect(c.teaching).toBeCloseTo(10 * (2 / 11), 12);
        expect(c.homework).toBeCloseTo(12 * (6 / 14), 12);
        expect(c.assignment).toBeCloseTo(18 * (2 / 13), 12);
        expect(c.exam).toBe(0);
        expect(c.overload).toBe(0);
        expect(c.fatigue).toBe(0);
        expect(c.raw).toBeCloseTo(
            c.base + c.teaching + c.homework + c.assignment,
            12
        );
        expect(c.schedule_only).toBeCloseTo(
            90 * (1 - Math.exp((-0.82 * c.raw) / 90)),
            12
        );
    });

    test("negative and non-finite workload fields are sanitised, not propagated", () => {
        const c = predictWeek({
            lecture_hours: -10,
            lab_hours: NaN,
            homework_hours: Infinity,
            assignment_hours: undefined as unknown as number,
            exam_hours: -1,
        });
        expect(c.total_load).toBe(0);
        expect(c.raw).toBe(0);
        expect(c.schedule_only).toBe(0);
    });

    test("fatigue reads the previous final stress, clipped to the model range", () => {
        const withZero = predictWeek({ homework_hours: 5 }, 0);
        const withEighty = predictWeek({ homework_hours: 5 }, 80);
        expect(withEighty.fatigue).toBeCloseTo(0.07 * 80, 12);
        expect(withEighty.raw - withZero.raw).toBeCloseTo(0.07 * 80, 12);
        // Out-of-range previous stress is clipped before use.
        expect(predictWeek({}, 500).fatigue).toBeCloseTo(0.07 * 90, 12);
        expect(predictWeek({}, -50).fatigue).toBe(0);
    });

    test("predicted stress never leaves [0, 90]", () => {
        for (const hours of [0, 1, 10, 100, 1000, 1e6]) {
            const c = predictWeek(
                {
                    lecture_hours: hours,
                    lab_hours: hours,
                    homework_hours: hours,
                    assignment_hours: hours,
                    exam_hours: hours,
                },
                90
            );
            expect(c.schedule_only).toBeGreaterThanOrEqual(0);
            expect(c.schedule_only).toBeLessThanOrEqual(90);
        }
    });

    test("the model is a pure function — repeated calls are bit-identical", () => {
        const load = {
            lecture_hours: 3.7,
            lab_hours: 1.3,
            homework_hours: 9.2,
            assignment_hours: 4.4,
            exam_hours: 6,
        };
        const first = predictWeek(load, 41.5);
        for (let i = 0; i < 25; i++) {
            expect(predictWeek(load, 41.5)).toEqual(first);
        }
    });
});

describe("trajectory (§4.3 fatigue, §5 calibration)", () => {
    test("identical weeks drift upward through fatigue carry-over", () => {
        const week = { lecture_hours: 4, lab_hours: 2, homework_hours: 8, assignment_hours: 4, exam_hours: 0 };
        const t = predictTrajectory([week, week, week, week]);
        expect(t[0].components.fatigue).toBe(0);
        for (let i = 1; i < t.length; i++) {
            expect(t[i].components.fatigue).toBeCloseTo(
                0.07 * t[i - 1].predicted_stress,
                12
            );
            expect(t[i].predicted_stress).toBeGreaterThan(t[i - 1].predicted_stress);
        }
    });

    test("week order changes the result — weeks are not independent", () => {
        const heavy = { lecture_hours: 6, lab_hours: 4, homework_hours: 18, assignment_hours: 14, exam_hours: 8 };
        const light = { lecture_hours: 2, lab_hours: 0, homework_hours: 2, assignment_hours: 0, exam_hours: 0 };
        const a = predictTrajectory([heavy, light]);
        const b = predictTrajectory([light, heavy]);
        const totalA = a.reduce((s, w) => s + w.predicted_stress, 0);
        const totalB = b.reduce((s, w) => s + w.predicted_stress, 0);
        expect(Math.abs(totalA - totalB)).toBeGreaterThan(TOL);
    });

    test("observed stress blends at alpha = 0.45 (§5.1)", () => {
        const week = { lecture_hours: 4, lab_hours: 2, homework_hours: 6, assignment_hours: 2, exam_hours: 0 };
        const withoutObs = predictTrajectory([week]);
        const withObs = predictTrajectory([{ ...week, actual_stress: 70 }]);
        const schedule = withoutObs[0].components.schedule_only;
        expect(withObs[0].predicted_stress).toBeCloseTo(
            0.45 * 70 + 0.55 * schedule,
            12
        );
        expect(withObs[0].observed_applied).toBe(true);
    });

    test("non-positive, non-finite and missing observations are unavailable (§5)", () => {
        expect(normalizeObservedStress(null)).toBeNull();
        expect(normalizeObservedStress(undefined)).toBeNull();
        expect(normalizeObservedStress(NaN)).toBeNull();
        expect(normalizeObservedStress(Infinity)).toBeNull();
        expect(normalizeObservedStress(0)).toBeNull();
        expect(normalizeObservedStress(-3)).toBeNull();
        expect(normalizeObservedStress(120)).toBe(90);
        expect(normalizeObservedStress(44)).toBe(44);
    });

    test("bias is learned on observed weeks and carried into unobserved ones (§5.2)", () => {
        const week = { lecture_hours: 4, lab_hours: 2, homework_hours: 6, assignment_hours: 2, exam_hours: 0 };
        const t = predictTrajectory([
            { ...week, actual_stress: 80 },
            { ...week },
            { ...week },
        ]);

        expect(t[0].calibration_bias_in).toBe(0);
        const error = 80 - t[0].components.schedule_only;
        // The raw update overshoots the +/- 12 cap here, so the clip binds.
        expect(t[0].calibration_bias_out).toBeCloseTo(clip(0.25 * error, -12, 12), 12);
        expect(t[0].calibration_bias_out).toBe(12);

        // An unobserved week adds the standing bias and leaves it untouched.
        expect(t[1].calibration_bias_in).toBeCloseTo(t[0].calibration_bias_out, 12);
        expect(t[1].calibration_bias_out).toBeCloseTo(t[1].calibration_bias_in, 12);
        expect(t[1].predicted_stress).toBeCloseTo(
            t[1].components.schedule_only + t[1].calibration_bias_in,
            12
        );
        expect(t[2].calibration_bias_in).toBeCloseTo(t[1].calibration_bias_out, 12);
    });

    test("bias is clipped to +/- 12", () => {
        const nothing = { lecture_hours: 0, lab_hours: 0, homework_hours: 0, assignment_hours: 0, exam_hours: 0 };
        const t = predictTrajectory(
            Array.from({ length: 30 }, () => ({ ...nothing, actual_stress: 90 }))
        );
        for (const w of t) {
            expect(w.calibration_bias_out).toBeLessThanOrEqual(12);
            expect(w.calibration_bias_out).toBeGreaterThanOrEqual(-12);
        }
        expect(t[t.length - 1].calibration_bias_out).toBeCloseTo(12, 6);
    });

    test("useObservedStress=false isolates the schedule-only model (§4)", () => {
        const week = { lecture_hours: 4, lab_hours: 2, homework_hours: 6, assignment_hours: 2, exam_hours: 0, actual_stress: 88 };
        const t = predictTrajectory([week], { useObservedStress: false });
        expect(t[0].observed_stress).toBeNull();
        expect(t[0].predicted_stress).toBeCloseTo(t[0].components.schedule_only, 12);
    });

    test("an empty semester yields an empty trajectory", () => {
        expect(predictTrajectory([])).toEqual([]);
    });
});

describe("classification bands (§2)", () => {
    test("bands split at 33 and 66", () => {
        expect(classifyStress(0)).toBe("Low");
        expect(classifyStress(33)).toBe("Low");
        expect(classifyStress(33.0001)).toBe("Moderate");
        expect(classifyStress(66)).toBe("Moderate");
        expect(classifyStress(66.0001)).toBe("High");
        expect(classifyStress(90)).toBe("High");
    });
});

describe("schedule builder (§3)", () => {
    const course: CourseDefinition = {
        course_name: "Test",
        course_id: "T-1",
        start_date: "2026-09-01T00:00:00Z",
        end_date: "2026-11-24T00:00:00Z", // 84 days -> 12 weeks
        topic_difficulty: 3,
        total_homework_hours: 100,
        course_sessions: [
            { day: "Monday", start_time: "10:00", end_time: "12:00" },
            { day: "Wednesday", start_time: "14:00", end_time: "16:00" },
        ],
        lab_sessions: [{ day: "Friday", start_time: "13:00", end_time: "15:00" }],
        assignments: [
            {
                assignment_id: "a1",
                name: "A1",
                start_date: "2026-09-01T00:00:00Z",
                end_date: "2026-09-28T23:59:59Z",
                estimated_hours: 20,
                extensions: [],
            },
        ],
        exams: [
            { exam_id: "e1", name: "Final", date_time: "2026-11-10T09:00:00Z" },
        ],
    };

    test("semester length is ceil(days / 7), never below one (§3.1)", () => {
        expect(semesterWeekCount("2026-09-01", "2026-11-24")).toBe(12);
        expect(semesterWeekCount("2026-09-01", "2026-09-08")).toBe(1);
        expect(semesterWeekCount("2026-09-01", "2026-09-09")).toBe(2);
        expect(semesterWeekCount("2026-09-01", "2026-09-01")).toBe(1);
        expect(semesterWeekCount("2026-09-08", "2026-09-01")).toBe(1);
    });

    test("session duration is (end - start) / 60 (§3.2)", () => {
        expect(sessionHours({ day: "Mon", start_time: "10:00", end_time: "12:00" })).toBe(2);
        expect(sessionHours({ day: "Mon", start_time: "09:30", end_time: "11:15" })).toBeCloseTo(1.75, 12);
        expect(sessionHours({ day: "Mon", start_time: "12:00", end_time: "10:00" })).toBe(0);
        expect(sessionHours({ day: "Mon", start_time: "bad", end_time: "10:00" })).toBe(0);
    });

    test("week keys are both zero-based and one-based (§3.1, §12.5)", () => {
        const { weeks } = buildWeekSchedules(course);
        expect(weeks).toHaveLength(12);
        weeks.forEach((w, i) => {
            expect(w.week_index).toBe(i);
            expect(w.week_number).toBe(i + 1);
        });
        expect(weeks[0].week_start).toBe("2026-09-01T00:00:00.000Z");
        expect(weeks[0].week_end).toBe("2026-09-07T00:00:00.000Z");
    });

    test("lectures and labs are added to every week (§3.2)", () => {
        const { weeks } = buildWeekSchedules(course);
        for (const w of weeks) {
            expect(w.lecture_hours).toBe(4);
            expect(w.lab_hours).toBe(2);
        }
    });

    test("homework is right-skewed across the semester and conserved (§3.3)", () => {
        const noExams = { ...course, exams: [] };
        const { weeks } = buildWeekSchedules(noExams);
        const total = weeks.reduce((s, w) => s + w.homework_hours, 0);
        expect(total).toBeCloseTo(100, 9);
        for (let i = 1; i < weeks.length; i++) {
            expect(weeks[i].homework_hours).toBeGreaterThan(weeks[i - 1].homework_hours);
        }
    });

    test("assignment hours land only inside the active span and are conserved (§3.4)", () => {
        const { weeks } = buildWeekSchedules(course);
        const total = weeks.reduce((s, w) => s + w.assignment_hours, 0);
        expect(total).toBeCloseTo(20, 9);
        // 2026-09-01..2026-09-28 is weeks 0..3.
        for (let i = 4; i < 12; i++) expect(weeks[i].assignment_hours).toBe(0);
        for (let i = 1; i < 4; i++) {
            expect(weeks[i].assignment_hours).toBeGreaterThan(weeks[i - 1].assignment_hours);
        }
    });

    test("an exam loads its own week and reshapes its neighbours (§3.5)", () => {
        const withExam = buildWeekSchedules(course).weeks;
        const withoutExam = buildWeekSchedules({ ...course, exams: [] }).weeks;

        // 2026-11-10 falls in week index 10.
        expect(withExam[10].exam_hours).toBe(6); // 2 * difficulty 3
        expect(withoutExam[10].exam_hours).toBe(0);
        expect(withExam[9].homework_hours).toBeCloseTo(withoutExam[9].homework_hours + 2, 9);
        expect(withExam[11].homework_hours).toBeCloseTo(withoutExam[11].homework_hours * 0.7, 9);
    });

    test("exam effects are derived, so cancelling and rebuilding removes them entirely", () => {
        const withExam = buildWeekSchedules(course).weeks;
        const rebuilt = buildWeekSchedules({ ...course, exams: [] }).weeks;
        expect(withExam[10].exam_hours).not.toBe(rebuilt[10].exam_hours);
        for (let i = 0; i < 12; i++) {
            expect(rebuilt[i].exam_hours).toBe(0);
        }
    });

    test("exams build in chronological order regardless of input order (§3.5)", () => {
        const exams = [
            { exam_id: "late", name: "Late", date_time: "2026-11-10T09:00:00Z" },
            { exam_id: "early", name: "Early", date_time: "2026-10-13T09:00:00Z" },
        ];
        const forward = buildWeekSchedules({ ...course, exams });
        const reversed = buildWeekSchedules({ ...course, exams: [...exams].reverse() });
        expect(forward.weeks).toEqual(reversed.weeks);
    });

    test("out-of-semester assignments and exams are clamped with a warning", () => {
        const result = buildWeekSchedules({
            ...course,
            assignments: [
                {
                    assignment_id: "outside",
                    name: "Outside",
                    start_date: "2026-08-01T00:00:00Z",
                    end_date: "2027-02-01T00:00:00Z",
                    estimated_hours: 10,
                    extensions: [],
                },
            ],
            exams: [{ exam_id: "late", name: "Late", date_time: "2027-05-01T09:00:00Z" }],
        });
        const codes = result.warnings.map((w) => w.code);
        expect(codes).toContain("assignment_clamped_to_semester");
        expect(codes).toContain("exam_clamped_to_semester");
        expect(result.weeks).toHaveLength(12);
        expect(result.weeks[11].exam_hours).toBe(6);
    });

    test("unparseable dates warn instead of throwing", () => {
        const result = buildWeekSchedules({
            ...course,
            assignments: [
                {
                    assignment_id: "bad",
                    name: "Bad",
                    start_date: "nonsense",
                    end_date: "also nonsense",
                    estimated_hours: 10,
                    extensions: [],
                },
            ],
            exams: [{ exam_id: "bad", name: "Bad", date_time: "nope" }],
        });
        const codes = result.warnings.map((w) => w.code);
        expect(codes).toContain("invalid_assignment_dates");
        expect(codes).toContain("invalid_exam_date");
        expect(result.weeks).toHaveLength(12);
    });

    test("the builder is deterministic", () => {
        const first = buildWeekSchedules(course).weeks;
        for (let i = 0; i < 10; i++) {
            expect(buildWeekSchedules(course).weeks).toEqual(first);
        }
    });
});

describe("model configuration (§9)", () => {
    test("the v1.0 constants match the shared specification exactly", () => {
        expect(COURSE_STRESS_MODEL_V1).toEqual({
            name: "course_stress_prediction",
            version: "1.0",
            minimum_stress: 0.0,
            maximum_stress: 90.0,
            actual_stress_blend: 0.45,
            calibration_learning_rate: 0.25,
            maximum_calibration_bias: 12.0,
            fatigue_carry_over: 0.07,
            soft_cap_softness: 0.82,
        });
    });
});
