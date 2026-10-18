import type { SkillType } from "@devdigest/shared";

/** Skill types in the order the Type select offers them. */
export const SKILL_TYPES: readonly SkillType[] = ["rubric", "convention", "security", "custom"];

/** Default type for a skill created from scratch. */
export const DEFAULT_SKILL_TYPE: SkillType = "custom";

/** Editor tabs of an existing skill (`?tab=`). A new skill only has `config`. */
export const SKILL_TABS = ["config", "preview", "versions"] as const;
export type SkillTab = (typeof SKILL_TABS)[number];
