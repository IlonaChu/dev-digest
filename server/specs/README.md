# server — feature specs

One file per feature, written before implementation. Name: `L<NN>-<feature>.md` (e.g. `L03-smart-diff.md`).
Sections: **Goal** · **Scope** (in / out) · **API / contracts** · **Acceptance criteria**.
When a spec is implemented, note any deviation at the bottom of the spec.

## Index
- [L01-run-cost-badge.md](L01-run-cost-badge.md) — cost of each agent run on the PR list, timeline and trace drawer
- [review-flow.md](review-flow.md) — full review cycle: trigger, run state machine, persistence, SSE, reads, and the invariants (with pinning tests)
- [L02-skills.md](L02-skills.md) — reusable skills: CRUD + versions, agent links, import with vetting, prompt blocks
