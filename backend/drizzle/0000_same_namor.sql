CREATE TABLE "adjustment_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"adjustment_id" text NOT NULL,
	"week_schedules" jsonb NOT NULL,
	"summary_metrics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "case_adjustment_unique" UNIQUE("case_id","adjustment_id")
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"assignment_id" serial PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"scenario_id" integer NOT NULL,
	"assignment_number" integer NOT NULL,
	"start_week" integer,
	"end_week" integer NOT NULL,
	"hours_per_week" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "case_scenario_assignment_unique" UNIQUE("case_id","scenario_id","assignment_number")
);
--> statement-breakpoint
CREATE TABLE "educational_simulations" (
	"case_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"course_info" jsonb NOT NULL,
	"assignment_weeks" jsonb NOT NULL,
	"current_status" jsonb NOT NULL,
	"optimization_request" jsonb NOT NULL,
	"students" jsonb,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"scenario_id" integer NOT NULL,
	"case_id" text NOT NULL,
	"description" text,
	"course_name" text NOT NULL,
	"course_id" text,
	"teaching_total_hours" integer NOT NULL,
	"teaching_days" text[],
	"teaching_time" text,
	"lab_total_hours" integer NOT NULL,
	"lab_days" text[],
	"lab_time" text,
	"ects" integer NOT NULL,
	"topic_difficulty" integer NOT NULL,
	"prerequisites" boolean DEFAULT false NOT NULL,
	"weekly_homework_hours" integer NOT NULL,
	"total_weeks" integer NOT NULL,
	"attendance_method" text NOT NULL,
	"success_rate_percent" numeric(5, 2) NOT NULL,
	"average_grade" numeric(3, 2) NOT NULL,
	"student_count" integer NOT NULL,
	"current_week" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scenarios_case_id_scenario_id_pk" PRIMARY KEY("case_id","scenario_id")
);
--> statement-breakpoint
CREATE TABLE "simulation_sets" (
	"case_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stress_metrics" (
	"stress_metric_id" serial PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"scenario_id" integer NOT NULL,
	"current_week_average" numeric(4, 2),
	"current_week_maximum" numeric(4, 2),
	"predicted_next_week_average" numeric(4, 2),
	"predicted_next_week_maximum" numeric(4, 2),
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adjustment_scenarios" ADD CONSTRAINT "adjustment_scenarios_case_id_educational_simulations_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."educational_simulations"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_case_id_scenario_id_scenarios_case_id_scenario_id_fk" FOREIGN KEY ("case_id","scenario_id") REFERENCES "public"."scenarios"("case_id","scenario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_case_id_simulation_sets_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."simulation_sets"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stress_metrics" ADD CONSTRAINT "stress_metrics_case_id_scenario_id_scenarios_case_id_scenario_id_fk" FOREIGN KEY ("case_id","scenario_id") REFERENCES "public"."scenarios"("case_id","scenario_id") ON DELETE cascade ON UPDATE no action;