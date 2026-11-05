ALTER TABLE "profile" ADD COLUMN "education_level" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "education_subject" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "education_institution" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "education_year" integer;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "education_studying" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "education_result" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "extra_qualifications" text;