import type { SkillType } from "@devdigest/shared";

/** Accent colour per skill type (badge text + icon tint on cards). */
export const TYPE_COLOR: Record<SkillType, string> = {
  rubric: "var(--accent)",
  convention: "var(--ok)",
  security: "var(--crit)",
  custom: "var(--text-secondary)",
};
