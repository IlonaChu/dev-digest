---
name: engineering-insights
description: Records non-obvious engineering learnings into the INSIGHTS.md of the package the work touched (client, server, reviewer-core, e2e). Use proactively the moment something non-obvious is confirmed — a fix that took more than one attempt, a dead end, a misleading error, a library or tool quirk, an undocumented convention or decision — and at wrap-up after any meaningful task (a problem solved, a decision made, a discovery). Also use when the user says "wrap up", "save insights", "what did we learn" or "log this gotcha". Skip trivial edits.
---

1. Target `<pkg>/INSIGHTS.md` of the package the insight is about — `client/`, `server/` (incl. repo-intel), `reviewer-core/`, `e2e/`; never `server/clones/`.
2. Pick one of its 7 sections — the HTML comment under each heading is the criterion; don't skip *What Doesn't Work*.
3. Write only if it is not obvious to someone reading the code and not already in CLAUDE.md or the file (grep first); unverified → *Open Questions*.
4. Format `- YYYY-MM-DD — <specific fact: file/function/command/number> → <what to do> (<path:line | commit>)`, max 2 lines, actionable cold: "careful with async" ✗ · "`*.it.test.ts` self-skip without Docker → check the output when touching SQL" ✓.
5. Append-only: add at the end of the section; never edit or delete — correct a stale entry with a new one `supersedes YYYY-MM-DD "<first words>"`.
6. Wrap-up: review the session against every section, then add one *Session Notes* line.
7. Finish by telling the user one line per entry: file › section › entry.
