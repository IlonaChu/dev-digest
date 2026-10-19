import type { SkillImportPreview } from "@devdigest/shared";

export interface ImportDraftInput {
  preview: SkillImportPreview | null;
  hasPayload: boolean;
  name: string;
  confirmed: boolean;
}

export interface ImportDraftState {
  /** The name the user will save is the one the preview reported as taken. */
  nameBlocked: boolean;
  /** Vetting found something; the skill can be saved but not enabled. */
  blocked: boolean;
  canSave: boolean;
}

/** The save rules of an import review. The preview only knows whether the ORIGINAL name is
    taken, so a renamed skill may save; names are compared trimmed, as `save` sends them. */
export function importDraftState({ preview, hasPayload, name, confirmed }: ImportDraftInput): ImportDraftState {
  const trimmed = name.trim();
  const nameBlocked = !!preview?.name_taken && trimmed === preview.name.trim();
  return {
    nameBlocked,
    blocked: !!preview && preview.vetting.status !== "clean",
    canSave: hasPayload && !!preview && confirmed && !nameBlocked && trimmed.length > 0,
  };
}
