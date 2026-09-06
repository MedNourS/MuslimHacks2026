CREATE TYPE "public"."account_type" AS ENUM('family', 'volunteer');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('open', 'pending_family_confirm', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
ALTER TABLE "visits" DROP CONSTRAINT "visits_visitor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "care_circle_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "care_circle_members" ALTER COLUMN "role" SET DEFAULT 'family'::text;--> statement-breakpoint
DROP TYPE "public"."member_role";--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('family', 'other', 'elder', 'volunteer');--> statement-breakpoint
ALTER TABLE "care_circle_members" ALTER COLUMN "role" SET DEFAULT 'family'::"public"."member_role";--> statement-breakpoint
UPDATE "care_circle_members" SET "role" = 'other' WHERE "role" = 'home_aide';--> statement-breakpoint
ALTER TABLE "care_circle_members" ALTER COLUMN "role" SET DATA TYPE "public"."member_role" USING "role"::"public"."member_role";--> statement-breakpoint
ALTER TABLE "visits" ALTER COLUMN "visitor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "elders" ADD COLUMN "area" text DEFAULT 'Not specified' NOT NULL;--> statement-breakpoint
ALTER TABLE "elders" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_type" "account_type" DEFAULT 'family' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_area" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "posted_by_id" integer;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "status" "visit_status" DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "check_in_at" timestamp;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "check_in_lat" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "check_in_lng" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "check_out_at" timestamp;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "check_out_lat" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "check_out_lng" text;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_posted_by_id_users_id_fk" FOREIGN KEY ("posted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_visitor_id_users_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;