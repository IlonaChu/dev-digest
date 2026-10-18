import type { PrStatus } from '@devdigest/shared';

/**
 * PR-list rollup helpers (pure — no DB / `this`, so they unit-test cleanly).
 *
 * The Pull Requests list shows, per PR: the average SCORE and the FINDINGS of
 * each agent's latest review, and a review STATUS. The DB `status` column holds
 * GitHub's merge state (open/merged/closed); the review status
 * (needs_review / reviewed / stale) is DERIVED here for OPEN PRs from the
 * commit a review last ran against (`lastReviewedSha`) vs the PR head, plus age.
 */

/** Open PRs whose current head was reviewed but untouched this long read "stale". */
export const STALE_DAYS = 7;

export interface SeverityCounts {
  critical: number;
  warning: number;
  suggestion: number;
}

/** Tally finding severities (CRITICAL / WARNING / SUGGESTION) for one review. */
export function rollupSeverities(rows: { severity: string }[]): SeverityCounts {
  const c: SeverityCounts = { critical: 0, warning: 0, suggestion: 0 };
  for (const r of rows) {
    if (r.severity === 'CRITICAL') c.critical += 1;
    else if (r.severity === 'WARNING') c.warning += 1;
    else if (r.severity === 'SUGGESTION') c.suggestion += 1;
  }
  return c;
}

/** One `kind='review'` row as the PR-list query reads it (joined with the agent name). */
export interface ListReviewRow {
  id: string;
  prId: string;
  agentId: string | null;
  agentName: string | null;
  runId: string | null;
  score: number | null;
}

/**
 * Latest review of EACH agent, grouped per PR. `rows` must be newest-first: the first row
 * seen for a (PR, agent) pair wins, so re-runs of one agent never add up. Reviews without an
 * agent share one group. Groups are sorted by agent name, unnamed (no / deleted agent) last.
 */
export function latestReviewPerAgent<R extends ListReviewRow>(rows: readonly R[]): Map<string, R[]> {
  const seen = new Set<string>();
  const byPr = new Map<string, R[]>();
  for (const r of rows) {
    const key = `${r.prId}:${r.agentId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = byPr.get(r.prId) ?? [];
    list.push(r);
    byPr.set(r.prId, list);
  }
  for (const list of byPr.values()) list.sort(byAgentName);
  return byPr;
}

function byAgentName(a: { agentName: string | null }, b: { agentName: string | null }): number {
  if (a.agentName === b.agentName) return 0;
  if (a.agentName == null) return 1;
  if (b.agentName == null) return -1;
  return a.agentName.localeCompare(b.agentName);
}

/** Rounded mean of the non-null scores; null when no review has a score. */
export function averageScore(reviews: readonly { score: number | null }[]): number | null {
  const scores = reviews.flatMap((r) => (r.score == null ? [] : [r.score]));
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length);
}

/**
 * Review-freshness status for the PR list. Merged/closed PRs keep their GitHub
 * merge state; open PRs map to:
 *  - `needs_review` — never reviewed, OR head moved since the last review
 *  - `stale`        — current head was reviewed but the PR is older than STALE_DAYS
 *  - `reviewed`     — current head reviewed and recent
 */
export function deriveReviewStatus(args: {
  /** DB `status` column = GitHub merge state (open/merged/closed). */
  ghStatus: string;
  lastReviewedSha: string | null;
  headSha: string;
  updatedAt: Date | null;
  now: number;
  staleDays?: number;
}): PrStatus {
  const { ghStatus, lastReviewedSha, headSha, updatedAt, now } = args;
  if (ghStatus === 'merged' || ghStatus === 'closed') return ghStatus as PrStatus;
  if (!lastReviewedSha || lastReviewedSha !== headSha) return 'needs_review';
  const staleMs = (args.staleDays ?? STALE_DAYS) * 86_400_000;
  if (updatedAt && now - updatedAt.getTime() > staleMs) return 'stale';
  return 'reviewed';
}
