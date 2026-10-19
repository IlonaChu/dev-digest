import { MAX_EVIDENCE_LINES, MAX_SNIPPET_LINES, MIN_CONFIDENCE } from './constants.js';
import type { SampleFile } from './sampling.js';
import type { ConventionCandidateOutput } from '@devdigest/shared';

/**
 * The code-side check of a model's claim. The model only PROPOSES evidence; a
 * candidate survives only when the cited file was one we sampled, the cited
 * lines exist and the quoted fragment is really in them. The stored snippet is
 * cut from the file itself — never from the model's text.
 */
export type EvidenceVerdict =
  | { ok: true; snippet: string; startLine: number; endLine: number; confidence: number }
  | { ok: false; reason: EvidenceRejection };

export type EvidenceRejection =
  | 'unknown_file'
  | 'bad_range'
  | 'range_too_long'
  | 'quote_not_found'
  | 'low_confidence';

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

export function verifyEvidence(
  candidate: ConventionCandidateOutput,
  samples: SampleFile[],
): EvidenceVerdict {
  const { path, start_line: start, end_line: end, quote } = candidate.evidence;
  const file = samples.find((s) => s.path === path);
  if (!file) return { ok: false, reason: 'unknown_file' };

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > file.lineCount) {
    return { ok: false, reason: 'bad_range' };
  }
  if (end - start + 1 > MAX_EVIDENCE_LINES) return { ok: false, reason: 'range_too_long' };

  const lines = file.content.split('\n').slice(start - 1, end);
  const needle = squash(quote);
  if (!needle || !squash(lines.join('\n')).includes(needle)) {
    return { ok: false, reason: 'quote_not_found' };
  }

  const confidence = Math.min(1, Math.max(0, candidate.confidence));
  if (confidence < MIN_CONFIDENCE) return { ok: false, reason: 'low_confidence' };

  return {
    ok: true,
    snippet: lines.slice(0, MAX_SNIPPET_LINES).join('\n'),
    startLine: start,
    endLine: end,
    confidence,
  };
}
