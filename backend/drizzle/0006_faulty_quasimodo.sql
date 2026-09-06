ALTER TABLE "users" ADD COLUMN "wants_to_volunteer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "users" SET "wants_to_volunteer" = true WHERE "account_type" = 'volunteer';--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "account_type";--> statement-breakpoint
DROP TYPE "public"."account_type";
