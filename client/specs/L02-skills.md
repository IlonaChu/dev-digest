# L02 — Skills (client)

## Goal
Manage skills in the UI and attach them to agents. Server behaviour: [server/specs/L02-skills.md](../../server/specs/L02-skills.md).

## Scope
**In**: Skills page (grid + preview drawer + Add Skill), skill editor (Config · Preview · Versions),
import flow with preview and vetting, agent editor **Skills** tab, skills block in the run trace.
**Out**: Evals / Stats tabs and "Run on evals" (not rendered), URL and community import.

## Pages
| Route | What |
|---|---|
| `/skills` | search + grid of cards (name, type, description, enabled toggle, delete, source, "N agents"); click → preview drawer; **Add Skill ▾** → Create / Import from file |
| `/skills/new`, `/skills/[id]` | left list (cards with toggle + delete) + editor; tabs via `?tab=config\|preview\|versions` |
| `/agents/[id]?tab=skills` | ONE list of all skills: grip + checkbox + name + type; checked = attached to this agent; attached skills come first and are dragged (or Alt+↑/↓ on the grip) to reorder; filter; `N of M enabled` pill; saved on every change |

## Behaviour
- **Description is the skill's interface** — written as a directive (when to apply, what to flag); a caption under the field says so.
- **Config** shows `unsaved`, `~N tokens`, and a *Change note* field only when body/description changed.
- **Two-level enable**: card/editor toggle = global; agent tab checkbox = this agent only (unchecking unlinks). A skill reaches the prompt only if both are on. A blocked skill's checkbox cannot be switched on.
- **Delete**: trash on a skill card (list, grid) and in the editor header; confirm first; versions and agent links are removed; deleting the open skill returns to `/skills`.
- **Body editor**: a textarea with a line-number gutter; Markdown headings (`# `…`###### `, outside code fences) are coloured by a mirror layer behind it.
- **Import**: pick `.md`/`.zip` → preview (editable name/description/type, rendered body, ignored files with
  "executable — not processed", vetting panel, trust warning) → Save. Saved **disabled**. Non-`clean` imported
  skills show their status and the toggle is disabled with the reason; "Re-run check" is available.
- **Versions**: list with note/date/Current, Diff (line diff), Restore.
- **Run trace**: Skills block shows `N skills · T tokens` and `name vX · tokens` chips.

## Acceptance criteria
1. A skill can be created, edited, versioned and restored in the UI.
2. Import goes through the preview; nothing is saved before confirm; scripts are listed but marked not processed.
3. A blocked imported skill cannot be enabled from any toggle.
4. The agent Skills tab attaches (check), unlinks (uncheck) and reorders (drag); the order matches the prompt blocks.
5. A skill can be deleted from its card; it disappears from every agent's list.
6. `pnpm typecheck && pnpm test` green; scratch `next build` green.
