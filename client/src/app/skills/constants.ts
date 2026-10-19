import type { SkillType } from "@devdigest/shared";

/** Skill types in the order the Type select offers them. */
export const SKILL_TYPES: readonly SkillType[] = ["rubric", "convention", "security", "custom"];

/** Default type for a skill written in the Add skill dialog. */
export const DEFAULT_SKILL_TYPE: SkillType = "custom";

/** Editor tabs (`?tab=`). */
export const SKILL_TABS = ["config", "preview", "versions"] as const;
export type SkillTab = (typeof SKILL_TABS)[number];
