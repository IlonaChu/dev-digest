import type { SkillSource, SkillVetting } from '@devdigest/shared';

/**
 * Who may enable a skill and what reaches an agent's prompt. Pure — shared by
 * the skills module (enable gate), the agents module (link listing) and the
 * review run executor (prompt assembly), so the rule exists exactly once.
 *
 * A skill is somebody's instructions inside the agent's prompt. Skills written
 * in the product are the author's own text; every other source must have a
 * `clean` vetting result for the CURRENT version before it can be enabled.
 */
const VETTED_SOURCES: ReadonlySet<SkillSource> = new Set(['imported', 'imported_url', 'community']);

export interface PolicySkill {
  source: SkillSource;
  enabled: boolean;
  version: number;
  vetting?: SkillVetting | null;
}

export function requiresVetting(source: SkillSource): boolean {
  return VETTED_SOURCES.has(source);
}

/** Why the skill cannot be enabled, or null when it can. */
export function enableBlockReason(skill: Pick<PolicySkill, 'source' | 'version' | 'vetting'>): string | null {
  if (!requiresVetting(skill.source)) return null;
  const v = skill.vetting;
  if (!v) return 'not_checked';
  if (v.version !== skill.version) return 'stale_check';
  return v.status === 'clean' ? null : v.status;
}

export function canEnable(skill: Pick<PolicySkill, 'source' | 'version' | 'vetting'>): boolean {
  return enableBlockReason(skill) === null;
}

/** Enabled globally AND for this agent AND allowed by the vetting policy. */
export function isPromptUsable(skill: PolicySkill, linkEnabled: boolean): boolean {
  return skill.enabled && linkEnabled && canEnable(skill);
}
