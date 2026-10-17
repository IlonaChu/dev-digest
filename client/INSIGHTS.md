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

## Tool & Library Notes
<!-- Dependency/tool quirks, version-specific behaviour -->

## Recurring Errors & Fixes
<!-- Error message → root cause → fix -->
- 2026-10-17 — TS2719 "Two different types with this name exist, but they are unrelated" on a `@devdigest/shared` type → the real cause is the nested `Types of property 'X' are incompatible` line (e.g. a test fixture missing a newly added contract field), not a duplicate type → read the last lines of the error and fix the fixture (`RunHistory.test.tsx` after adding `RunSummary.cost_usd`)

## Session Notes
<!-- Wrap-up only: `- YYYY-MM-DD — <task>: <outcome / key learning>` -->
- 2026-10-17 — Run Cost Badge (client): COST column on PR list (GRID gained a 72px track), cost line in timeline, COST tile in trace drawer; mirrored contracts by hand because `vendor/shared/trace.ts` differs in comments

## Open Questions
<!-- Unresolved or unverified — what to investigate and where -->
