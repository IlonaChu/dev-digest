---
name: onion-architecture
description: "Onion Architecture (ports & adapters, inward-only dependencies) for the DevDigest backend — server/ (Fastify routes, services, Drizzle repositories, adapters, the DI Container) and reviewer-core/. Decides WHERE backend code goes and WHICH way imports may point. Use whenever you add or change a backend module, endpoint, service, repository, adapter, port, SDK integration, Zod contract or DB query; when unsure whether logic belongs in a route, service, repository, adapter or reviewer-core; when wrapping a new external API/SDK; when `pnpm arch:check` or a test/architecture.test.ts fails; or when reviewing backend code for layering. Use it even when the user never says 'architecture' — e.g. 'add an endpoint', 'query this table from the route', 'call GitHub from the service', 'new module'. Tool specifics stay in fastify-best-practices, drizzle-orm-patterns and zod."
metadata:
  tags: architecture, onion, hexagonal, ports-and-adapters, clean-architecture, fastify, drizzle, zod, backend
---

# Onion Architecture — DevDigest backend

The domain sits in the center; Postgres, HTTP, GitHub, git, the filesystem and LLMs are details on the
outside, reached through **ports** (interfaces the inside owns) implemented by **adapters** (code on the
outside). One rule holds it together:

> **Source dependencies point inward only.** Inner code never imports outer code; when the inside needs
> something from the outside, it declares an interface and the outside implements it. ([Palermo], [Martin])

Why we care here: the review engine must run in the server *and* in CI without a DB; tests must stay
hermetic; providers (OpenAI / Anthropic / OpenRouter, GitHub, git) get swapped through the `Container`.
Every leak of Drizzle, an SDK or `fs` into the inner rings breaks one of those.

The rules are machine-checked — `server`: `pnpm arch:check` (also run by `pnpm test` via
`test/architecture.test.ts`); `reviewer-core`: `test/architecture.test.ts`.

## The rings in this codebase

| Ring (inside → out) | Files | May import |
|---|---|---|
| **Domain core** | `reviewer-core/src` except `src/llm/`; pure module logic (`modules/pulls/status.ts`, a module's `domain.ts`) | itself, `zod`, `@devdigest/shared` |
| **Ports + shared kernel** | `server/src/vendor/shared` (Zod contracts, port interfaces in `adapters.ts`); a module's `ports.ts` / `types.ts` | domain core |
| **Application** | `modules/*/service.ts`, `modules/reviews/run-executor.ts` | core, ports, own repository, `Container`, `platform/errors.ts`, `platform/run-logger.ts` |
| **Driven adapters** (app calls out) | `src/adapters/*`, `modules/*/repository.ts` + `repository/*`, `src/db/*`, `platform/{jobs,sse,…}`, `reviewer-core/src/llm/` | ports, core |
| **Driving adapters** (world calls in) | `modules/*/routes.ts`, the error handler in `app.ts` | application, `modules/_shared/*`, contracts |
| **Composition root** | `platform/container.ts`, `app.ts`, `server.ts`, `modules/index.ts` | everything — the only place that picks concrete classes |

## Where does new code go?

Walk the list top-down; the first match wins.

1. **Reads/writes Postgres** → a method on the module's repository. It returns domain/contract types, not Drizzle rows.
2. **Touches anything else outside the process** (GitHub, git, LLM, embeddings, filesystem, ripgrep, ast-grep, subprocess) →
   an adapter in `src/adapters/<name>/` behind a port, resolved through the `Container`.
3. **Review logic** (prompt, grounding, scoring, reduce) → `reviewer-core`. The server only resolves context, persists, streams.
4. **A rule or calculation with no I/O** → a pure function in the module (`status.ts`, `domain.ts`), with a hermetic unit test.
5. **Orchestration** (load → decide → persist → stream) → `service.ts`.
6. **HTTP shape** (params, body, status code, reply) → `routes.ts`.
7. **A shape the client or reviewer-core also needs** → Zod contract in `server/src/vendor/shared` (mirror to `client/src/vendor/shared`).
8. **Which implementation is used** → `platform/container.ts`, nowhere else.

## Workflow

1. **Classify** every file you will touch by ring (table above) and read the matching `rules/*.md`.
2. **Place** new code with the list above. A new external dependency starts with its port, not its SDK call.
3. **Write** it. For tool mechanics defer to `fastify-best-practices`, `drizzle-orm-patterns`, `zod`, `postgresql-table-design`.
4. **Verify** — `cd server && pnpm arch:check && pnpm typecheck && pnpm test`; `cd reviewer-core && pnpm typecheck && pnpm test`.
5. **Report** which rings you touched, and any legacy violation you saw in touched files (see below) — named, not silently fixed.

## Legacy baseline

31 violations that predate this skill are listed in `server/.dependency-cruiser-known-violations.json`
(routes in `pulls`, `settings`, `polling`, `workspace` query the DB; `reviews` service/run-executor import row
types; the `repo-intel` pipeline uses `fs` and adapters directly; …). The policy:

- **Add no new ones.** Never regenerate the baseline to make a new violation pass — fix the code.
- **Don't refactor legacy unprompted.** When you touch such a file, mention the violation; fix it only when
  asked or when the fix is squarely inside the task. A big-bang rewrite is out of scope by default.
- **After fixing one**, run `pnpm arch:baseline` and check `git diff` shows only removed entries.
- New code inside a legacy file still follows the rules (e.g. a new endpoint in `pulls/routes.ts` goes
  through a service + repository even though its neighbours don't).

## Agreed trade-offs (2026-10-18)

- **Vertical slices, not layer folders.** Keep `modules/<feature>/{routes,service,repository}.ts`; add
  `domain.ts` / `ports.ts` to a module only when it has real domain logic or a module-private port. No global
  `domain/ application/ infrastructure/` folders — split by feature first, then by ring ([Graça]).
- **`AppError` carries an HTTP `statusCode`.** Accepted: services throw `AppError` subclasses; only the error
  handler turns them into responses. Services never see `reply`, headers or status codes otherwise.
- **Zod is allowed in the core.** It is pure (no I/O) and is how contracts are shared.
- **Repositories are concrete classes, not interfaces.** Their public method signatures are the port and
  must speak domain types. Extract an interface only when a second implementation or an in-memory fake is
  actually needed ([Allegro]: extra layers without a reason are over-engineering).

## Reference files

| Read when you are… | File |
|---|---|
| unsure if an import is allowed / a depcruise rule failed | [rules/dependency-rule.md](rules/dependency-rule.md) |
| writing pure logic or touching reviewer-core | [rules/domain-core.md](rules/domain-core.md) |
| designing an interface for something external | [rules/ports.md](rules/ports.md) |
| writing or changing a `service.ts` | [rules/application-services.md](rules/application-services.md) |
| writing or changing a `routes.ts` | [rules/fastify.md](rules/fastify.md) |
| writing a query, repository, transaction or schema change | [rules/drizzle.md](rules/drizzle.md) |
| validating input, adding a contract or parsing LLM/JSON output | [rules/zod.md](rules/zod.md) |
| adding an SDK, external API, `fs` or subprocess use | [rules/external-adapters.md](rules/external-adapters.md) |
| deciding which test to write | [rules/testing.md](rules/testing.md) |
| changing the guard itself or the baseline | [rules/enforcement.md](rules/enforcement.md) |
| looking for before/after code from this repo | [examples.md](examples.md) |
| citing a source | [references.md](references.md) |

[Palermo]: https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/
[Martin]: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
[Graça]: https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/
[Allegro]: https://blog.allegro.tech/2023/02/onion-architecture.html
