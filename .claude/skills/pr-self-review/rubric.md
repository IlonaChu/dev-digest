# Severity rubric

Target scale = DevDigest's own (`docs/agent-prompts/general-reviewer.md`, enum
`server/src/vendor/shared/contracts/findings.ts`). **Only CRITICAL blocks.**

- **CRITICAL** — once merged, causes a security breach, data loss/corruption, incorrect results, a crash, or a
  broken contract that callers depend on. Also: a machine-verified failure (typecheck, `arch:check`, failing test,
  repo-rules CRITICAL).
- **WARNING** — a real problem worth fixing that does not block: missed edge case, degraded behaviour, a
  maintainability or performance risk that bites at scale, a layering slip that depcruise did not catch.
- **SUGGESTION** — minor improvement. Safe to merge without it.

A speculative finding ("might", "could potentially", "if X isn't handled elsewhere") is at most WARNING.
If you would dismiss it as a likely false positive, don't report it.

## Mapping skill scales → target

| Skill scale | Target |
|---|---|
| react-best-practices / frontend-architecture / zod **CRITICAL** | CRITICAL **only** with a concrete failure mechanism in the changed lines (bug, leak of server code or secrets, broken contract). Otherwise WARNING |
| their **HIGH** / MEDIUM-HIGH | WARNING |
| their **MEDIUM** / LOW | SUGGESTION |
| security **CRITICAL** | CRITICAL |
| security **HIGH** with the attacker-controlled data flow traced | CRITICAL. Not traced → WARNING |
| security **MEDIUM** | WARNING (note "verify manually") |
| security **LOW** | not reported |
| onion-architecture: new violation reported by `pnpm arch:check` | CRITICAL (from step 3) |
| onion-architecture: layering issue found by reading only | WARNING |
| fastify / drizzle / postgresql / typescript-expert issues | rule above: CRITICAL only for breach / data loss / wrong result / crash / broken contract |

## Never CRITICAL (max SUGGESTION) — project conventions win over generic skill rules
- Size and shape rules: "max 200 lines per component", "max 5–7 props", mandatory container/presentational split,
  "one component per file".
- "Tailwind only / no `style={}` objects". DevDigest uses `styles.ts` style objects.
- Rules that reference APIs this repo doesn't have (e.g. `useApiQuery` / `useApiMutation`, Axios patterns).
- Restructuring advice for existing code the diff only touched (no unprompted refactors).

## Never blocking (go to `notes`)
- Violations already listed in `server/.dependency-cruiser-known-violations.json` (legacy baseline) in touched files.
- Pre-existing problems the diff neither introduced nor worsened.
