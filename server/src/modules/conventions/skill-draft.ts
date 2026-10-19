import type { ConventionRecord } from '@devdigest/shared';
import { DEFAULT_SKILL_NAME, MAX_SKILL_DESCRIPTION_LENGTH } from './constants.js';

/**
 * Deterministic draft of the skill body from accepted conventions (no model).
 * The user edits the result in the UI before it is saved.
 */
export interface SkillDraft {
  name: string;
  description: string;
  body: string;
}

export function slugify(text: string, maxLength = 48): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** Words that add nothing to a heading slug ("Always use async/await instead of .then() chains" → async-await-then-chains). */
const SLUG_STOPWORDS = new Set([
  'always', 'never', 'use', 'the', 'a', 'an', 'of', 'to', 'in', 'is', 'are', 'be', 'and', 'or',
  'instead', 'all', 'goes', 'go', 'through', 'must', 'should',
]);
const MAX_SLUG_WORDS = 6;

/** Short heading slug for a rule: stopwords dropped, at most MAX_SLUG_WORDS words, cut on a word boundary. */
export function ruleSlug(rule: string): string {
  const words = slugify(rule, 200).split('-').filter(Boolean);
  const kept = words.filter((w) => !SLUG_STOPWORDS.has(w));
  return (kept.length >= 2 ? kept : words).slice(0, MAX_SLUG_WORDS).join('-');
}

/** Fence long enough that the snippet itself can't close it. */
function fence(snippet: string): string {
  const longest = Math.max(2, ...[...snippet.matchAll(/`+/g)].map((m) => m[0].length));
  return '`'.repeat(longest + 1);
}

function lineRange(c: ConventionRecord): string {
  return c.evidence_start_line === c.evidence_end_line
    ? `${c.evidence_start_line}`
    : `${c.evidence_start_line}-${c.evidence_end_line}`;
}

export function buildSkillDraft(repoName: string, conventions: ConventionRecord[]): SkillDraft {
  const name = DEFAULT_SKILL_NAME;
  const used = new Set<string>();
  const sections = conventions.map((c) => {
    const base = ruleSlug(c.rule) || 'rule';
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    const f = fence(c.evidence_snippet);
    return [
      `## ${slug}`,
      c.rule,
      '',
      `Detected in \`${c.evidence_path}:${lineRange(c)}\`:`,
      '',
      `${f}`,
      c.evidence_snippet,
      f,
    ].join('\n');
  });
  const body = [
    `# ${name}`,
    '',
    `House conventions for \`${repoName}\`. Flag changes that violate any rule below and cite the offending \`file:line\`.`,
    '',
    sections.join('\n\n'),
    '',
  ].join('\n');
  const n = conventions.length;
  const description = `${n} house convention${n === 1 ? '' : 's'} extracted from ${repoName}`.slice(
    0,
    MAX_SKILL_DESCRIPTION_LENGTH,
  );
  return { name, description, body };
}

/** Same ceil(chars / 4) estimate the client editor shows. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
