import {
    pgTable,
    text,
    integer,
    serial,
    boolean,
    decimal,
    primaryKey,
    foreignKey,
    timestamp,
    unique,
    jsonb
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// This table stores the main information about a simulation set.
export const simulation_sets = pgTable("simulation_sets", {
    case_id: text("case_id").primaryKey(),
    name: text("name").notNull(),
    kind: text("kind"),
    description: text("description"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull()
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
            .references(() => simulation_sets.case_id, { onDelete: "cascade" }),
        description: text("description"),

        // Course Info from the 'input' object
        course_name: text("course_name").notNull(),
        course_id: text("course_id"),
        teaching_total_hours: integer("teaching_total_hours").notNull(),
        teaching_days: text("teaching_days").array(),
        teaching_time: text("teaching_time"),
        lab_total_hours: integer("lab_total_hours").notNull(),
        lab_days: text("lab_days").array(),
        lab_time: text("lab_time"),
        ects: integer("ects").notNull(),
        topic_difficulty: integer("topic_difficulty").notNull(),
        prerequisites: boolean("prerequisites").notNull().default(false),
        weekly_homework_hours: integer("weekly_homework_hours").notNull(),
        total_weeks: integer("total_weeks").notNull(),
        attendance_method: text("attendance_method").notNull(),
        success_rate_percent: decimal("success_rate_percent", {
            precision: 5,
            scale: 2
        }).notNull(),
        average_grade: decimal("average_grade", {
            precision: 3,
            scale: 2
        }).notNull(),
        student_count: integer("student_count").notNull(),

        // Current Status from the 'input' object
        current_week: integer("current_week").notNull(),

        created_at: timestamp("created_at").defaultNow().notNull(),
        updated_at: timestamp("updated_at").defaultNow().notNull()
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
        end_week: integer("end_week").notNull(),
        hours_per_week: integer("hours_per_week"),
        created_at: timestamp("created_at").defaultNow().notNull()
    },
    (table) => {
        return {
            fk: foreignKey({
                columns: [table.case_id, table.scenario_id],
                foreignColumns: [scenarios.case_id, scenarios.scenario_id]
            }).onDelete("cascade"),
            unq: unique("case_scenario_assignment_unique").on(
                table.case_id,
                table.scenario_id,
                table.assignment_number
            )
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
        }),
        calculated_at: timestamp("calculated_at").defaultNow().notNull()
    },
    (table) => {
        return {
            fk: foreignKey({
                columns: [table.case_id, table.scenario_id],
                foreignColumns: [scenarios.case_id, scenarios.scenario_id]
            }).onDelete("cascade")
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

// ============================================================================
// EDUCATIONAL STRESS SIMULATION TABLES
// ============================================================================

/**
 * Educational Simulations table
 * Stores course analysis input data for educational stress simulations
 * Uses JSONB for flexible nested data structures
 */
export const educational_simulations = pgTable("educational_simulations", {
    case_id: text("case_id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),

    // JSONB columns for complex nested data
    course_info: jsonb("course_info").notNull(), // CourseInfo object
    assignment_weeks: jsonb("assignment_weeks").notNull(), // AssignmentWeek[]
    current_status: jsonb("current_status").notNull(), // CurrentStatus object
    optimization_request: jsonb("optimization_request").notNull(), // OptimizationRequest object
    students: jsonb("students"), // { count: number }
    metadata: jsonb("metadata").notNull(), // Metadata object

    // Selection tracking
    selected_adjustment_id: text("selected_adjustment_id"), // The adjustment_id selected by user
    selected_at: timestamp("selected_at"), // When the selection was made

    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const educational_simulations_relations = relations(
    educational_simulations,
    ({ many }) => ({
        adjustments: many(adjustment_scenarios)
    })
);

/**
 * Adjustment Scenarios table
 * Stores generated optimization scenarios for each educational simulation
 * Each scenario represents a different optimization strategy
 */
export const adjustment_scenarios = pgTable(
    "adjustment_scenarios",
    {
        id: serial("id").primaryKey(),
        case_id: text("case_id")
            .notNull()
            .references(() => educational_simulations.case_id, {
                onDelete: "cascade"
            }),
        adjustment_id: text("adjustment_id").notNull(), // e.g., "adjustment_1", "adjustment_2"

        // JSONB column for week schedules array
        week_schedules: jsonb("week_schedules").notNull(), // WeekSchedule[]

        // Optional modified assignments (for extension scenarios)
        assignment_weeks: jsonb("assignment_weeks"), // AssignmentWeek[] - only populated for extension scenarios

        // Optional extension applications tracking
        extensions_applied: jsonb("extensions_applied"), // ExtensionApplication[] - tracks all extensions

        // Optional summary metrics for quick access
        summary_metrics: jsonb("summary_metrics"), // OptimizationSummary object

        created_at: timestamp("created_at").defaultNow().notNull()
    },
    (table) => {
        return {
            // Unique constraint: one case can't have duplicate adjustment IDs
            unq: unique("case_adjustment_unique").on(
                table.case_id,
                table.adjustment_id
            )
        };
    }
);

export const adjustment_scenarios_relations = relations(
    adjustment_scenarios,
    ({ one }) => ({
        simulation: one(educational_simulations, {
            fields: [adjustment_scenarios.case_id],
            references: [educational_simulations.case_id]
        })
    })
);

// ============================================================================
// YARD LOGISTICS SIMULATION TABLES
// ============================================================================

/**
 * Yard Simulations table
 * Parent record for a yard logistics comparison set: one yard plus several
 * simulator runs over different orders/processes. Yard graph and processes
 * are stored at parent level when all runs share their hash.
 */
export const yard_simulations = pgTable("yard_simulations", {
    case_id: text("case_id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),

    yard_structure: jsonb("yard_structure"),
    processes: jsonb("processes"),
    yard_hash: text("yard_hash"),
    processes_hash: text("processes_hash"),

    yard_image_path: text("yard_image_path"),

    selected_run_id: text("selected_run_id"),
    selected_at: timestamp("selected_at"),

    metadata: jsonb("metadata").notNull().default({}),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const yard_simulations_relations = relations(
    yard_simulations,
    ({ many }) => ({
        runs: many(yard_runs)
    })
);

/**
 * Yard Runs table
 * One simulator run / scenario inside a yard_simulations set.
 * Holds the raw simulator export plus derived summary_metrics.
 */
export const yard_runs = pgTable(
    "yard_runs",
    {
        id: serial("id").primaryKey(),
        case_id: text("case_id")
            .notNull()
            .references(() => yard_simulations.case_id, {
                onDelete: "cascade"
            }),
        run_id: text("run_id").notNull(),
        label: text("label").notNull(),
        description: text("description"),

        orders: jsonb("orders").notNull(),
        measurements: jsonb("measurements").notNull(),
        yard_structure: jsonb("yard_structure"),
        processes: jsonb("processes"),

        yard_hash: text("yard_hash"),
        processes_hash: text("processes_hash"),
        orders_hash: text("orders_hash"),

        summary_metrics: jsonb("summary_metrics").notNull(),

        simulated_at: timestamp("simulated_at"),
        created_at: timestamp("created_at").defaultNow().notNull()
    },
    (table) => {
        return {
            unq: unique("yard_run_unique").on(table.case_id, table.run_id)
        };
    }
);

export const yard_runs_relations = relations(yard_runs, ({ one }) => ({
    simulation: one(yard_simulations, {
        fields: [yard_runs.case_id],
        references: [yard_simulations.case_id]
    })
}));

/**
 * Yard Proposals table
 * AI-generated or human-authored improvement proposals against a yard
 * simulation set. Each proposal targets a specific run and lists structured
 * changes (capacity / stagger / reroute / add_entity) that will eventually
 * be forwarded to the simulator API for re-evaluation.
 */
export const yard_proposals = pgTable("yard_proposals", {
    id: serial("id").primaryKey(),
    case_id: text("case_id")
        .notNull()
        .references(() => yard_simulations.case_id, {
            onDelete: "cascade"
        }),
    target_run_id: text("target_run_id"),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    target_bottleneck: text("target_bottleneck"),
    changes: jsonb("changes").notNull(),
    expected_impact: text("expected_impact"),
    risks: text("risks"),
    source: text("source").notNull().default("ai"),
    sent_to_simulator_at: timestamp("sent_to_simulator_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const yard_proposals_relations = relations(yard_proposals, ({ one }) => ({
    simulation: one(yard_simulations, {
        fields: [yard_proposals.case_id],
        references: [yard_simulations.case_id]
    })
}));
