import type { Skill, SkillType } from "@devdigest/shared";

/** The editable fields of the form. */
export interface SkillForm {
  name: string;
  description: string;
  type: SkillType;
  body: string;
  enabled: boolean;
}

/** Form values for a skill (or the blank form for a new one). */
export function formFrom(skill: Skill | undefined, defaults: { type: SkillType }): SkillForm {
  return skill
    ? { name: skill.name, description: skill.description, type: skill.type, body: skill.body, enabled: skill.enabled }
    : { name: "", description: "", type: defaults.type, body: "", enabled: true };
}

/** The fields that differ from the saved skill — the PUT patch. */
export function changedFields(skill: Skill, form: SkillForm): Partial<SkillForm> {
  const patch: Partial<SkillForm> = {};
  if (form.name !== skill.name) patch.name = form.name;
  if (form.description !== skill.description) patch.description = form.description;
  if (form.type !== skill.type) patch.type = form.type;
  if (form.body !== skill.body) patch.body = form.body;
  if (form.enabled !== skill.enabled) patch.enabled = form.enabled;
  return patch;
}

/** Body or description changes snapshot a new version, so only then a change note applies. */
export function createsVersion(skill: Skill, form: SkillForm): boolean {
  return form.body !== skill.body || form.description !== skill.description;
}
