/**
 * The ONE place that decides how a skill is rendered into an agent's prompt.
 * The server uses it to build the `## Skills / rules` section and the client's
 * Preview tab uses it to show exactly "as injected", so the two cannot drift.
 * Pure string formatting — no I/O.
 */
export interface SkillBlockInput {
  name: string;
  version: number;
  description: string;
  body: string;
}

export function formatSkillBlock(skill: SkillBlockInput): string {
  const head = `### Skill: ${skill.name} (v${skill.version})`;
  const when = skill.description.trim();
  return [head, ...(when ? [`Apply when: ${when}`] : []), '', skill.body.trim()].join('\n');
}
