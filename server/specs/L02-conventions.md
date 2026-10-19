# L02 — Conventions extractor (server)

## Goal
Find the coding conventions a repo actually follows and offer them as a skill. **Code selects the samples and
verifies the evidence; the model only proposes candidates.** A candidate the code cannot prove is dropped, so
what the user reviews is real. Accepted candidates are merged into ONE skill (`source: 'extracted'`, default name
`repo-conventions`) that the user then links to an agent on the agent's Skills tab, with the existing skills
mechanism ([L02-skills.md](L02-skills.md)).

## Scope
**In**
- `POST /repos/:id/conventions/extract`: samples → one cheap-model call → evidence check → store.
- Store candidates with status (`pending` / `accepted` / `rejected`), edit of the rule text, per-scan metadata.
- A deterministic skill draft from chosen conventions and creation of the skill.

**Out**
- Several skills per scan (split by `category`), PR-history / review-comment mining, a critic pass, adherence
  counting ("followed in 18 of 20 files") — see *Next*.
- Linking to an agent from this module: by product decision the skill is NOT attached automatically; the user
  links it on `/agents/:id?tab=skills` (`POST /agents/:id/skills`).
- Background jobs: the extract call is synchronous, like skill vetting.

## Data
Migration `0013_*` (generated). `conventions` (existing stub) gains `category`, `rule_key`, `evidence_start_line`,
`evidence_end_line`, `scan_id`, `status` (CHECK `pending|accepted|rejected`, default `pending`, migration `0014_*`), `edited`,
`created_at`, `updated_at`; `accepted` is dropped; `repo_id` and the evidence columns become NOT NULL; unique
`(repo_id, evidence_path, rule_key)`. New `convention_scans`: `sample_count, found, dropped, model, tokens_in,
tokens_out, cost_usd` (`null` = unknown price, never coerced to 0).

`rule_key` is the normalised ORIGINAL wording; it identifies a rule across re-scans and is not changed by an edit.

## Pipeline
1. **Ready?** Unknown repo → 404. No `clone_path`, or `getConventionSamples` returns nothing readable → `409 repo_not_ready`;
   the model is not called.
2. **Samples (no model).** Root config files (`tsconfig*`, `eslint.config.*`, `.eslintrc*`, `.prettierrc*`,
   `prettier.config.*`, `.editorconfig`) + `repoIntel.getConventionSamples(repoId, 12)` (paths only; its junk filter
   drops configs, so they are read separately). All reads via `sourceTree.read` (root-confined). Caps per file and
   per prompt (`constants.ts`). Lines are numbered in the prompt.
3. **Model.** Feature model `conventions` (Settings → Models; default now `openrouter deepseek/deepseek-v4-flash`),
   `temperature: 0`, every file wrapped with `wrapUntrusted`. Returns `{category, rule, evidence:{path,start_line,end_line,quote}, confidence}[]` (≤ 30).
   Outage → `502 extraction_failed` with a readable message; missing key → `409`.
4. **Verify (`verify-evidence.ts`, pure).** Dropped when: the file was not sampled; the range is outside the file,
   inverted or > 40 lines; the `quote` (whitespace-normalised) is not inside the cited lines; confidence < 0.5.
   The stored snippet is cut from the file, never taken from the model.
5. **Store (one transaction).** Insert the scan row. A candidate matching a stored `(path, rule_key)` refreshes
   evidence/confidence and keeps status and edited text; a new one starts `pending`. Undecided (`pending`, not
   edited) rows not found again are deleted. Accepted/rejected rows are never removed by a re-scan.

## API
| Route | Notes |
|---|---|
| `GET /repos/:id/conventions` | `{items, scan}`, items by confidence desc; `rejected` rows are NOT listed |
| `POST /repos/:id/conventions/extract` | full pipeline → `ConventionList` |
| `PATCH /conventions/:id` | `{status?, rule?}`; a rule edit sets `edited`; evidence is immutable. Reject in the UI = `{status: 'rejected'}`: the row stays stored (so a re-scan keeps it rejected) but leaves the list |
| `PATCH /repos/:id/conventions/status` | `{status: 'pending'\|'accepted'}` for all NOT-rejected rows (select / deselect all) |
| `POST /repos/:id/conventions/skill-draft` | `{ids}` (accepted only) → `{name, description, type, body, token_estimate}`; name `repo-conventions` (fixed default, editable in the modal) |
| `POST /repos/:id/conventions/skill` | `{name, description?, type?, enabled?, body, convention_ids}` (accepted only) → 201 `{skill_id}`; skill `source: 'extracted'`, `evidence_files` = evidence paths; not linked to any agent |

Errors: `409 repo_not_ready`, `502 extraction_failed`, `409 skill_name_taken` (e.g. a second `repo-conventions`; the
user renames it in the modal), `422` for ids from another repo, ids that are not `accepted` (pending or rejected) /
empty patch.
Contracts: `src/vendor/shared/contracts/conventions.ts` (the old unused `ConventionCandidate` was removed).

## Security
An extracted skill is repo-derived text rendered UNWRAPPED in the prompt, and `'extracted'` is not in
`VETTED_SOURCES`. Mitigation: snippets come from the file (≤ 12 lines, fenced with a fence longer than any backtick
run inside), and the user reads and edits the whole body before saving. Do not add `extracted` to the vetted set
without a product decision (it would block enabling until a `clean` vetting exists).

## Next (not in this spec)
Adherence counting by code to calibrate confidence · multi-pass by category/directory for more findings ·
review history and PR comments as extra evidence · a critic pass dropping trivial rules · one skill per category ·
scan diff ("rule stopped being followed").

## Acceptance criteria
1. Only candidates whose file, range and quote verify are stored; `dropped` counts the rest.
2. One model call per extract, with the `conventions` feature model; cost stored as given.
3. `409 repo_not_ready` without a model call when nothing can be sampled.
4. Re-scan keeps accepted / rejected / edited state; a rejected rule never comes back to the list.
5. Only accepted rules reach the skill. Creating it stores an `extracted` skill v1 named `repo-conventions` by
   default; the user attaches it to an agent on the agent's Skills tab, and then it reaches the prompt.
6. `pnpm typecheck && pnpm test` green, IT tests actually ran, `pnpm arch:check` clean.
