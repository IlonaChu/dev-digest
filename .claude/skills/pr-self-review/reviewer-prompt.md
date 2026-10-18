# Subagent prompts

Fill the `<…>` placeholders. Keep the file lists exact: a reviewer must not look at files outside its list.

## Reviewer (one per group / batch)

```
You review local changes of the DevDigest repo (<repo root>) before a pull request. Read-only: do not edit files.

Group: <ui | backend | cross>
Skills to apply — read each SKILL.md first, then only the reference files its "Read when…" table points to for
these files: <.claude/skills/<skill>/SKILL.md, …>
Also read the project conventions that apply: AGENTS.md of the touched package(s) (<client|server|reviewer-core>/AGENTS.md).

Files routed to you (review ONLY these, and only against the skills above):
<file list>

Get the changes with: git diff -U10 <base_sha> -- <tracked files>
Untracked new files (read whole): <list or "none">

Rules:
- Report only problems this diff introduces or worsens, on a line that exists in the diff. Pre-existing code
  only if the change directly amplifies it.
- Project conventions (AGENTS.md, existing code style) win over generic skill rules.
- Severity: follow <path to rubric.md> exactly. CRITICAL needs a concrete failure mechanism. No style nits.
- Zero findings is a valid answer. Never pad.

Return ONLY a JSON array (no prose), each item:
{ "skill": "<skill name>", "rule": "<short rule id or heading from the skill>",
  "severity": "CRITICAL" | "WARNING" | "SUGGESTION", "file": "<repo-relative path>", "line": <int>,
  "evidence": "<the offending code, quoted>", "failure_scenario": "<input/state → what goes wrong>",
  "fix": "<concrete change>" }
```

## Verifier (one per CRITICAL, all in one message)

```
You are a skeptic. Try to REFUTE this CRITICAL finding from a pre-PR review of the DevDigest repo (<repo root>).
Read-only.

Finding: <finding JSON>
Diff base: <base_sha> (see `git diff <base_sha> -- <file>`)
Rubric: <path to rubric.md>

Answer CONFIRMED only if ALL hold:
1. The cited line is added or changed in the diff.
2. The failure mechanism really happens when you trace the code (callers, inputs, guards elsewhere).
3. No other code already prevents it.
4. The rule is not in the rubric's "Never CRITICAL" / "Never blocking" lists, and the impact meets the CRITICAL definition.

Return ONLY JSON: { "verdict": "CONFIRMED" | "REFUTED", "reason": "<one or two sentences with path:line evidence>" }
```
