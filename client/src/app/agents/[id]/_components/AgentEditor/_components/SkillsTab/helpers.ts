import type { AgentSkillLink, Skill } from "@devdigest/shared";
import type { AgentSkillLinkInput } from "@/lib/hooks/skills";

/** An attached skill joined with its link, in prompt order. */
export interface AttachedSkill {
  skill: Skill;
  link: AgentSkillLink;
}

/** Links sorted by `order`, joined with their skills; links to deleted skills are dropped. */
export function attachedSkills(links: AgentSkillLink[], skills: Skill[]): AttachedSkill[] {
  const byId = new Map(skills.map((sk) => [sk.id, sk]));
  return [...links]
    .sort((a, b) => a.order - b.order)
    .flatMap((link) => {
      const skill = byId.get(link.skill_id);
      return skill ? [{ skill, link }] : [];
    });
}

/** The payload the server replaces the agent's skills with (order = array index). */
export function toLinkInputs(items: AttachedSkill[]): AgentSkillLinkInput[] {
  return items.map((i) => ({ skill_id: i.skill.id, enabled: i.link.enabled }));
}

/** Move the item at `from` to `to` (no-op when out of range). */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= list.length || from < 0 || from >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** Case-insensitive name filter; an empty search matches everything. */
export function matchesSearch(skill: Skill, search: string): boolean {
  const q = search.trim().toLowerCase();
  return !q || skill.name.toLowerCase().includes(q);
}

/** Skills the agent has not attached yet, filtered by name. */
export function unattachedSkills(skills: Skill[], attached: AttachedSkill[], search: string): Skill[] {
  const taken = new Set(attached.map((a) => a.skill.id));
  return skills.filter((sk) => !taken.has(sk.id) && matchesSearch(sk, search));
}
