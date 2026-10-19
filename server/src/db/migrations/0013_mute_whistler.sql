CREATE TABLE "convention_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"repo_id" uuid NOT NULL,
	"sample_count" integer NOT NULL,
	"found" integer NOT NULL,
	"dropped" integer NOT NULL,
	"model" text NOT NULL,
	"tokens_in" integer,
	"tokens_out" integer,
	"cost_usd" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conventions" ALTER COLUMN "repo_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ALTER COLUMN "evidence_path" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ALTER COLUMN "evidence_snippet" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ALTER COLUMN "confidence" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "scan_id" uuid;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "category" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "rule_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "evidence_start_line" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "evidence_end_line" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "status" text DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "convention_scans" ADD CONSTRAINT "convention_scans_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convention_scans" ADD CONSTRAINT "convention_scans_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "convention_scans_repo_idx" ON "convention_scans" USING btree ("repo_id","created_at");--> statement-breakpoint
ALTER TABLE "conventions" ADD CONSTRAINT "conventions_scan_id_convention_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."convention_scans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conventions_repo_rule_uq" ON "conventions" USING btree ("repo_id","evidence_path","rule_key");--> statement-breakpoint
CREATE INDEX "conventions_repo_idx" ON "conventions" USING btree ("repo_id");--> statement-breakpoint
ALTER TABLE "conventions" DROP COLUMN "accepted";--> statement-breakpoint
ALTER TABLE "conventions" ADD CONSTRAINT "conventions_status_check" CHECK ("conventions"."status" in ('pending','accepted','rejected'));