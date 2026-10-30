ALTER TABLE "profile" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "approval" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "return_note" text;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_ghotok_approval" ON "profile" USING btree ("ghotok_id","approval");--> statement-breakpoint
CREATE INDEX "profile_owner" ON "profile" USING btree ("owner_user_id");