# client — insights

Known gotchas for this package — things the code does not make obvious.
Append new entries at the bottom. Format: `- YYYY-MM-DD — <gotcha> → <what to do>`.
Keep each entry to one or two lines; move long explanations into `docs/`.

- 2026-10-12 — `src/vendor/shared` differs from `server/src/vendor/shared` (adapters.ts, contracts/{eval-ci,knowledge,productionize,trace}.ts) → diff both copies before relying on a contract.
