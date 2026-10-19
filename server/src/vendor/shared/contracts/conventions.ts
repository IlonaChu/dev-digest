import { z } from 'zod';
import { SkillType } from './knowledge.js';

/**
 * Conventions extractor — rules found in a repo's code, each backed by evidence
 * that CODE (not the model) has verified against the clone on disk.
 */

export const ConventionCategory = z.enum([
  'naming',
  'error-handling',
  'async',
  'imports',
  'typing',
  'structure',
  'testing',
  'api',
  'style',
  'other',
]);
export type ConventionCategory = z.infer<typeof ConventionCategory>;

/** `pending` = not decided (or deselected), `accepted` goes into the skill, `rejected` stays hidden from it. */
export const ConventionStatus = z.enum(['pending', 'accepted', 'rejected']);
export type ConventionStatus = z.infer<typeof ConventionStatus>;

export const ConventionRecord = z.object({
  id: z.string().uuid(),
  repo_id: z.string().uuid(),
  category: ConventionCategory,
  rule: z.string(),
  evidence_path: z.string(),
  evidence_start_line: z.number().int().positive(),
  evidence_end_line: z.number().int().positive(),
  /** Real lines of the file (read by the server), never the model's text. */
  evidence_snippet: z.string(),
  confidence: z.number().min(0).max(1),
  status: ConventionStatus,
  /** True once the user changed the rule text. */
  edited: z.boolean(),
});
export type ConventionRecord = z.infer<typeof ConventionRecord>;

export const ConventionScan = z.object({
  id: z.string().uuid(),
  sample_count: z.number().int().nonnegative(),
  /** Candidates the model proposed. */
  found: z.number().int().nonnegative(),
  /** Candidates dropped because the evidence did not check out. */
  dropped: z.number().int().nonnegative(),
  model: z.string(),
  created_at: z.string(),
});
export type ConventionScan = z.infer<typeof ConventionScan>;

export const ConventionList = z.object({
  items: z.array(ConventionRecord),
  scan: ConventionScan.nullable(),
});
export type ConventionList = z.infer<typeof ConventionList>;

/** What the model returns. Evidence is only a claim until `verifyEvidence` passes. */
export const ConventionCandidateOutput = z.object({
  category: ConventionCategory,
  rule: z.string().min(1),
  evidence: z.object({
    path: z.string().min(1),
    start_line: z.number().int(),
    end_line: z.number().int(),
    /** Verbatim fragment of one cited line. */
    quote: z.string().min(1),
  }),
  confidence: z.number(),
});
export type ConventionCandidateOutput = z.infer<typeof ConventionCandidateOutput>;

export const ConventionExtraction = z.object({
  candidates: z.array(ConventionCandidateOutput).max(30),
});
export type ConventionExtraction = z.infer<typeof ConventionExtraction>;

export const ConventionSkillDraft = z.object({
  name: z.string(),
  description: z.string(),
  type: SkillType,
  body: z.string(),
  token_estimate: z.number().int().nonnegative(),
});
export type ConventionSkillDraft = z.infer<typeof ConventionSkillDraft>;

export const ConventionSkillResult = z.object({ skill_id: z.string().uuid() });
export type ConventionSkillResult = z.infer<typeof ConventionSkillResult>;
