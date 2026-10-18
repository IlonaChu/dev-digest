import { SkillVetting } from '@devdigest/shared';
import type { Skill, SkillVersion } from '@devdigest/shared';
import type { SkillRow, SkillVersionRow } from './repository.js';

/**
 * Pure helpers for the skills module — DB row ⇄ DTO mapping. No I/O.
 */

/** Map a persisted skill row to the public `Skill` DTO. */
export function toSkillDto(row: SkillRow, agentCount?: number): Skill {
  // The vetting jsonb is untyped at rest; an unreadable value degrades to null,
  // which the policy treats as "not checked" (blocked), never as clean.
  const vetting = row.vetting ? SkillVetting.safeParse(row.vetting) : null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    source: row.source,
    body: row.body,
    enabled: row.enabled,
    version: row.version,
    evidence_files: row.evidenceFiles ?? null,
    vetting: vetting?.success ? vetting.data : null,
    ...(agentCount !== undefined ? { agent_count: agentCount } : {}),
  };
}

/** Map a persisted skill_versions row to the public `SkillVersion` DTO. */
export function toSkillVersionDto(row: SkillVersionRow): SkillVersion {
  return {
    skill_id: row.skillId,
    version: row.version,
    body: row.body,
    description: row.description,
    message: row.message ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

/** True when a patch changes what the model reads (body or description). */
export function isContentChange(
  existing: Pick<SkillRow, 'body' | 'description'>,
  patch: { body?: string; description?: string },
): boolean {
  return (
    (patch.body !== undefined && patch.body !== existing.body) ||
    (patch.description !== undefined && patch.description !== existing.description)
  );
}
