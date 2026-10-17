# server — @devdigest/api

Fastify API (:3001) + Drizzle/Postgres. API map + diagrams: [README.md](README.md)

## Commands (run in server/)
```sh
pnpm dev                                              # tsx watch
pnpm typecheck
pnpm test                                             # all (integration needs Docker)
pnpm exec vitest run --exclude '**/*.it.test.ts'      # unit only, hermetic
pnpm exec vitest run .it.test                         # integration only (testcontainers)
pnpm db:generate && pnpm db:migrate                   # after editing src/db/schema/*
```

## Where things live
- `src/modules/<feature>/` — `routes.ts` → `service.ts` → `repository.ts`
- `src/adapters/` — the outside world (GitHub, git, LLM, ast-grep, secrets); test doubles in `adapters/mocks.ts`
- `src/platform/` — DI `Container`, config, SSE run bus, jobs, errors
- `src/db/schema/` — Drizzle tables (some already exist for future lessons)
- `src/modules/repo-intel/` — codebase indexer; see its [README.md](src/modules/repo-intel/README.md)

## Conventions
- ESM: relative imports end in `.js`, even for `.ts` files.
- Get adapters from the `Container`; never `new` them in services. Tests swap them via `overrides`.
- Secrets only through `SecretsProvider` (`adapters/secrets/local.ts`), never `process.env`.
- Throw `AppError` / `NotFoundError` / … from `platform/errors.ts`; the error handler builds the response.
- Only `*.it.test.ts` may touch a real DB; every other test must stay hermetic (no network, no keys).
- Review logic belongs in `reviewer-core`; the server only resolves context, persists and streams.

## Gotchas
- Migrations are NOT applied on boot — run `pnpm db:migrate`.
- On boot, runs stuck in `running` are marked failed (assumes a single API instance per DB).
- `clones/` holds cloned target repos — not our code.

## Docs
[docs/](docs/README.md) · [specs/](specs/README.md) · [INSIGHTS.md](INSIGHTS.md)
Skills: fastify-best-practices · drizzle-orm-patterns · postgresql-table-design
