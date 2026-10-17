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

## Tool & Library Notes
<!-- Dependency/tool quirks, version-specific behaviour -->
- 2026-10-12 — `*.it.test.ts` self-skip without Docker, so a green `pnpm test` may not have run them → check the output when touching SQL/routes.

## Recurring Errors & Fixes
<!-- Error message → root cause → fix -->
- 2026-10-12 — Migrations are not applied on boot; "relation … does not exist" means they were skipped → `pnpm db:migrate`.

## Session Notes
<!-- Wrap-up only: `- YYYY-MM-DD — <task>: <outcome / key learning>` -->

## Open Questions
<!-- Unresolved or unverified — what to investigate and where -->
