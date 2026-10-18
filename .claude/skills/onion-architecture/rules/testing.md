# Testing by ring

Cockburn's point about ports: the application should be drivable by a test harness instead of a UI, with an
in-memory stand-in instead of the database. The rings tell you which test to write and which doubles it needs.

| Ring | Test type | Location / naming | Doubles |
|---|---|---|---|
| Domain core (pure module functions, reviewer-core) | unit, hermetic | `server/test/<module>-<topic>.test.ts`, `reviewer-core/test/*.test.ts` | none — pass data in, assert data out (e.g. `test/pulls-status.test.ts`) |
| Adapters | unit, hermetic | `server/test/adapters.test.ts`, `astgrep.test.ts`, … | fake the SDK boundary, never the network |
| Repositories | integration | `*.it.test.ts` | real Postgres from `test/helpers/pg.ts` (`startPg()`, testcontainers, migrated) |
| Services + routes (use case end to end) | integration | `*.it.test.ts` via `buildApp({ config, db, overrides })` + `app.inject` | Mocks from `adapters/mocks.ts` through `ContainerOverrides` |
| Routes that don't touch the DB (health, validation envelope) | unit | `test/routes-smoke.test.ts` | `buildApp({ config })`, no Docker |
| Architecture | static | `server/test/architecture.test.ts`, `reviewer-core/test/architecture.test.ts` | — |

## Consequences for design

- **Pull decisions out of services into pure functions** — they become hermetic unit tests instead of slow IT
  tests. This is the cheapest test win the architecture gives you.
- **Never mock Drizzle.** A mocked query builder tests nothing. Repositories are tested against a real Postgres.
- **Doubles replace ports, not modules.** Inject `MockLLMProvider`, `MockGitClient`, … via `overrides`; don't
  `vi.mock` a service or repository file.
- `MockLLMProvider.completeStructured` validates the fixture against the requested schema and reports fixed
  tokens/cost (`0.001`/call), so tests can assert cost arithmetic.

## Gotchas

- `*.it.test.ts` self-skip without Docker — a green `pnpm test` may not have run them. Check the output when you
  touched SQL or routes.
- Non-IT tests must stay hermetic: no network, no keys, no real DB.
