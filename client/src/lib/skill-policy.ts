import type { Skill, SkillSource, SkillVettingStatus } from "@devdigest/shared";

/**
 * Client mirror of the server's enable policy (`server/src/modules/_shared/skill-policy.ts`).
 * The server stays authoritative (it answers 409 `skill_blocked`); this only lets the UI
 * disable a switch and explain why instead of letting the user hit the error.
 *
 * Skills written in the product are the author's own text. Anything that came from
 * outside is someone else's instructions inside the agent's prompt, so it needs a
 * `clean` safety check for the CURRENT version before it can be enabled.
 */
const VETTED_SOURCES: ReadonlySet<SkillSource> = new Set(["imported", "imported_url", "community"]);

export type SkillBlockReason = "not_checked" | "stale_check" | Exclude<SkillVettingStatus, "clean">;

export function requiresVetting(source: SkillSource): boolean {
  return VETTED_SOURCES.has(source);
}

/** Why the skill cannot be enabled, or null when it can. */
export function skillBlockReason(skill: Pick<Skill, "source" | "version" | "vetting">): SkillBlockReason | null {
  if (!requiresVetting(skill.source)) return null;
  const v = skill.vetting;
  if (!v) return "not_checked";
  if (v.version !== skill.version) return "stale_check";
  return v.status === "clean" ? null : v.status;
}

/** `skills` namespace key (under `vetting.`) that explains a block reason. */
export function blockReasonKey(reason: SkillBlockReason): string {
  if (reason === "not_checked") return "notChecked";
  if (reason === "stale_check") return "stale";
  return `summary.${reason}`;
}
