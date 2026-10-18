# reviewer-core — insights

Non-obvious knowledge for this package, written via the `engineering-insights` skill.
Append-only: add bullets at the end of a section; never edit or delete — supersede with a new dated entry.
Format: `- YYYY-MM-DD — <specific fact> → <what to do> (<evidence>)`. One or two lines; long explanations go to `docs/`.

## What Works
<!-- Approaches that proved effective here and are not the obvious default -->

## What Doesn't Work
<!-- Dead ends, abandoned approaches, the agent's repeated wrong defaults — and why. Most skipped, most valuable. -->

## Codebase Patterns
<!-- Conventions and architecture decisions (with the reason) not stated in CLAUDE.md -->
- 2026-10-12 — Map-reduce runs only when the diff is >400 changed lines AND multi-file; single-file diffs always go single-pass. The studio default is `single-pass` (server `REVIEW_STRATEGY`), so map-reduce runs there only if an agent sets `auto`/`map-reduce`.
- 2026-10-17 — evidence for 2026-10-12 "Map-reduce runs only when…": `src/review/run.ts:117-120` (`auto` → map-reduce only if lines > `DEFAULT_MAP_THRESHOLD_LINES` (`run.ts:30` = 400) AND `diff.files.length > 1`); server default is `REVIEW_STRATEGY = 'single-pass'` (`server/src/modules/reviews/constants.ts:12`, used at `run-executor.ts:197`)

## Tool & Library Notes
<!-- Dependency/tool quirks, version-specific behaviour -->

## Recurring Errors & Fixes
<!-- Error message → root cause → fix -->

## Session Notes
<!-- Wrap-up only: `- YYYY-MM-DD — <task>: <outcome / key learning>` -->
- 2026-10-17 — HW1 audit: no reviewer-core code changed; only docs/specs added and the evidence line above → nothing else worth recording
- 2026-10-18 — Onion guard: `test/architecture.test.ts` (no deps, regex over `src/**` imports) pins core → only `zod`/`@devdigest/shared`/core, `src/llm/` → +`openai`, no Node built-ins/`process.env`; negative probe in `src/review/` failed 2 of 3 tests as expected, then removed; 26 tests green

## Open Questions
<!-- Unresolved or unverified — what to investigate and where -->
