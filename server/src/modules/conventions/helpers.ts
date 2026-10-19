import type { ConventionRecord, ConventionScan } from '@devdigest/shared';
import type { ConventionRow, ConventionScanRow } from './repository.js';

/**
 * Pure helpers for the conventions module — row ⇄ DTO mapping and rule keys. No I/O.
 */

/** Stable identity of a rule's wording: lower-case, punctuation and spacing collapsed. */
export function ruleKey(rule: string): string {
  return rule
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function toConventionDto(row: ConventionRow): ConventionRecord {
  return {
    id: row.id,
    repo_id: row.repoId,
    category: row.category as ConventionRecord['category'],
    rule: row.rule,
    evidence_path: row.evidencePath,
    evidence_start_line: row.evidenceStartLine,
    evidence_end_line: row.evidenceEndLine,
    evidence_snippet: row.evidenceSnippet,
    confidence: row.confidence,
    status: row.status,
    edited: row.edited,
  };
}

export function toScanDto(row: ConventionScanRow): ConventionScan {
  return {
    id: row.id,
    sample_count: row.sampleCount,
    found: row.found,
    dropped: row.dropped,
    model: row.model,
    created_at: row.createdAt.toISOString(),
  };
}
