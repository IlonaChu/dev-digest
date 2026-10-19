import type { PrAgentFindings, PrDetail, PrFindingPreview, PrMeta } from '@devdigest/shared';
import { averageScore, deriveReviewStatus, type ListReviewRow } from './status.js';
import type { PersistedDetail, PullRecord } from './types.js';

/**
 * Pure PR mappers/selectors (no DB, no GitHub) — the pulls service composes them.
 * Diff stats aren't on GitHub's PR-list payload, so freshly-imported PRs land
 * zeroed; at most BACKFILL_LIMIT of them are filled per list request (each is a
 * detail fetch) and the periodic refetch chips away at the remainder.
 */
export const BACKFILL_LIMIT = 10;

export function needsDiffStats(pr: PullRecord): boolean {
  return pr.additions === 0 && pr.deletions === 0 && pr.filesCount === 0;
}

export interface AgentRollup {
  score: number | null;
  findingsByAgent: PrAgentFindings[];
}

/** Per PR: the average score + one findings section per agent's latest review. */
export function buildAgentRollups(
  latestByPr: ReadonlyMap<string, readonly ListReviewRow[]>,
  findingsByReview: ReadonlyMap<string, PrFindingPreview[]>,
): Map<string, AgentRollup> {
  const out = new Map<string, AgentRollup>();
  for (const [prId, list] of latestByPr) {
    out.set(prId, {
      score: averageScore(list),
      findingsByAgent: list.map((l) => ({
        agent_id: l.agentId,
        agent_name: l.agentName,
        run_id: l.runId,
        score: l.score,
        findings: findingsByReview.get(l.id) ?? [],
      })),
    });
  }
  return out;
}

function baseMeta(pr: PullRecord): Omit<PrMeta, 'status'> {
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    author: pr.author,
    branch: pr.branch,
    base: pr.base,
    head_sha: pr.headSha,
    additions: pr.additions,
    deletions: pr.deletions,
    files_count: pr.filesCount,
    opened_at: pr.openedAt?.toISOString() ?? null,
    updated_at: pr.updatedAt?.toISOString() ?? null,
  };
}

/** A PR-list row: review status derived from the last reviewed head + age. */
export function toListItem(
  pr: PullRecord,
  rollup: AgentRollup | undefined,
  costUsd: number | undefined,
  now: number,
): PrMeta {
  return {
    ...baseMeta(pr),
    status: deriveReviewStatus({
      ghStatus: pr.status,
      lastReviewedSha: pr.lastReviewedSha,
      headSha: pr.headSha,
      updatedAt: pr.updatedAt,
      now,
    }),
    score: rollup ? rollup.score : null,
    cost_usd: costUsd ?? null,
    findings_by_agent: rollup ? rollup.findingsByAgent : [],
  };
}

/** Offline PR detail from the persisted snapshot (status = raw GitHub merge state). */
export function toPersistedDetail(pr: PullRecord, persisted: PersistedDetail): PrDetail {
  return {
    ...baseMeta(pr),
    status: pr.status as PrDetail['status'],
    body: pr.body ?? null,
    files: persisted.files,
    commits: persisted.commits,
  };
}
