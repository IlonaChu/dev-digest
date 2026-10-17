# reviewer-core — @devdigest/reviewer-core

The pure review engine: diff + context → prompt → LLM → grounded findings. Pipeline: [README.md](README.md)

## Commands (run in reviewer-core/)
```sh
pnpm typecheck    # `build` is the same — this package never emits JS
pnpm test
```
Consumers (server, CI runner) import the TypeScript source directly via a path alias.

## Where things live
- `src/review/run.ts` — `reviewPullRequest`, the single entry point (single-pass / map-reduce)
- `src/prompt.ts` — prompt assembly + `INJECTION_GUARD` + `wrapUntrusted`
- `src/grounding.ts` — citation gate: drops findings whose lines miss the diff
- `src/llm/` — structured output (Zod → JSON Schema, parse-with-repair), OpenRouter provider
- `src/output/to-review.ts` — grounded Review → GitHub review payload

## Rules
- PURE: no DB, filesystem, GitHub or env access. The only side effect is the INJECTED `LLMProvider`.
  Anything needing I/O is resolved by the caller and passed in as strings.
- All external content (diff, PR body, repo map, specs) must go through `wrapUntrusted`.
- Never weaken the grounding gate or `INJECTION_GUARD` to make a test pass.
- The final score comes from findings that survived grounding, not from the model.

## Gotchas
- `@devdigest/shared` resolves to `../server/src/vendor/shared` — there is no local copy.
- `zod` is pinned to this package's own `node_modules` (tsconfig `paths`) to avoid a second instance.

## Docs
[docs/](docs/README.md) · [specs/](specs/README.md) · [INSIGHTS.md](INSIGHTS.md)
Skills: zod · typescript-expert · security
