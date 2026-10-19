import { SkillType } from "@devdigest/shared";

/** Skill types in the order the Type select offers them — the contract's enum order, so a
    type added to the contract shows up in every select. */
export const SKILL_TYPES: readonly SkillType[] = SkillType.options;

/** Default type for a skill written in the Add skill dialog. */
export const DEFAULT_SKILL_TYPE: SkillType = "custom";

/** Editor tabs (`?tab=`). */
export const SKILL_TABS = ["config", "preview", "versions"] as const;
export type SkillTab = (typeof SKILL_TABS)[number];
