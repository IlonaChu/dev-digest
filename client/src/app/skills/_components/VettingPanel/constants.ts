import type { SkillVettingStatus } from "@devdigest/shared";

/** Badge colours per vetting status. */
export const STATUS_COLOR: Record<SkillVettingStatus, { color: string; bg: string }> = {
  clean: { color: "var(--ok)", bg: "var(--ok-bg)" },
  suspicious: { color: "var(--warn)", bg: "var(--warn-bg)" },
  malicious: { color: "var(--crit)", bg: "var(--crit-bg)" },
  unverified: { color: "var(--text-secondary)", bg: "var(--bg-hover)" },
};
