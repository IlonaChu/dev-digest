import type { Skill } from '@devdigest/shared';

/**
 * Pure helpers for the skills module. No I/O. (Row ⇄ contract mapping lives in
 * the repository, next to the queries.)
 */

/** True when a patch changes what the model reads (body or description). */
export function isContentChange(
  existing: Pick<Skill, 'body' | 'description'>,
  patch: { body?: string; description?: string },
): boolean {
  return (
    (patch.body !== undefined && patch.body !== existing.body) ||
    (patch.description !== undefined && patch.description !== existing.description)
  );
}
