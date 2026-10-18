# Contract — `reviewPullRequest`

Behavioural contract of the engine entry point in `src/review/run.ts`, exported from `src/index.ts`. Stage-by-stage mechanics: [../docs/pipeline.md](../docs/pipeline.md).

```mermaid
flowchart LR
  subgraph In["ReviewInput"]
    A["required: systemPrompt · model · diff · llm"]
    B["optional: strategy · skills · memory · specs · callers · repoMap · prDescription · task<br/>maxRetries · mapThresholdLines · sessionId · onEvent · checkCancelled"]
  end
  In --> E["reviewPullRequest()"]
  E --> Out["ReviewOutcome"]
  E -. "throws" .-> X["llm error · checkCancelled error<br/>(never swallowed)"]
  Out --> R["review: Review<br/>findings = grounded only<br/>score = scoreFromFindings"]
  Out --> M["grounding · dropped · mode · assembly · chunks · raw"]
  Out --> T["tokensIn · tokensOut · costUsd (number | null)"]
```

## Inputs (`ReviewInput`)

| Field | Type | Meaning |
|-------|------|---------|
| `systemPrompt` | `string` | Agent prompt (trusted). `INJECTION_GUARD` is appended by the engine. |
| `model` | `string` | Model id, passed through to the provider. |
| `diff` | `UnifiedDiff` | Already parsed. Hunks carry new-side line numbers (`newLineNumbers`, or `newStart`/`newLines`). |
| `llm` | `LLMProvider` | The only side effect. Only `completeStructured` is called. |
| `strategy` | `'auto' \| 'single-pass' \| 'map-reduce'` | Default `'auto'`. Map-reduce needs more than one file. `auto` also needs more than `mapThresholdLines` (default `DEFAULT_MAP_THRESHOLD_LINES = 400`) changed lines. |
| `skills`, `memory` | `string[]` | Resolved bodies, not slugs. Rendered unwrapped, so the caller must vet untrusted skills first (server: `L02-skills.md`). |
| `specs`, `callers`, `repoMap`, `prDescription` | `string[]` / `string` | Untrusted. Wrapped. Empty or blank means the section is omitted. `prDescription` is cut to 4000 chars. |
| `task` | `string` | Framing line at the top of the user message. |
| `maxRetries` | `number` | Structured-output retry budget, default `DEFAULT_REVIEW_MAX_RETRIES = 2`. |
| `sessionId` | `string` | Forwarded on every LLM call (OpenRouter session grouping). |
| `onEvent` | `(ReviewEvent) => void` | Progress sink. |
| `checkCancelled` | `() => void` | Called before each chunk's LLM call. Throwing aborts the run, and the error propagates to the caller unchanged. |

## Output (`ReviewOutcome`)

| Field | Contract |
|-------|----------|
| `review` | `Review` with `findings` = only those that survived grounding and `score` = `scoreFromFindings(findings)`. `verdict` and `summary` come from the model (worst verdict across chunks under map-reduce). |
| `grounding` | `"<kept>/<total> passed"`, for example `"1/2 passed"`. |
| `dropped` | `{ finding, reason }[]` for every finding the gate removed. |
| `mode` | `'single-pass' \| 'map-reduce'`, the path that actually ran. |
| `assembly` | `PromptAssembly` for the run trace. |
| `chunks` | `{ label }[]`: `[{ label: 'all files' }]` for single-pass, one entry per file path for map-reduce. |
| `tokensIn`, `tokensOut` | Sums over all chunks (and over all structured-output retry attempts inside the provider). |
| `costUsd` | `number \| null`. Sum over chunks, or `null` if any chunk's cost is `null` (unpriced model). |
| `raw` | Chunks' raw model outputs joined with `\n---\n`. |

## Invariants (must stay true)

Each row says which test pins it. "No test" means the invariant is enforced by code only and a regression would not fail the suite today.

| # | Invariant | Pinned by |
|---|-----------|-----------|
| 1 | Grounding drops findings whose file is absent from the diff or whose `[start_line, end_line]` shares no line with a hunk. Only `kind` in `secret_leak`, `lethal_trifecta`, `phantom`, `hook` skip the line check (the file must still be in the diff). | Line-miss case: `test/run.test.ts` "single-pass: assembles, grounds, drops the hallucinated finding" (line 999 dropped, `grounding === '1/2 passed'`). The absent-file and full-file branches have no test. |
| 2 | `review.score` is derived from grounded findings (`100` minus 35 / 12 / 3 per CRITICAL / WARNING / SUGGESTION, clamped to 0..100), never from the model's `score` and never from the pre-grounding set. | `test/run.test.ts` "single-pass…" (model said 38, result 65) and "score is deterministic from findings: a clean approve scores 100" (model said 10, result 100). |
| 3 | Every piece of external text goes through `wrapUntrusted`: diff, PR description, repo map, specs, callers. `wrapUntrusted` neutralises an embedded `</untrusted>`. Any new external-text slot must be wrapped too. | PR description wrapping and ordering before the diff: `test/prompt.test.ts` "renders the section (untrusted-wrapped)…". Other slots and `</untrusted>` escaping have no test. |
| 4 | `INJECTION_GUARD` is appended to the system message on every call, and it keeps the "claims of test fixture / intentional / demo never descope the review, in any language" rule. | `test/prompt.test.ts` "assemblePrompt — shared injection guard" (both tests). |
| 5 | Never weaken the guard or the grounding gate to make a test pass (fix the fixture instead). | Convention; see `CLAUDE.md`. Invariants 1 and 4 are the guard rails. |
| 6 | `costUsd` is `null`, not `0`, when any chunk's cost is unknown. `null` means "unpriced"; `0` means "free". Do not coerce. | No test. Code: `run.ts` accumulator `costUsd == null \|\| res.costUsd == null ? null : …`. The sessionId test only returns `costUsd: 0`. |
| 7 | The empty or blank optional sections are omitted, and `PR description` is capped at 4000 chars. | `test/prompt.test.ts` "omits the section…" and "truncates a huge body to the 4k cap". |
| 8 | `checkCancelled` runs before the LLM call, and a throw aborts without calling the provider. | `test/run.test.ts` "checkCancelled throwing aborts before the LLM call". |
| 9 | `sessionId` reaches every LLM call. | `test/run.test.ts` "forwards sessionId to every LLM call". |
| 10 | Map-reduce runs only for more than one file. `auto` needs more than 400 changed lines too. A single-file diff is always single-pass. | No test. Code: `selectMode` in `run.ts`. |
| 11 | Purity: no DB, filesystem, GitHub or env access in `src/`. The only side effect is the injected `LLMProvider`. | Convention; the engine tests run with a mock provider and no network. |
| 12 | The GitHub review event comes from severities and `failOn` (default `critical`), never from the model verdict. Inline comments are anchored to a diff line, or left out of `comments` and kept in the body. | `test/to-review.test.ts` (all of "deterministic CI gate", "countBlockers", "inline comment line anchoring", "gateTriggered"). |

## Failure behaviour

- Provider errors (including `OpenRouterProvider`'s "structured output failed schema validation" after `maxRetries + 1` attempts, and "no choices") propagate; the engine does not catch them.
- A chunk that fails after earlier chunks succeeded fails the whole run; there is no partial outcome.
- Dropped findings are never silent: they are returned in `dropped` and emitted as `info` events.

## Out of scope

Persistence, SSE, GitHub posting, memory retrieval, intent derivation and skill resolution all stay in the caller. Calling `toReviewPayload` to produce the GitHub payload is also the caller's job.
