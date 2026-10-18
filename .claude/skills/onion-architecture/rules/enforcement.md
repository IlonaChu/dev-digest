# Enforcement — the guard and the baseline

Conventions that nothing checks erode — Allegro's write-up makes the same point about package naming vs.
ArchUnit-style tests. Node has no module visibility, so the layer rules are checked with dependency-cruiser
(already a server dependency) and a small static test in reviewer-core.

## Pieces

| File | Role |
|---|---|
| `server/.dependency-cruiser.cjs` | forbidden-import rules (below) |
| `server/.dependency-cruiser-known-violations.json` | baseline of legacy violations (31 → 0 on 2026-10-18; now `[]`) |
| `server/package.json` → `arch:check` | `depcruise src --config .dependency-cruiser.cjs --ignore-known --output-type err` |
| `server/package.json` → `arch:baseline` | `depcruise-baseline …` — rewrites the baseline |
| `server/test/architecture.test.ts` | runs the same check inside `pnpm test`; also forbids `process.env` outside config/adapters/CLI scripts |
| `reviewer-core/test/architecture.test.ts` | core imports only `zod` / `@devdigest/shared` / core; `src/llm/` adds only `openai`; no Node built-ins, no `process.env` |

## Server rules

| Rule | Forbids | Usual fix |
|---|---|---|
| `only-repositories-touch-the-db` | `src/modules/**` except `repository*` → `drizzle-orm`, `src/db/*` | repository method returning contract types |
| `modules-use-ports-not-adapters` | `src/modules/**` → `src/adapters/*` | use the port through the Container |
| `sdks-only-in-adapters` | `src/**` except `adapters/`, `db/` → octokit, simple-git, openai, `@anthropic-ai/sdk`, ripgrep, ast-grep, js-tiktoken, dependency-cruiser, postgres | wrap in an adapter |
| `node-io-only-in-infrastructure` | `src/modules/**` → `fs`, `fs/promises`, `child_process`, `net`, `http(s)` | `GitClient.readFile`, `CodeIndex`, or a new port |
| `no-cross-module-imports` | `src/modules/<a>/` → `src/modules/<b>/` (except `_shared`) | Container shared repos / facade, or move to `_shared` |
| `adapters-do-not-know-features` | `src/adapters/*` → `src/modules/*` | pass the value in, or move it to the shared kernel |
| `platform-does-not-know-features` | `src/platform/*` except `container.ts` → `src/modules/*` | invert: the module calls platform, not vice versa |
| `not-to-unresolvable` | any unresolved import | fix the alias/path — an unresolved import would silently dodge the rules |
| `shared-kernel-is-pure` | `src/vendor/shared/*` → db, SDKs, Fastify, modules, adapters, platform | keep contracts/ports dependency-free |

Reading a failure: `error <rule>: <from> → <to>`. The `comment` of each rule in the config says why.

The test spawns `node_modules/dependency-cruiser/bin/dependency-cruise.mjs` directly instead of `pnpm arch:check`,
so CI's `pnpm exec vitest run …` lanes enforce the rules even where the package.json scripts differ
(see `TESTING.md` on the `skip-worktree` package.json).

## Baseline policy

- **Never** run `arch:baseline` to make a new violation pass. Fix the code, or — if the rule is genuinely wrong
  for that case — change the rule in the config with a comment explaining why, and say so in your report.
- After fixing legacy code: `pnpm arch:baseline`, then `git diff .dependency-cruiser-known-violations.json` must
  show only removed entries.
- `preserveSymlinks: true` keeps package paths as `node_modules/<pkg>/…` instead of pnpm's versioned
  `.pnpm/<pkg>@<ver>/…`, so the baseline survives dependency upgrades.

## Changing the rules

- Add a rule to `forbidden` with `name`, `comment`, `severity: 'error'`, `from`, `to` (paths are regexes relative
  to `server/`; `$1` in `to.pathNot` refers to a capture group in `from.path`, see `no-cross-module-imports`).
- See every hit including legacy ones: `pnpm exec depcruise src --config .dependency-cruiser.cjs --output-type err`.
- New legacy hits from a new rule → fix them, or add them to the baseline with `arch:baseline` *in the same
  change* and list them in the report.
- Prove a new rule bites: drop a throwaway probe file that violates it into `src/modules/<m>/`, run
  `pnpm arch:check` (expect a failure), delete the probe.

## Known limits

The import graph can't see a Drizzle type re-exported through `repository.ts`, business rules written inline in a
route, or SDK types inside a port signature — see "What the checker cannot see" in `dependency-rule.md`. Those are
review items.
