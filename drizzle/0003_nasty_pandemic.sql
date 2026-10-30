CREATE TABLE "site" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"ghotok_id" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"about" text,
	"address" text,
	"whatsapp" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_ghotok_id_unique" UNIQUE("ghotok_id")
);
--> statement-breakpoint
ALTER TABLE "site" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'customer';--> statement-breakpoint
UPDATE "user" SET "role" = 'customer' WHERE "role" = 'ghotok';--> statement-breakpoint
ALTER TABLE "site" ADD CONSTRAINT "site_ghotok_id_user_id_fk" FOREIGN KEY ("ghotok_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;