# Drizzle repositories — the driven adapter for Postgres

"The database is not the center. It is external." (Palermo). In this codebase the database is reached only
through repositories: Fowler's *Repository* — "mediates between the domain and data mapping layers using a
collection-like interface".

## Where Drizzle may appear

| Allowed | Not allowed (checked) |
|---|---|
| `modules/<m>/repository.ts`, `modules/<m>/repository/*.repo.ts` | `routes.ts`, `service.ts`, `helpers.ts`, `run-executor.ts`, pure module files |
| `src/db/*` (schema, client, migrate, seed, rows) | `src/vendor/shared/*` |
| `platform/jobs.ts`, `adapters/auth/local.ts`, `app.ts` (health `select 1`), `platform/container.ts` (holds `Db`) | another module's repository |

## Repository rules

- **Constructor takes `Db`**: `new FooRepository(container.db)`. Large repositories are split by aggregate into
  `repository/*.repo.ts` functions taking `db` as the first argument and composed by one class
  (`ReviewRepository` over `review.repo.ts`, `run.repo.ts`, `pull.repo.ts`) so the public API stays one class.
- **Return domain/contract types, not rows.** Map inside the repository folder (`toDomain` / `toContract`
  mappers next to the queries, [Stemmler]). Rows (`typeof t.x.$inferSelect`) are camelCase Drizzle shapes;
  contracts are snake_case wire shapes — map at this boundary, never in the UI.
- **Legacy:** many repositories return rows (`AgentRow`, `PullRow`, `ReviewRow`) and re-export their types for
  services/helpers. Leave existing methods unless asked; **new methods return mapped types**, and don't add new
  `export type { …Row }` re-exports. Mixed styles inside one class during migration are acceptable.
- **Workspace scoping inside the query.** Every read/write that can cross tenants takes `workspaceId` and
  filters on it (directly or via the owning PR/repo). `LocalNoAuthProvider` always returns the default
  workspace, but the scoping stays so multi-tenancy needs no rewrite.
- **Not-found is `undefined`, not a throw** — the service decides whether that's a `NotFoundError`.
- **Use-case-sized writes.** Multi-statement writes that must be atomic are one repository method wrapping
  `this.db.transaction(async (tx) => …)`; `tx` has the same query API as `db` and never leaves the repository.
- **Raw SQL, pgvector operators, JSON columns** stay here. Embeddings are produced by the `Embedder` port in the
  service and passed in as `number[]`; the repository only stores/queries them.
- **Parse `jsonb` on the way out** when the column is `unknown`, so the service receives a typed value. Legacy:
  agent version config is parsed with `AgentVersionConfig.parse(row.configJson)` in `agents/helpers.ts`; new code
  does it in the repository's mapper.

## Cross-module data

A module that needs another module's rows does **not** import its repository and does **not** query its tables
from a route. Options, in order: the Container's shared repositories (`container.agentsRepo`,
`container.reviewRepo`); a facade on the Container (`container.repoIntel`); a new read method on your own
repository that joins what you need (if your module legitimately owns that read).

## Schema and migrations

- Tables live in `src/db/schema/*.ts` (barrel `src/db/schema.ts`) — infrastructure, not domain.
- After a schema change: `pnpm db:generate && pnpm db:migrate`. Never hand-edit `src/db/migrations/`.
- `src/db/rows.ts` exists so infrastructure code can name row types; core and services must not import it
  (checked).

Query mechanics (relations, joins, aggregations, transactions) → `drizzle-orm-patterns`; table design →
`postgresql-table-design`.

[Stemmler]: https://khalilstemmler.com/articles/typescript-domain-driven-design/repository-dto-mapper/
