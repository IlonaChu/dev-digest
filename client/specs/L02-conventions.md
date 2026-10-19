# L02 — Conventions (client)

## Goal
Review the conventions found in a repo, accept / reject / edit them, and turn the accepted ones into a skill.
Server behaviour: [server/specs/L02-conventions.md](../../server/specs/L02-conventions.md).

## Scope
**In**: the Conventions page under a repo, the "Create skill from conventions" modal, a Skills Lab nav item.
**Out**: several skills per scan, scan diff, choosing an agent inside the modal (by product decision the skill is
not attached automatically; the user links it on the agent's Skills tab).

## Pages
| Route | What |
|---|---|
| `/repos/[repoId]/conventions` | header "Conventions in <repo>" + **Run Scan** (no scan yet) or **ReScan** (after a scan); "Detected from N sample files · last scan X ago"; **Deselect all / Select all** · "N of M accepted" · **Create skill** (only with ≥ 1 accepted); list of candidate cards |

Card: rule, `path:lines` + copy button, code snippet, Confidence bar + %, actions **Accept**/**Accepted** · **Reject** · **Edit**.
Modal: info banner, Name*, Description, Type (default `convention`), Enabled, Skill body* (editor with file name,
`unsaved`, `~N tokens`), footer "Saved as v1 · added to Skills Lab", Cancel / Create skill.

## Behaviour
- Before the first scan the header button and the empty state both say **Run Scan**; once a scan exists the header
  shows only **ReScan**. Both run the same call (loading state on the button); no button while the list loads.
- New candidates start undecided (`pending`); **Accept** turns a card green. **Reject** stores `status: 'rejected'`
  (`PATCH /conventions/:id`): the card disappears at once, the list never returns it again (also after a reload or a
  ReScan), and the server refuses it in the skill draft / create.
- **Edit** turns the rule into an inline textarea on the card (Save / Cancel, ⌘/Ctrl+Enter, Esc); no page change.
- **Deselect all** moves accepted cards to undecided (not rejected ones); the button becomes **Select all**.
- **Create skill** appears once at least one card is accepted. The modal opens with the server draft for the accepted
  rules (default name `repo-conventions`); every field is editable.
- `409 repo_not_ready` shows an explanation (clone / index not ready), `502` shows the server's message with retry.
- Name taken (`409 skill_name_taken`, e.g. a second `repo-conventions`) is shown inside the modal on the Name field.
- After saving: the app opens the new skill in the editor (`/skills/<id>?tab=config`) and shows a toast "Skill {name} created" with **Attach to agent** that opens `/agents` (pick an agent → Skills tab); the skills list refreshes.
- Closing the modal with unsaved edits asks for confirmation.

## Acceptance criteria
1. Extract, accept / reject / edit and bulk select work against the API; state survives a reload.
2. The modal creates an `extracted` skill from the edited body; the skill appears in `/skills` and is opened in the editor.
3. Conventions is in the Skills Lab nav (`g c`) and the command palette.
4. `pnpm typecheck && pnpm test` green; scratch `next build` green.

## Deviations
- The toast action opens `/agents`, not a per-skill page: a skill has no "agents" tab (linking lives in the agent's Skills tab) and the modal does not know which agent the user means.
- Copy button copies `path:lines`, not the snippet.
- Cards are ordered by confidence (server), not by file; rejected rows stay in the DB but are not listed, and there is
  no "restore" in the UI.
- No e2e flow: conventions start empty in the seed and the extract call needs a model, so a deterministic flow would need seeded rows.
