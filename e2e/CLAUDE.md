# e2e — @devdigest/e2e

Deterministic browser flows over the real, seeded stack. No Playwright, no LLM, no API keys.
How flows work: [README.md](README.md)

## Commands (run in e2e/)
```sh
pnpm test             # tsx run.ts — needs API + web already running on seeded data
pnpm e2e:hermetic     # ../scripts/e2e.sh — boots the stack itself
pnpm typecheck
```
Base URL: `E2E_BASE_URL` (default `http://localhost:3000`).

## Where things live
- `specs/NN-name.flow.json` — TEST FLOWS (not feature specs): ordered agent-browser commands
- `run.ts` + `lib/` — the runner
- `docs/specs/` — feature specs for this package (see below)

## Conventions
- A flow step is `{ "cmd": [...], "label": "..." }`; `{BASE}` is replaced with the base URL.
- Assertions are `wait --text` / `wait --url` (non-zero exit = fail); optional `assert.stdoutIncludes`.
- Flows rely on seed data (e.g. PR `#482`) — if the seed changes, update the flows.
- Number new flows sequentially (`08-…`).

## Read When
- [docs/flow-runner.md](docs/flow-runner.md) — changing `run.ts`, `lib/` or runner behaviour
- [docs/specs/flows.md](docs/specs/flows.md) — adding or changing a flow, or changing seed data
- [README.md](README.md) · [docs/](docs/README.md) · [docs/specs/](docs/specs/README.md) · [INSIGHTS.md](INSIGHTS.md)
