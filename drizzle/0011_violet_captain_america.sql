CREATE TABLE "profile_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ghotok_id" text NOT NULL,
	"user_id" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_event" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profile_event" ADD CONSTRAINT "profile_event_ghotok_id_user_id_fk" FOREIGN KEY ("ghotok_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_event" ADD CONSTRAINT "profile_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_event" ADD CONSTRAINT "profile_event_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_event_ghotok_at" ON "profile_event" USING btree ("ghotok_id","created_at");--> statement-breakpoint
CREATE INDEX "profile_event_profile" ON "profile_event" USING btree ("profile_id","kind","created_at");