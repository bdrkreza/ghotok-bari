CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ghotok_id" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"label" text,
	"href" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "favorite" (
	"ghotok_id" text NOT NULL,
	"user_id" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_user_id_profile_id_pk" PRIMARY KEY("user_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "favorite" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "interest" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ghotok_id" text NOT NULL,
	"user_id" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"for_profile_id" uuid,
	"note" text,
	"status" text DEFAULT 'new' NOT NULL,
	"proposal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interest" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "login_failure" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "login_failure" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notice" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ghotok_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"profile_id" uuid,
	"note" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notice" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "follow_up_on" date;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_ghotok_id_user_id_fk" FOREIGN KEY ("ghotok_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_ghotok_id_user_id_fk" FOREIGN KEY ("ghotok_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest" ADD CONSTRAINT "interest_ghotok_id_user_id_fk" FOREIGN KEY ("ghotok_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest" ADD CONSTRAINT "interest_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest" ADD CONSTRAINT "interest_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest" ADD CONSTRAINT "interest_for_profile_id_profile_id_fk" FOREIGN KEY ("for_profile_id") REFERENCES "public"."profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest" ADD CONSTRAINT "interest_proposal_id_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice" ADD CONSTRAINT "notice_ghotok_id_user_id_fk" FOREIGN KEY ("ghotok_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice" ADD CONSTRAINT "notice_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice" ADD CONSTRAINT "notice_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_ghotok_at" ON "activity" USING btree ("ghotok_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "interest_user_profile" ON "interest" USING btree ("user_id","profile_id");--> statement-breakpoint
CREATE INDEX "interest_ghotok_status" ON "interest" USING btree ("ghotok_id","status");--> statement-breakpoint
CREATE INDEX "login_failure_key" ON "login_failure" USING btree ("key","at");--> statement-breakpoint
CREATE INDEX "notice_user" ON "notice" USING btree ("user_id","read_at");