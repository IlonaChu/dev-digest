# L02 — Skills (server)

## Goal
Workspace-level **skills**: markdown instructions that live in the DB, are reused by many agents, can be
edited and versioned, and are inserted into an agent's prompt in a chosen order. A skill is **text only** —
it has no tools, scripts or side effects. A skill imported from someone else is someone else's
instructions inside our prompt, so it is vetted before it can be enabled.

## Scope
**In**
- CRUD over `skills`; the DB is the source of truth. Versions in `skill_versions` (body + description snapshot).
- Link skills to agents (`agent_skills`): order + a per-agent `enabled` switch.
- Import from `.md` or `.zip` → preview (nothing stored) → confirm → stored **disabled**.
- Import from a public URL: the server downloads the file (http(s) only, 1 MiB / 15 s caps, GitHub file pages
  → raw) and returns the same upload payload, so preview → confirm run unchanged; stored as `source='imported_url'`.
- Vetting of imported skills (rules + LLM); only `clean` may be enabled.
- Prompt assembly: enabled skills as `### Skill:` blocks, with a per-skill token count in the trace.
- Seed: Test Quality Reviewer + 4 skills linked in order.
- Seed: API Contract Reviewer + 3 skills linked in order (`breaking-change`, `response-schema`,
  `semver-discipline`). Its 4th skill, `deprecation-policy`, is NOT seeded: it ships as
  `docs/demo-skills/deprecation-policy.zip` (source `docs/demo-skills/deprecation-policy/SKILL.md`) and is
  imported through the UI (Add skill → From file → preview → Save → vetting `clean` → enable → link as 4th on the
  agent's Skills tab), so a new agent carries an `imported` skill that went through preview and vetting.

**Out**
- Community catalog, Evals, Stats, "Run on evals".
- Bumping the agent's version when its skill links change.

## Data
Migration `0012_*` (generated): `skills.vetting jsonb`, unique `(workspace_id, name)`, `skill_versions.description`
and `.message`, `agent_skills.enabled` (default true) + index on `skill_id`. `skills.source` gains `'imported'`.

**Versions.** A change to `body` or `description` → `version + 1` and a snapshot (optional `version_message`).
`name`, `type`, `enabled` never bump. Restore of vK writes a **new** version with vK's content, message
`Restored from vK`; history is never rewritten.

## API
| Route | Notes |
|---|---|
| `GET /skills`, `GET /skills/:id` | include `agent_count`, `vetting` |
| `POST /skills` | always `source: 'manual'` |
| `PUT /skills/:id` | `{name?, description?, type?, body?, enabled?, version_message?}` |
| `DELETE /skills/:id` | cascades links and versions |
| `GET /skills/:id/versions` | newest first |
| `POST /skills/:id/versions/:version/restore` | |
| `POST /skills/import/fetch` | `{url}` → `SkillImportFile` (`{filename, content_base64, source_url}`); downloads only, stores nothing; `422 skill_fetch_failed` when the download fails |
| `POST /skills/import/preview` | `{filename, content_base64}` → `SkillImportPreview`, stores nothing |
| `POST /skills/import` | file + `{name?, description?, type?, source_url?}`; server re-parses and re-vets, saves `enabled=false`, `source='imported'` (`'imported_url'` when `source_url` is set) |
| `POST /skills/:id/vet` | re-run the check (imported skills only) |
| `POST /agents/:id/skills` | `{links:[{skill_id, enabled}]}` ordered, replaces the set; legacy `skill_ids`/`skill_id` still work; foreign-workspace skill → 422 |

Errors: `409 skill_name_taken`, `409 skill_blocked` (details = reason), `422` for bad files / foreign skills.

## Import
- `.md` (optional one-line frontmatter `name`/`description`/`type`) or `.zip`.
- Zip: root `SKILL.md`, else the single top-level folder's `SKILL.md`, else the only root `.md`. **Everything
  else is only listed** in `ignored_files` (`executable: true` for `.sh .py .js .ts .exe …`, `scripts/`, `bin/`).
  Nothing is extracted or run: the `ArchiveReader` port can only list entries and read **one** named text
  entry, size-capped. Limits: archive ≤ 1 MiB, ≤ 500 entries, `SKILL.md` ≤ 256 KB.

## Vetting
1. **Hard rules → `malicious`**: invisible/bidi/tag unicode, `<untrusted` tags, `curl|wget … | sh`, base64-like
   blobs ≥ 200 chars, HTML comments carrying instructions.
2. **Soft heuristics → hints for the LLM only** (ignore-previous-instructions, "you are now", suppress/approve/score
   100, external URLs, run/execute script). A security skill may legitimately quote them.
3. **LLM** (feature model `skill_vetting`, Settings → Models; body wrapped with `wrapUntrusted`) returns
   `{verdict, reasons}`. LLM failure → `unverified`, never `clean`.
4. Status = worst of all. Only `clean` for the **current version** may be enabled (`_shared/skill-policy.ts`);
   `suspicious`, `malicious`, `unverified` and a stale check block enabling. Editing an imported skill re-vets it
   and force-disables it unless clean. Skills written in the product skip vetting.

## Prompt
`isPromptUsable = skill.enabled && link.enabled && canEnable`. Each usable skill is rendered by
`formatSkillBlock` (`### Skill: <name> (v<n>)`, `Apply when: <description>`, body) in link order into
`## Skills / rules`. The run log gets one line `skills: N attached — name vX · T tok, …` (nothing when none);
the trace's `prompt_assembly.skills_meta` carries `{id, name, version, tokens}`. Skills are rendered
**unwrapped** (reviewer-core contract), which is exactly why imported ones must be vetted first.

## Acceptance criteria
1. CRUD + versions + restore work; name unique per workspace.
2. Preview stores nothing; import stores a disabled `imported` skill; archive scripts are never read or run.
3. A non-`clean` imported skill cannot be enabled (409), including via `PUT`.
4. A globally disabled, link-disabled or unvetted-imported skill is absent from the prompt and the log.
5. `skills_meta` token counts appear in the trace.
6. The seeded Test Quality Reviewer (4 skills) and API Contract Reviewer (3 skills) inject their skills in link
   order; the API Contract prompt takes its compatibility rubric only from its skills, so a run without them is
   the control case for the skills.
7. `pnpm typecheck && pnpm test` green, IT tests actually ran, `pnpm arch:check` clean.
