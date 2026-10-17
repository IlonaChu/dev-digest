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

## Tool & Library Notes
<!-- Dependency/tool quirks, version-specific behaviour -->

## Recurring Errors & Fixes
<!-- Error message → root cause → fix -->

## Session Notes
<!-- Wrap-up only: `- YYYY-MM-DD — <task>: <outcome / key learning>` -->

## Open Questions
<!-- Unresolved or unverified — what to investigate and where -->
