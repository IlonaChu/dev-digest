# e2e — insights

Non-obvious knowledge for this package, written via the `engineering-insights` skill.
Append-only: add bullets at the end of a section; never edit or delete — supersede with a new dated entry.
Format: `- YYYY-MM-DD — <specific fact> → <what to do> (<evidence>)`. One or two lines; long explanations go to `docs/`.

## What Works
<!-- Approaches that proved effective here and are not the obvious default -->

## What Doesn't Work
<!-- Dead ends, abandoned approaches, the agent's repeated wrong defaults — and why. Most skipped, most valuable. -->

## Codebase Patterns
<!-- Conventions and architecture decisions (with the reason) not stated in CLAUDE.md -->
- 2026-10-12 — `specs/` here means test flows, not feature specs (those live in `docs/specs/`) → don't put markdown in `specs/`.
- 2026-10-17 — evidence for 2026-10-12 "`specs/` here means test flows": the runner reads `specs/*.flow.json` via `SPECS_DIR = join(HERE, "specs")` (`e2e/run.ts:36`); markdown feature specs live in `e2e/docs/specs/`

## Tool & Library Notes
<!-- Dependency/tool quirks, version-specific behaviour -->

## Recurring Errors & Fixes
<!-- Error message → root cause → fix -->

## Session Notes
<!-- Wrap-up only: `- YYYY-MM-DD — <task>: <outcome / key learning>` -->
- 2026-10-17 — HW1 audit: no e2e code changed; docs/specs written, coverage gaps (FINDINGS popover, per-run severity filter, COST column) have no flow yet (`e2e/specs/04-pr-findings.flow.json`)

## Open Questions
<!-- Unresolved or unverified — what to investigate and where -->
