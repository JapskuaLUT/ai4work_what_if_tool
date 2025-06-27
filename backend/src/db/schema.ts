import {
    pgTable,
    text,
    integer,
    serial,
    boolean,
    decimal,
    primaryKey,
    foreignKey
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// This table stores the main information about a simulation set.
export const simulation_sets = pgTable("simulation_sets", {
    case_id: text("case_id").primaryKey(),
    name: text("name").notNull(),
    kind: text("kind"),
    description: text("description")
});

export const simulation_sets_relations = relations(
    simulation_sets,
    ({ many }) => ({
        scenarios: many(scenarios)
    })
);

// This table stores the details for each scenario, including course information.
export const scenarios = pgTable(
    "scenarios",
    {
        scenario_id: integer("scenario_id").notNull(),
        case_id: text("case_id")
            .notNull()
            .references(() => simulation_sets.case_id),
        description: text("description"),

        // Course Info from the 'input' object
        course_name: text("course_name"),
        course_id: text("course_id"),
        teaching_total_hours: integer("teaching_total_hours"),
        teaching_days: text("teaching_days").array(),
        teaching_time: text("teaching_time"),
        lab_total_hours: integer("lab_total_hours"),
        lab_days: text("lab_days").array(),
        lab_time: text("lab_time"),
        ects: integer("ects"),
        topic_difficulty: integer("topic_difficulty"),
        prerequisites: boolean("prerequisites"),
        weekly_homework_hours: integer("weekly_homework_hours"),
        total_weeks: integer("total_weeks"),
        attendance_method: text("attendance_method"),
        success_rate_percent: decimal("success_rate_percent", {
            precision: 5,
            scale: 2
        }),
        average_grade: decimal("average_grade", { precision: 3, scale: 2 }),
        student_count: integer("student_count"),

        // Current Status from the 'input' object
        current_week: integer("current_week")
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.case_id, table.scenario_id] })
        };
    }
);

export const scenarios_relations = relations(scenarios, ({ one, many }) => ({
    simulation_set: one(simulation_sets, {
        fields: [scenarios.case_id],
        references: [simulation_sets.case_id]
    }),
    assignments: many(assignments),
    stress_metrics: many(stress_metrics)
}));

// This table stores assignment details for each scenario.
export const assignments = pgTable(
    "assignments",
    {
        assignment_id: serial("assignment_id").primaryKey(),
        case_id: text("case_id").notNull(),
        scenario_id: integer("scenario_id").notNull(),
        assignment_number: integer("assignment_number").notNull(),
        start_week: integer("start_week"),
        end_week: integer("end_week"),
        hours_per_week: integer("hours_per_week")
    },
    (table) => {
        return {
            fk: foreignKey({
                columns: [table.case_id, table.scenario_id],
                foreignColumns: [scenarios.case_id, scenarios.scenario_id]
            })
        };
    }
);

export const assignments_relations = relations(assignments, ({ one }) => ({
    scenario: one(scenarios, {
        fields: [assignments.case_id, assignments.scenario_id],
        references: [scenarios.case_id, scenarios.scenario_id]
    })
}));

// This table stores the output stress metrics for each scenario.
export const stress_metrics = pgTable(
    "stress_metrics",
    {
        stress_metric_id: serial("stress_metric_id").primaryKey(),
        case_id: text("case_id").notNull(),
        scenario_id: integer("scenario_id").notNull(),
        current_week_average: decimal("current_week_average", {
            precision: 4,
            scale: 2
        }),
        current_week_maximum: decimal("current_week_maximum", {
            precision: 4,
            scale: 2
        }),
        predicted_next_week_average: decimal("predicted_next_week_average", {
            precision: 4,
            scale: 2
        }),
        predicted_next_week_maximum: decimal("predicted_next_week_maximum", {
            precision: 4,
            scale: 2
        })
    },
    (table) => {
        return {
            fk: foreignKey({
                columns: [table.case_id, table.scenario_id],
                foreignColumns: [scenarios.case_id, scenarios.scenario_id]
            })
        };
    }
);

export const stress_metrics_relations = relations(
    stress_metrics,
    ({ one }) => ({
        scenario: one(scenarios, {
            fields: [stress_metrics.case_id, stress_metrics.scenario_id],
            references: [scenarios.case_id, scenarios.scenario_id]
        })
    })
);
