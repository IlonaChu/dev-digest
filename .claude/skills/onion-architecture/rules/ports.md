# Ports

A port is an interface **owned by the inside** that describes what the application needs from the outside —
"read a file at a commit", "complete this prompt with structured output". The adapter on the outside
implements it. This is the dependency inversion that lets the arrows point inward even when control flows
outward ([Cockburn]; [Palermo]: "the database is not the center. It is external").

## Where ports live

| Port is used by… | Put it in | Existing examples |
|---|---|---|
| the server **and** reviewer-core, or several modules | `server/src/vendor/shared/adapters.ts` (mirror to `client/src/vendor/shared/adapters.ts`) | `LLMProvider`, `Embedder`, `GitHubClient`, `GitClient`, `CodeIndex`, `AuthProvider`, `SecretsProvider` |
| one module only | `modules/<m>/ports.ts` (or the module's existing `types.ts`) | `RepoIntel` in `modules/repo-intel/types.ts` |

Legacy: `DepGraph` and `Tokenizer` are declared next to their implementations in `src/adapters/*`. Leave them,
but don't copy the pattern — an interface declared in the adapter file makes the inside import the outside to
reach it.

## Designing a port

- **Shape it for the core, not for the SDK** ([Graça]). `GitClient.diff(repo, base, head): Promise<UnifiedDiff>`
  returns our parsed type, not simple-git's output; `GitHubClient` speaks `RepoRef` and pull numbers, not
  Octokit request objects.
- **Domain vocabulary in signatures** — `RepoRef`, `UnifiedDiff`, `Finding`, contract types from
  `@devdigest/shared`. No SDK, Drizzle or Fastify types.
- **Async and coarse-grained.** One call per meaningful operation, so a fake is easy to write and a slow adapter
  doesn't leak chattiness into the core.
- **Errors in our taxonomy.** The adapter translates SDK failures into `ExternalServiceError` (502) or
  `ConfigError` (missing key); callers never `catch` an SDK-specific error class.
- **Cost/limits are part of the contract when they matter** — `LLMProvider` returns tokens and `costUsd` so
  the core can account for them without knowing the provider.

## Every port comes with

1. One real adapter in `src/adapters/<name>/` (see `external-adapters.md`).
2. A deterministic, network-free double in `src/adapters/mocks.ts` (`MockGitClient`, `MockLLMProvider`, …).
3. A field in `ContainerOverrides` and a (lazy) getter on `Container`, so tests inject the double through
   `buildApp({ overrides })`.

## Repositories are ports too — pragmatically

Strict Onion puts a repository *interface* in the core and the Drizzle class outside. We don't: repositories are
concrete classes, constructed by the service from `container.db`, and covered by `*.it.test.ts` against a real
Postgres. What we keep from the pattern is the important part — **the public methods are the port**, so they take
and return domain/contract types and hide every Drizzle detail. Extract an interface only when you need an
in-memory fake for a hermetic service test or a second implementation.

[Cockburn]: https://alistair.cockburn.us/hexagonal-architecture/
[Palermo]: https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/
[Graça]: https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/
