# The domain core

The core is the code that would stay the same if we swapped Postgres for SQLite, Fastify for a CLI, or
OpenAI for a local model: types, rules and calculations over plain data. It has no I/O, so it is trivially
unit-testable and runs anywhere — the server, the CI runner, a test.

Gary Bernhardt's framing fits this codebase well: a **functional core** (pure decisions) inside an
**imperative shell** (services, repositories, adapters that do the I/O and call into the core).

## What lives in the core

| Here | Example |
|---|---|
| Review engine | `reviewer-core/src/review/run.ts` (`reviewPullRequest`), `prompt.ts`, `grounding.ts`, `review/reduce.ts`, `output/to-review.ts` |
| Module rules and derivations | `server/src/modules/pulls/status.ts` (`deriveReviewStatus`, `latestReviewPerAgent`, `averageScore`) |
| Contracts and value types | `server/src/vendor/shared/contracts/*` (Zod schemas + `z.infer` types) |

## Rules

- **Imports**: only `zod`, `@devdigest/shared` and other core files. No `fastify`, `drizzle-orm`, `src/db/*`,
  SDKs, `node:fs`, `node:child_process`, `process.env`.
- **Inject what varies.** Time, ids, randomness and configuration come in as parameters (`deriveReviewStatus`
  takes `now`), never via `Date.now()` / `crypto.randomUUID()` / env inside the function. That is what makes
  the result deterministic in a test.
- **Talk outward through callbacks or ports, never imports.** `reviewPullRequest` reports progress with an
  `onEvent` callback and checks cancellation with `checkCancelled`; the server wires those to `RunLogger` and
  `runBus`. The engine never imports a logger or the bus, and stays agnostic about the cancellation error —
  the server's callback throws its own `RunCancelledError`.
- **Take resolved data, return data.** Anything that needs I/O (diff, repo map, callers, specs) is resolved by
  the caller and passed in as strings/objects. Return values are plain objects the caller persists.
- **No framework errors.** Throw plain `Error`s or domain errors; HTTP mapping is the error handler's job.

## reviewer-core specifics

- `src/llm/` is the **adapter ring inside the package** — `structured.ts` (Zod → JSON Schema, parse-with-repair,
  uses `openai/helpers/zod`) and `openrouter.ts` (`OpenRouterProvider`, uses the `openai` SDK). It ships with
  the engine so the CI runner gets a working provider, but core files must not import it: the engine only knows
  the `LLMProvider` port and receives an instance.
- Keep the AGENTS.md invariants: every external string goes through `wrapUntrusted`; never weaken the grounding
  gate or `INJECTION_GUARD`; the score comes from grounded findings.
- Guarded by `reviewer-core/test/architecture.test.ts`.

## Growing a module's core

When a service or route accumulates decisions (filtering, scoring, status derivation, grouping), extract them
into a pure function in the module — `status.ts` style, or `domain.ts` if it is the module's model — and give it
a hermetic unit test (`test/<module>-<topic>.test.ts`). The server INSIGHTS entry of 2026-10-18 is exactly this
move: the per-agent grouping was pulled out of `pulls/routes.ts` into `latestReviewPerAgent` /
`averageScore` and unit-tested in `test/pulls-status.test.ts`.

Don't create `domain.ts` for a module that only does CRUD — an empty layer is noise.
