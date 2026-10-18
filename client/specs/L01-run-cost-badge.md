# L01 — Run Cost Badge (client)

## Goal
Show what each agent run cost, in three places, using data the API already returns
(see `server/specs/L01-run-cost-badge.md`). Unknown cost is "—", never "$0.00".

## Scope
**In**
1. **PR list** (`/repos/:repoId/pulls`) — new COST column between STATUS and UPDATED: `$0.014`.
2. **Agent runs timeline** (PR detail › Agent runs) — under the run time: `9 119 tok · $0.0013`,
   settled (`done`) runs only.
3. **Run drawer › Trace › Stats** — COST tile between TOKENS and FINDINGS.

**Out**
- Verdict card / PR Brief line on Overview.
- The FINDINGS and Run Review columns that exist in the mockup but not in the code.

## API / contracts
- Reads `PrMeta.cost_usd`, `RunSummary.cost_usd`, `RunStats.cost_usd` (mirrored into `src/vendor/shared`).
- `src/lib/cost.ts` — `formatCost(usd)`, `formatTokenCount(n)`:
  `null` → `—` · `0` → `$0.00` · `≥ 0.01` → 3 decimals · `< 0.01` → 2 significant digits (`$0.0013`,
  `$0.00013`) · `< 0.000001` → `<$0.000001`.
- `src/components/RunCostBadge` — `variant: "compact"` (`$0.014`) | `"withTokens"` (`9 119 tok · $0.0013`).
  Tooltip carries the exact value (`Run cost: $0.001342`) so rounding hides nothing.
- i18n: `prReview.json` › `list.columns.cost`, `cost.*`; `runs.json` › `trace.stat.cost`.

## Acceptance criteria
1. PR list shows the latest review's cost; never-reviewed PR → `—`.
2. Timeline shows tokens (in+out) and cost for `done` runs; failed runs show no cost line;
   unknown cost → `150 tok · —`.
3. Drawer shows COST; a trace saved before this feature → `—` and does not crash.
4. No hardcoded UI text; no `$0.00` for missing data.
5. `pnpm typecheck && pnpm test` green.

## Open points / deviations
- Precision is automatic by magnitude, so it differs from the mockup in two spots:
  list `$0.003` renders `$0.0030`, drawer `$0.06` renders `$0.060`. Chosen for one rule everywhere.
- Mockup places COST before a Run Review column that does not exist yet; here it sits before UPDATED.
- Token separator is a plain space (`9 119`), as in the mockup.

## Update 2026-10-17
- PR list `cost_usd` is now the SUM of the PR's successful (`done`) runs, not the latest review's run; `null` when there is none (see `server/specs/L01-run-cost-badge.md`).
- The PR list now has a FINDINGS column (`pulls/_components/FindingsPopover`): severity icons with counts for the latest run; hovering opens a read-only "N FINDINGS IN THIS RUN" popover fed by `PrMeta.findings`. Column order (as in the mockup): Score, Findings, Status, Cost, Updated. This supersedes the earlier "FINDINGS column out of scope" note.
- Below one cent, cost now shows 2 significant digits instead of 4 decimals. With 4 decimals, two runs of
  $0.000129 and $0.000134 each read `$0.0001` while their PR sum read `$0.0003`; now they read `$0.00013` and the sum `$0.00026`.
  The tiny-cost floor moved from `<$0.0001` to `<$0.000001`. Costs ≥ $0.01 are unchanged.
