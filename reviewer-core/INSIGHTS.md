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

- 2026-10-18 — `@devdigest/shared` is borrowed from `../server/src/vendor/shared`, whose `import 'zod'` would resolve to `server/node_modules/zod` → the pin must exist in BOTH `tsconfig.json` paths and `vitest.config.ts` `resolve.alias` (`zod: path.resolve(__dirname, 'node_modules/zod')`), or tests load two zod instances while typecheck looks fine

## Tool & Library Notes
<!-- Dependency/tool quirks, version-specific behaviour -->
- 2026-10-18 — `pnpm-workspace.yaml` was committed with pnpm's generated placeholder `allowBuilds: esbuild: set this to true or false` (same in `e2e/`) → set it to `true` (vitest needs esbuild's postinstall); the package is pnpm-only now, `package-lock.json` removed, CI `reviewer-core.yml` uses `pnpm install --frozen-lockfile`

## Recurring Errors & Fixes
<!-- Error message → root cause → fix -->

## Session Notes
<!-- Wrap-up only: `- YYYY-MM-DD — <task>: <outcome / key learning>` -->
- 2026-10-17 — HW1 audit: no reviewer-core code changed; only docs/specs added and the evidence line above → nothing else worth recording
- 2026-10-18 — Onion guard: `test/architecture.test.ts` (no deps, regex over `src/**` imports) pins core → only `zod`/`@devdigest/shared`/core, `src/llm/` → +`openai`, no Node built-ins/`process.env`; negative probe in `src/review/` failed 2 of 3 tests as expected, then removed; 26 tests green
- 2026-10-18 — Architecture plan, wave 1 (reviewer-core): npm → pnpm (lockfile, CI, README), zod alias in vitest, no engine code changed
- 2026-10-19 — L02 Skills: no engine change; `prompt.test.ts` now pins the `## Skills / rules` section (order, unwrapped, omitted when empty); docs state that callers must vet skills because the slot is unwrapped; 29 tests green

## Open Questions
<!-- Unresolved or unverified — what to investigate and where -->
