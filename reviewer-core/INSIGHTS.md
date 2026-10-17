# reviewer-core — insights

Known gotchas for this package — things the code does not make obvious.
Append new entries at the bottom. Format: `- YYYY-MM-DD — <gotcha> → <what to do>`.
Keep each entry to one or two lines; move long explanations into `docs/`.

- 2026-10-12 — Map-reduce runs only when the diff is >400 changed lines AND multi-file; single-file diffs always go single-pass. The studio default is `single-pass` (server `REVIEW_STRATEGY`), so map-reduce runs there only if an agent sets `auto`/`map-reduce`.
