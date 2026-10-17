---
name: engineering-insights
description: Records non-obvious engineering learnings into the INSIGHTS.md of the package the work touched (client, server, reviewer-core, e2e). Use proactively the moment something non-obvious is confirmed — a fix that took more than one attempt, a dead end, a misleading error, a library or tool quirk, an undocumented convention or decision — and at wrap-up after any meaningful task (a problem solved, a decision made, a discovery). Also use when the user says "wrap up", "save insights", "what did we learn" or "log this gotcha". Skip trivial edits.
---

# Engineering insights

Each package keeps its own `INSIGHTS.md`: knowledge lives next to the code, and the next session in that package reads its own lessons first. This skill is how entries get written — concrete, deduplicated, append-only.

## When to write

Two triggers, both mandatory:

1. **As you go** — right after something non-obvious is *confirmed* (fix verified, dead end proven, quirk reproduced). Not before: a guess is not an insight. Write it while the evidence is still in context.
2. **Wrap-up** — at the end of any substantive task (roughly >30 min, or one that had a problem, a decision or a discovery). Re-read the session against every section below, add what the as-you-go pass missed, then add one *Session Notes* line.

Skip: typo/config/formatting edits, renames, anything fully explained by the diff. Signal quality matters, not volume. If nothing passes the quality gate, write nothing and say so.

## Where to write

The file belongs to the package the insight is **about**, not the one you happened to be editing.

| Insight is about | File |
|---|---|
| API, DB, adapters, repo-intel indexer (`server/src/**`) | `server/INSIGHTS.md` |
| Next.js studio (`client/src/**`) | `client/INSIGHTS.md` |
| Review engine (`reviewer-core/src/**`) | `reviewer-core/INSIGHTS.md` |
| Browser flows (`e2e/**`) | `e2e/INSIGHTS.md` |

- A task spanning several packages → one entry per package, each in its own file; don't duplicate across files, cross-reference instead (`see client/INSIGHTS.md`).
- `src/vendor/shared` drift touches `server` and `client` → record it where the surprise happened.
- Never write into `server/clones/`, `server/src/db/migrations/`, `.env*`, `pnpm-lock.yaml`. Never edit CLAUDE.md or docs from this skill — promoting an insight to a rule is the human's call.
- If the package's `INSIGHTS.md` is missing, create it from the skeleton at the bottom.

## Which section

The HTML comment under each heading is the criterion — read it before writing.

| Section | Goes here | Typical trigger |
|---|---|---|
| What Works | A non-default approach that proved effective | "this finally worked and the obvious way didn't" |
| What Doesn't Work | Dead ends, rejected approaches, your own wrong defaults — and why | You tried X for 20 minutes and it was a dead end. **The most skipped and the most valuable section — always check it.** |
| Codebase Patterns | Conventions and decisions *with the reason* | "always do X here because Y"; a constraint nobody wrote down |
| Tool & Library Notes | Dependency/tool quirks, version-specific behaviour | Behaviour differs from the docs or from what a green run implies |
| Recurring Errors & Fixes | Error text → root cause → fix | You or a teammate hit it twice |
| Session Notes | One line per wrap-up: `YYYY-MM-DD — <task>: <outcome / key learning>` | Wrap-up only, never as-you-go |
| Open Questions | Unverified suspicions, unresolved trade-offs, where to look next | You can't prove it yet — park it here instead of asserting it |

## Quality gate

Write the entry only if **all** hold:

1. **Not obvious** to someone reading the code. If it would be obvious, don't write it.
2. **Not already recorded** — `grep` the file, the package CLAUDE.md and the root CLAUDE.md. If a near-duplicate exists, add a dated follow-up instead of a second bullet.
3. **Actionable cold** — a future agent with zero context knows what to do. It names a file, function, command, flag or number.
4. **Verified** — you saw it happen. Otherwise it goes to *Open Questions*, labelled as unverified.
5. **Changes behaviour** — a future session would act differently because of it.
6. **Safe** — no secrets, tokens, personal data or customer content.

## Entry format

`- YYYY-MM-DD — <specific fact> → <what to do> (<evidence: path:line | commit | command>)`

One insight per bullet, at most two lines. Long explanations go to the package `docs/`, linked from the bullet. Use today's date.

Vague → useful:

| Vague (don't write) | Useful (write) |
|---|---|
| "Promises can be tricky" | "`Promise.all()` on the ingest pipeline times out after 30 items → use `Promise.allSettled()` in batches of 10" |
| "Be careful with async" | "Checkout state always goes through `cartStore.ts`, because 3 components share the cart → don't use local state there" |
| "Tests may be skipped" | "`*.it.test.ts` self-skip without Docker, so a green `pnpm test` may not have run them → check the output when touching SQL/routes" |
| "Migrations are tricky" | "Migrations are not applied on boot; 'relation … does not exist' means they were skipped → `pnpm db:migrate`" |

## Append-only rules

- Add bullets at the **end** of the matching section. Never edit, reorder or delete existing entries — that creates merge conflicts and loses lessons.
- A stale or wrong entry is corrected by a **new** bullet: `- YYYY-MM-DD — supersedes YYYY-MM-DD "<first words of old entry>": <correction> → <what to do>`.
- Keep the section order and the HTML comments intact.
- Past ~200 entries, or when sections get noisy, tell the user the file needs a prune/split rather than doing it yourself — pruning is a deliberate, reviewed commit.

## Wrap-up procedure

1. List what the session hit: problems, decisions, discoveries, dead ends. Drop anything that fails the gate.
2. Group by package, then by section; write the entries.
3. Add one *Session Notes* line per touched package.
4. Report to the user, one line per entry: `file › section › entry`. Say explicitly if nothing was written and why. Entries are a draft for human spot-check — the user may reject any of them.

## Skeleton for a missing file

```markdown
# <pkg> — insights

Non-obvious knowledge for this package, written via the `engineering-insights` skill.
Append-only: add bullets at the end of a section; never edit or delete — supersede with a new dated entry.
Format: `- YYYY-MM-DD — <specific fact> → <what to do> (<evidence>)`. One or two lines; long explanations go to `docs/`.

## What Works
<!-- Approaches that proved effective here and are not the obvious default -->

## What Doesn't Work
<!-- Dead ends, abandoned approaches, the agent's repeated wrong defaults — and why. Most skipped, most valuable. -->

## Codebase Patterns
<!-- Conventions and architecture decisions (with the reason) not stated in CLAUDE.md -->

## Tool & Library Notes
<!-- Dependency/tool quirks, version-specific behaviour -->

## Recurring Errors & Fixes
<!-- Error message → root cause → fix -->

## Session Notes
<!-- Wrap-up only: `- YYYY-MM-DD — <task>: <outcome / key learning>` -->

## Open Questions
<!-- Unresolved or unverified — what to investigate and where -->
```
