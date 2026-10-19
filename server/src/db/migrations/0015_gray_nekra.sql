DROP INDEX "conventions_repo_idx";--> statement-breakpoint
CREATE INDEX "convention_scans_workspace_idx" ON "convention_scans" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "conventions_scan_idx" ON "conventions" USING btree ("scan_id");