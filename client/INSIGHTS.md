# client — insights

Non-obvious knowledge for this package, written via the `engineering-insights` skill.
Append-only: add bullets at the end of a section; never edit or delete — supersede with a new dated entry.
Format: `- YYYY-MM-DD — <specific fact> → <what to do> (<evidence>)`. One or two lines; long explanations go to `docs/`.

## What Works
<!-- Approaches that proved effective here and are not the obvious default -->

## What Doesn't Work
<!-- Dead ends, abandoned approaches, the agent's repeated wrong defaults — and why. Most skipped, most valuable. -->

## Codebase Patterns
<!-- Conventions and architecture decisions (with the reason) not stated in CLAUDE.md -->
- 2026-10-12 — `src/vendor/shared` differs from `server/src/vendor/shared` (adapters.ts, contracts/{eval-ci,knowledge,productionize,trace}.ts) → diff both copies before relying on a contract.
- 2026-10-17 — Cost/token display goes through `src/lib/cost.ts` (`formatCost`, `formatTokenCount`) and `components/RunCostBadge`; missing data renders "—", never "$0.00" → don't format USD inline in a component
- 2026-10-17 — PR-detail severity filter lives in the URL (`?severity=`, `SeverityFilter/` + `FindingsPanel/helpers.ts#visibleFindings`), like `?tab=`/`?trace=` → extend the same `setParam` in `pulls/[number]/page.tsx` for new PR-level view state; parse with `parseSeverity`, never trust the raw param
- 2026-10-17 — Zod `Severity` (`vendor/shared/contracts/findings.ts:11`) has 3 levels but the UI token `Severity` (`vendor/ui/primitives/tokens.ts:3`) also has `INFO` → key per-level UI on the Zod type so `INFO` can't leak into filters/counters

## Tool & Library Notes
<!-- Dependency/tool quirks, version-specific behaviour -->

## Recurring Errors & Fixes
<!-- Error message → root cause → fix -->
- 2026-10-17 — Next build error "Module not found: Can't resolve './contracts/findings.js'" in `vendor/shared/index.ts` → a runtime (non-`import type`) import from `@devdigest/shared` (e.g. the Zod `Severity`); webpack can't map the `.js` re-exports, vitest can, so tests stay green → import only types from `@devdigest/shared` in client code, and check with `pnpm exec next build`, not just `pnpm test` (hit in `SeverityFilter/helpers.ts`)
- 2026-10-17 — TS2719 "Two different types with this name exist, but they are unrelated" on a `@devdigest/shared` type → the real cause is the nested `Types of property 'X' are incompatible` line (e.g. a test fixture missing a newly added contract field), not a duplicate type → read the last lines of the error and fix the fixture (`RunHistory.test.tsx` after adding `RunSummary.cost_usd`)

## Session Notes
<!-- Wrap-up only: `- YYYY-MM-DD — <task>: <outcome / key learning>` -->
- 2026-10-17 — Run Cost Badge (client): COST column on PR list (GRID gained a 72px track), cost line in timeline, COST tile in trace drawer; mirrored contracts by hand because `vendor/shared/trace.ts` differs in comments
- 2026-10-17 — Severity counters + filter (client only): bar above "Review runs" in `FindingsTab`, counts span all runs incl. dismissed and ignore the per-panel "hide low confidence" toggle; typecheck + 53 tests green, not yet checked in a browser

## Open Questions
<!-- Unresolved or unverified — what to investigate and where -->
- 2026-10-17 — unverified: with severity filter on, runs with no match still render their accordion with the "No findings match" empty state; may be noisy on PRs with many runs → check in the browser and consider hiding empty runs in `FindingsTab`
