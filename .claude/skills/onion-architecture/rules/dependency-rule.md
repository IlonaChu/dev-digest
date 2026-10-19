# The dependency rule

> "Nothing in an inner circle can know anything at all about something in an outer circle."
> — Robert C. Martin, *The Clean Architecture*

> "All code can depend on layers more central, but code cannot depend on layers further out from the core."
> — Jeffrey Palermo, *The Onion Architecture*

"Know" means *any* source reference: a value import, a `import type`, a re-exported type, a class name in a
signature. Data crossing a boundary inward must be shaped for the inner ring — plain contract objects, not
Drizzle rows or SDK response types.

## Import matrix (server)

✅ allowed · ❌ forbidden (checked) · ⚠️ forbidden (review only — the tool can't see it)

| from ↓ / to → | `vendor/shared` | pure module files | `service.ts` | `repository*` | `src/db/*`, `drizzle-orm` | `src/adapters/*` | SDKs, `fs`, `child_process` | another module | `platform/container.ts` |
|---|---|---|---|---|---|---|---|---|---|
| `vendor/shared` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| pure module files | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| `service.ts` | ✅ | ✅ | — | ✅ own | ❌ | ❌ | ❌ | ❌ | ✅ type |
| `repository*` | ✅ | ✅ | ⚠️ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| `routes.ts` | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ✅ via `app.container` |
| `src/adapters/*` | ✅ | — | — | — | (auth only) | ✅ | ✅ | ❌ | — |
| `platform/*` (not container) | ✅ | — | — | — | ✅ jobs | — | — | ❌ | — |
| `platform/container.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |

Notes:
- `modules/_shared/*` (`getContext`, `IdParams`) is importable by every module.
- Cross-module data goes through the Container's shared repositories (`container.agentsRepo`,
  `container.reviewRepo`) or the `RepoIntel` facade (`container.repoIntel`) — never `../other-module/…`.
- A route builds its service with `new XService(app.container)`; the service builds its own repository
  from `container.db`. Handing `container.db` to the repository is fine; *querying* it outside a repository is not.

## reviewer-core

| from ↓ / to → | core files | `src/llm/*` | `zod`, `@devdigest/shared` | `openai` | Node built-ins, `process.env` |
|---|---|---|---|---|---|
| core (`review/`, `prompt.ts`, `grounding.ts`, `output/`) | ✅ | ❌ | ✅ | ❌ | ❌ |
| `src/llm/*` (adapter ring) | ✅ | ✅ | ✅ | ✅ | ❌ |
| `src/index.ts` (barrel) | ✅ | ✅ | ✅ | — | ❌ |

## What the checker cannot see — review these by hand

- **Types leaking through a re-export.** `repository.ts` does `export type { AgentRow }` and `helpers.ts` /
  `service.ts` import it from `./repository.js`. The import graph shows "service → repository" (allowed), but
  a Drizzle row type now flows inward. In new code, repositories return contract/domain types.
- **Business rules in a route.** A `routes.ts` that computes scores, filters findings or decides status
  imports nothing forbidden but is still wrong — move the rule to a pure function or the service.
- **`process.env` reads** in server code are checked by `test/architecture.test.ts` (allowed only in
  `platform/config.ts`, `src/adapters/*`, `db/seed.ts`, `db/migrate.ts`), but **config passed down as a raw
  env object** is not — pass typed `AppConfig` fields instead.
- **SDK types in port signatures.** A port method returning an Octokit type compiles and passes the import
  check (the port file imports nothing), but now every consumer depends on Octokit's shape.

## Fixing a violation — the usual moves

| Violation | Move |
|---|---|
| route/service imports `drizzle-orm` or `db/*` | add a repository method that does the query and returns a contract type; call it from the service |
| module imports `src/adapters/*` | use the port through the Container (`container.git`, `await container.github()`, `await container.llm(id)`); if no port fits, add one (see `ports.md`) |
| module imports another module | ask the Container for the shared repository/facade; if it's a constant or pure helper both need, move it to `modules/_shared/` or the shared kernel |
| adapter imports a module | the adapter needs a value the core owns → pass it as a constructor/method argument, or move the constant to the shared kernel |
| module uses `fs` / `child_process` | go through `GitClient.readFile`, `CodeIndex`, or a new port |
| SDK imported outside `src/adapters/` | wrap it in an adapter implementing a port |
