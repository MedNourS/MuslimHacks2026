CREATE TYPE "public"."member_role" AS ENUM('family', 'home_aide', 'other');--> statement-breakpoint
CREATE TABLE "care_circle_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"role" "member_role" DEFAULT 'family' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "care_circle_members_elder_id_user_id_unique" UNIQUE("elder_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "care_circle_members" ADD CONSTRAINT "care_circle_members_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_circle_members" ADD CONSTRAINT "care_circle_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;