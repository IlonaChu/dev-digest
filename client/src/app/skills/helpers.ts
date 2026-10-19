import type { Skill } from "@devdigest/shared";
import { SKILL_TABS, type SkillTab } from "./constants";

/** Validate the `?tab=` param; anything unknown falls back to `config`. */
export function parseSkillTab(raw: string | null): SkillTab {
  return (SKILL_TABS as readonly string[]).includes(raw ?? "") ? (raw as SkillTab) : "config";
}

/** Case-insensitive filter over a skill's name, description and type. */
export function filterSkills(skills: Skill[], search: string): Skill[] {
  const q = search.trim().toLowerCase();
  if (!q) return skills;
  return skills.filter((sk) => `${sk.name} ${sk.description} ${sk.type}`.toLowerCase().includes(q));
}
