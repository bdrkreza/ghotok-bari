CREATE TABLE "meeting" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ghotok_id" text NOT NULL,
	"proposal_id" uuid NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"place" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ghotok_id" text NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notice" ADD COLUMN "at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_ghotok_id_user_id_fk" FOREIGN KEY ("ghotok_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_proposal_id_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_ghotok_id_user_id_fk" FOREIGN KEY ("ghotok_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meeting_ghotok_at" ON "meeting" USING btree ("ghotok_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_endpoint" ON "push_subscription" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_user" ON "push_subscription" USING btree ("user_id");