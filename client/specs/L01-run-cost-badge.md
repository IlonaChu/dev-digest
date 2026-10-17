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
  `null` → `—` · `0` → `$0.00` · `≥ 0.01` → 3 decimals · `< 0.01` → 4 decimals · `< 0.0001` → `<$0.0001`.
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
