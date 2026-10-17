# server — insights

Known gotchas for this package — things the code does not make obvious.
Append new entries at the bottom. Format: `- YYYY-MM-DD — <gotcha> → <what to do>`.
Keep each entry to one or two lines; move long explanations into `docs/`.

- 2026-10-12 — Migrations are not applied on boot; "relation … does not exist" means they were skipped → `pnpm db:migrate`.
- 2026-10-12 — The Drizzle migration journal (`src/db/migrations/meta`) has needed manual repair before (commit 2006964) → always generate via `pnpm db:generate`, never add SQL files by hand.
- 2026-10-12 — `*.it.test.ts` self-skip without Docker, so a green `pnpm test` may not have run them → check the output when touching SQL/routes.
