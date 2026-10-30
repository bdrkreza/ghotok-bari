CREATE TABLE "biodata_share" (
	"token" text PRIMARY KEY NOT NULL,
	"ghotok_id" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biodata_share_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
ALTER TABLE "biodata_share" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "code" integer;--> statement-breakpoint
-- people already on file get their numbers in the order they were added, per ghotok and kind
UPDATE "profile" p SET "code" = n.rn FROM (SELECT "id", row_number() OVER (PARTITION BY "ghotok_id", "kind" ORDER BY "created_at", "id") AS rn FROM "profile") n WHERE p."id" = n."id";--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "biodata_share" ADD CONSTRAINT "biodata_share_ghotok_id_user_id_fk" FOREIGN KEY ("ghotok_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biodata_share" ADD CONSTRAINT "biodata_share_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_ghotok_kind_code" ON "profile" USING btree ("ghotok_id","kind","code");