CREATE TABLE "medication_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"label" text NOT NULL,
	"time_of_day" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE cascade ON UPDATE no action;