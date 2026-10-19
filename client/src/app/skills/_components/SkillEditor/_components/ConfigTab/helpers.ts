import type { Skill, SkillType } from "@devdigest/shared";

/** The editable fields of the form. `enabled` is NOT here: the header switch
    saves on its own (like the card switch in the list), so the two never drift. */
export interface SkillForm {
  name: string;
  description: string;
  type: SkillType;
  body: string;
}

/** Form values seeded from the saved skill. */
export function formFrom(skill: Skill): SkillForm {
  return { name: skill.name, description: skill.description, type: skill.type, body: skill.body };
}

/** The fields that differ from the saved skill — the PUT patch. */
export function changedFields(skill: Skill, form: SkillForm): Partial<SkillForm> {
  const patch: Partial<SkillForm> = {};
  if (form.name !== skill.name) patch.name = form.name;
  if (form.description !== skill.description) patch.description = form.description;
  if (form.type !== skill.type) patch.type = form.type;
  if (form.body !== skill.body) patch.body = form.body;
  return patch;
}

/** Body or description changes snapshot a new version, so only then a change note applies. */
export function createsVersion(skill: Skill, form: SkillForm): boolean {
  return form.body !== skill.body || form.description !== skill.description;
}
