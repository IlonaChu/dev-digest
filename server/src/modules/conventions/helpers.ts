/**
 * Pure helpers for the conventions module — rule keys. No I/O. (Row ⇄ contract
 * mapping lives in the repository, next to the queries.)
 */

/** Stable identity of a rule's wording: lower-case, punctuation and spacing collapsed. */
export function ruleKey(rule: string): string {
  return rule
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
