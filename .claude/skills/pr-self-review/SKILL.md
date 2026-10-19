---
name: pr-self-review
description: "Local pre-PR gate for DevDigest: reviews ALL open changes of the branch (commits since merge-base with origin/main + staged + unstaged + untracked) by routing each changed file to the matching project skills — UI skills on client/ files, backend architecture skills on server/ and reviewer-core/ files — plus typecheck, arch:check and repo-rule checks. Any CRITICAL finding blocks `git push` and `gh pr create`. Use before pushing or opening a pull request, when the pr-self-review gate blocks a push, or when the user says 'self review', 'review my changes', 'ready for PR?', 'check before push'."
argument-hint: "[--base <ref>] [--tests]"
disable-model-invocation: true
---

# PR Self-Review

Reviews local changes before they leave the machine. The verdict is stored per **tree SHA** in
`.git/pr-self-review/`. A Claude Code `PreToolUse` hook (`.claude/settings.json`) and the git `pre-push` hook
(`.githooks/pre-push`) both run `scripts/gate.mjs`. They allow `git push` / `gh pr create` only when the exact
code being pushed has a **PASS** verdict. Any edit after the review invalidates it.

**No override.** A CRITICAL can only be fixed and re-reviewed. The local gate can be bypassed with
`git push --no-verify`. That is a known limit of a local gate; never suggest it as a way around the review.

`S=.claude/skills/pr-self-review/scripts` below. Run everything from the repo root.

## Workflow

### 1. Collect the diff
`node $S/collect-diff.mjs [--base <ref>]` writes `.git/pr-self-review/diff.json` and prints `tree_sha`,
`base_sha`, `head_sha`, `warnings` and the file list. Relay the warnings to the user (uncommitted changes, stale base).
No files → report "nothing to review" and stop. Never open `.env*` files. The script already skips their contents.

### 2. Route files to skills
`node $S/route.mjs` prints `groups` (ui / backend / cross → skills + files), `skills`, `uncovered` and
`unrouted_skills`. The routing lives in [routing.json](routing.json). Do not re-route by judgement. If the routing
looks wrong, say so in the report and fix `routing.json` in a separate change. Each entry of `unrouted_skills` →
one WARNING `skill-not-routed` (a skill exists in `.claude/skills/` but routing.json does not mention it).

### 3. Deterministic checks (start them in the background, in parallel with step 4)
- `node $S/repo-rules.mjs` → findings, used as-is.
- For every package with changed files (`client`, `server`, `reviewer-core`, `e2e`): `cd <pkg> && pnpm typecheck`.
- `server` changed → `cd server && pnpm arch:check`. `reviewer-core` changed → `cd reviewer-core && pnpm test -- architecture`.
- `--tests` → also `pnpm test` per changed package. It is off by default: server integration tests start Postgres via Testcontainers.
- A failing command → one **CRITICAL** finding per distinct error (`skill: "checks"`, `rule: "<command>"`,
  `file:line` from the output, evidence = the error line). These are machine-verified and skip step 5.
  A missing `node_modules` is not a code defect: tell the user to run `pnpm install` in that package and stop.

### 4. Skill review — one subagent per non-empty group, all in ONE message
For each group in `groups` (split a group into batches of ≤ 20 files), launch an Agent (`general-purpose`)
with the prompt from [reviewer-prompt.md](reviewer-prompt.md), filled with:
- the group's skills (→ their `SKILL.md` paths) and **only the files routed to them**;
- `base_sha`, so the agent runs `git diff -U10 <base_sha> -- <files>` (untracked files: read them whole);
- the path of [rubric.md](rubric.md).

Each agent returns a JSON array of findings in the schema from reviewer-prompt.md.

### 5. Verify every LLM CRITICAL
False blocks are expensive (there is no override), so check each CRITICAL from step 4 with a separate skeptic Agent
(batch them in ONE message). Use the "Verifier" prompt in reviewer-prompt.md. `CONFIRMED` → stays CRITICAL.
Otherwise → WARNING with `"unverified": true` and the verifier's reason in `evidence`.

### 6. Merge and record
1. Normalize severities with [rubric.md](rubric.md). Drop findings whose `file:line` is not in the diff.
2. Dedupe by `file:line` + same root cause: keep the highest severity and list every skill name in `skill`.
3. Write `.git/pr-self-review/result.json`:
   `{ "tree_sha", "base_sha", "head_sha", "skills_run": [...], "uncovered": [...], "notes": [...], "findings": [...] }`.
   `notes` carries legacy-baseline violations in touched files and anything the user should know. Notes never block.
4. `node $S/gate.mjs record .git/pr-self-review/result.json`. This computes the status: any CRITICAL → BLOCK.
   It writes `<tree>.json` and `latest.md` and refuses if the code changed during the review. Never write the
   verdict file by hand.

### 7. Report to the user
- First line: `BLOCKED — N critical` or `PASS — N warnings, M suggestions`.
- Findings table, CRITICAL first: severity · clickable `path:line` · skill · what breaks · fix.
- Routing summary (skill → files) and the files no skill covered.
- BLOCKED → "fix the CRITICAL findings, then run /pr-self-review again". PASS with uncommitted changes →
  "commit them; the verdict carries over as long as the content is unchanged".
- If you were invoked because the gate blocked a `git push` / `gh pr create`, retry that command only after PASS.

## Files
| File | Role |
|---|---|
| [routing.json](routing.json) | skill → globs + content signals. Add every new skill here (rules or `never`) |
| [rubric.md](rubric.md) | severity normalization and the "never CRITICAL" list |
| [reviewer-prompt.md](reviewer-prompt.md) | reviewer and verifier subagent prompts, finding schema |
| `scripts/collect-diff.mjs` · `route.mjs` · `repo-rules.mjs` · `gate.mjs` | Node built-ins only. Tests: `node --test .claude/skills/pr-self-review/scripts/` |

Setup per clone (once): `git config core.hooksPath .githooks`. The Claude Code hook needs no setup.
