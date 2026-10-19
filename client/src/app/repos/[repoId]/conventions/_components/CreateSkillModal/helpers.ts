import type { ConventionSkillDraft, SkillType } from "@devdigest/shared";

export interface SkillForm {
  name: string;
  description: string;
  type: SkillType;
  enabled: boolean;
  body: string;
}

export function formFromDraft(draft: ConventionSkillDraft): SkillForm {
  return {
    name: draft.name,
    description: draft.description,
    type: draft.type,
    enabled: true,
    body: draft.body,
  };
}

/** True once the user changed anything the server proposed. */
export function isDirty(form: SkillForm, initial: SkillForm): boolean {
  return (
    form.name !== initial.name ||
    form.description !== initial.description ||
    form.type !== initial.type ||
    form.enabled !== initial.enabled ||
    form.body !== initial.body
  );
}

export function canSubmit(form: SkillForm): boolean {
  return form.name.trim().length > 0 && form.body.trim().length > 0;
}
