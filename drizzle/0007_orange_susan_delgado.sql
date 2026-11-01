CREATE TABLE "profile_photo" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ghotok_id" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"path" text NOT NULL,
	"content_type" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_photo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profile_photo" ADD CONSTRAINT "profile_photo_ghotok_id_user_id_fk" FOREIGN KEY ("ghotok_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_photo" ADD CONSTRAINT "profile_photo_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_photo_profile" ON "profile_photo" USING btree ("profile_id","position");