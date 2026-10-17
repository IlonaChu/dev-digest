# server — insights

Non-obvious knowledge for this package, written via the `engineering-insights` skill.
Append-only: add bullets at the end of a section; never edit or delete — supersede with a new dated entry.
Format: `- YYYY-MM-DD — <specific fact> → <what to do> (<evidence>)`. One or two lines; long explanations go to `docs/`.

## What Works
<!-- Approaches that proved effective here and are not the obvious default -->

## What Doesn't Work
<!-- Dead ends, abandoned approaches, the agent's repeated wrong defaults — and why. Most skipped, most valuable. -->
- 2026-10-12 — The Drizzle migration journal (`src/db/migrations/meta`) has needed manual repair before (commit 2006964) → always generate via `pnpm db:generate`, never add SQL files by hand.

## Codebase Patterns
<!-- Conventions and architecture decisions (with the reason) not stated in CLAUDE.md -->
- 2026-10-17 — `reviewer-core` returns `outcome.costUsd` (null if ANY chunk's model is unpriced) but run-executor used to drop it → persist it as-is into `agent_runs.cost_usd`; `null` = unknown, `0` = free model, never coerce one into the other (`run-executor.ts`, `reviewer-core/src/review/run.ts:184`)

## Tool & Library Notes
<!-- Dependency/tool quirks, version-specific behaviour -->
- 2026-10-12 — `*.it.test.ts` self-skip without Docker, so a green `pnpm test` may not have run them → check the output when touching SQL/routes.

## Recurring Errors & Fixes
<!-- Error message → root cause → fix -->
- 2026-10-12 — Migrations are not applied on boot; "relation … does not exist" means they were skipped → `pnpm db:migrate`.

## Session Notes
<!-- Wrap-up only: `- YYYY-MM-DD — <task>: <outcome / key learning>` -->
- 2026-10-17 — Run Cost Badge (server): `cost_usd` persisted + exposed on timeline/trace/PR list; one extra `IN` query for list cost; migration 0010 via `db:generate`; integration test asserts cost == calls × mock price (proves no extra LLM call)

## Open Questions
<!-- Unresolved or unverified — what to investigate and where -->
- 2026-10-17 — `agent_runs` has no `batch_id`, so *Review all* runs can't be grouped and the PR list cost is one run (latest review's `run_id`), not the batch total → add a `batch_id` column if a batch sum is ever required (`modules/pulls/routes.ts`, unverified product need)
