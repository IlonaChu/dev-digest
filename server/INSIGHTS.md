# server — insights

Non-obvious knowledge for this package, written via the `engineering-insights` skill.
Append-only: add bullets at the end of a section; never edit or delete — supersede with a new dated entry.
Format: `- YYYY-MM-DD — <specific fact> → <what to do> (<evidence>)`. One or two lines; long explanations go to `docs/`.

## What Works
<!-- Approaches that proved effective here and are not the obvious default -->

## What Doesn't Work
<!-- Dead ends, abandoned approaches, the agent's repeated wrong defaults — and why. Most skipped, most valuable. -->
- 2026-10-12 — The Drizzle migration journal (`src/db/migrations/meta`) has needed manual repair before (commit 2006964) → always generate via `pnpm db:generate`, never add SQL files by hand.
- 2026-10-17 — wiping review history via `DELETE /runs/:id` / `DELETE /reviews/:id` leaves the PR "Reviewed": the list status is derived from `pull_requests.last_reviewed_sha` (`src/modules/pulls/status.ts:40`), which neither delete clears (`src/modules/reviews/repository/run.repo.ts:78`, `review.repo.ts:83`) → to reset, in one transaction: `DELETE FROM reviews` (findings cascade), `DELETE FROM agent_runs WHERE pr_id IS NOT NULL` (traces cascade; `pr_id` is `set null`, not cascade), `UPDATE pull_requests SET last_reviewed_sha = NULL`; verified: 13 open PRs back to `needs_review`

## Codebase Patterns
<!-- Conventions and architecture decisions (with the reason) not stated in CLAUDE.md -->
- 2026-10-17 — `reviewer-core` returns `outcome.costUsd` (null if ANY chunk's model is unpriced) but run-executor used to drop it → persist it as-is into `agent_runs.cost_usd`; `null` = unknown, `0` = free model, never coerce one into the other (`run-executor.ts`, `reviewer-core/src/review/run.ts:184`)
- 2026-10-17 — PR list `cost_usd` = SUM of `agent_runs.cost_usd` where `status='done'` grouped by `pr_id` (`src/modules/pulls/routes.ts:171`); SUM skips NULLs and a PR with no done/priced run stays `null`, never 0 → keep that rule if the query changes (pinned by `test/reviews.it.test.ts` two-run assertion)
- 2026-10-17 — PR list items also carry `findings: PrFindingPreview[]` of the latest review (`routes.ts`, contract in `src/vendor/shared/contracts/platform.ts`), read by the client popover; `platform.ts` is identical in both vendored copies → edit both together
- 2026-10-17 — evidence for 2026-10-12 "The Drizzle migration journal": the journal is `src/db/migrations/meta/_journal.json`; latest generated migration is `0010_known_squadron_supreme.sql` (via `pnpm db:generate`, `package.json:13` is `db:migrate`)

## Tool & Library Notes
<!-- Dependency/tool quirks, version-specific behaviour -->
- 2026-10-12 — `*.it.test.ts` self-skip without Docker, so a green `pnpm test` may not have run them → check the output when touching SQL/routes.
- 2026-10-17 — evidence for 2026-10-12 "`*.it.test.ts` self-skip": the gate is `dockerAvailable()` in `test/helpers/pg.ts:23` (runs `docker info`, 5s timeout) → with Docker up, `pnpm test` ran 22 files / 130 tests including the IT ones
- 2026-10-17 — local DB shell: `docker compose exec -T postgres psql -U devdigest -d devdigest` (role/db from `docker-compose.yml:9-11`); `-U postgres` fails with 'role "postgres" does not exist' → back up before destructive SQL with `pg_dump -U devdigest -d devdigest --data-only -t <table>…` to a scratch file

## Recurring Errors & Fixes
<!-- Error message → root cause → fix -->
- 2026-10-12 — Migrations are not applied on boot; "relation … does not exist" means they were skipped → `pnpm db:migrate`.
- 2026-10-17 — evidence for 2026-10-12 "Migrations are not applied on boot": only `pnpm db:migrate` (`tsx src/db/migrate.ts`, `package.json:13`) applies them; `src/server.ts` never calls it → run it after `docker compose down -v`

## Session Notes
<!-- Wrap-up only: `- YYYY-MM-DD — <task>: <outcome / key learning>` -->
- 2026-10-17 — Run Cost Badge (server): `cost_usd` persisted + exposed on timeline/trace/PR list; one extra `IN` query for list cost; migration 0010 via `db:generate`; integration test asserts cost == calls × mock price (proves no extra LLM call)
- 2026-10-17 — HW1 audit fixes (server): PR list cost summed over done runs + latest-run findings preview (`src/modules/pulls/routes.ts:128-205`); IT test extended with a second run; typecheck + 130 tests green
- 2026-10-17 — evidence for the earlier Run Cost Badge note: commit 8563219 (`src/modules/reviews/run-executor.ts:213` persists `costUsd`, migration 0010)
- 2026-10-17 — Local review-history wipe (DB only, no code): deleted 41 reviews (+31 findings), 41 runs (+traces), reset 11 `last_reviewed_sha`; 56 PRs kept, API shows no score/findings/cost left; data-only backup taken first

## Open Questions
<!-- Unresolved or unverified — what to investigate and where -->
- 2026-10-17 — `agent_runs` has no `batch_id`, so *Review all* runs can't be grouped and the PR list cost is one run (latest review's `run_id`), not the batch total → add a `batch_id` column if a batch sum is ever required (`modules/pulls/routes.ts`, unverified product need)
- 2026-10-17 — supersedes 2026-10-17 "`agent_runs` has no `batch_id`": the PR-list cost now sums every done run by `agent_runs.pr_id` (`routes.ts:171`), so a batch_id is not needed for that column → only add it if per-batch grouping is wanted in the UI
