import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { PrDetail, PrFindingPreview, PrMeta } from '@devdigest/shared';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';
import type { ListReviewRow } from './status.js';
import type { DiffStats, PersistedDetail, PullRecord, RepoRefRecord } from './types.js';

type PullRow = typeof t.pullRequests.$inferSelect;

function toPullRecord(r: PullRow): PullRecord {
  return {
    id: r.id,
    repoId: r.repoId,
    number: r.number,
    title: r.title,
    author: r.author,
    branch: r.branch,
    base: r.base,
    headSha: r.headSha,
    lastReviewedSha: r.lastReviewedSha,
    additions: r.additions,
    deletions: r.deletions,
    filesCount: r.filesCount,
    status: r.status,
    body: r.body,
    openedAt: r.openedAt,
    updatedAt: r.updatedAt,
  };
}

const toDate = (iso: string | null | undefined) => (iso ? new Date(iso) : null);

/**
 * Pull requests, their file/commit snapshots and the PR-list rollup reads.
 * Exposed as `container.pullsRepo` so the polling module can reuse the sync.
 * Lookups by PR/repo id take the workspace too: callers outside this module must
 * not be able to reach another tenant's rows with a bare id. The rollup reads
 * take ids that already came from a scoped `listForRepo`.
 */
export class PullsRepository {
  constructor(private db: Db) {}

  private ownedPr(workspaceId: string, prId: string) {
    return and(eq(t.pullRequests.workspaceId, workspaceId), eq(t.pullRequests.id, prId));
  }

  /** Subquery yielding `prId` only when it belongs to the workspace — scopes the child tables. */
  private ownedPrIds(workspaceId: string, prId: string) {
    return this.db.select({ id: t.pullRequests.id }).from(t.pullRequests).where(this.ownedPr(workspaceId, prId));
  }

  async findPullWithRepo(
    workspaceId: string,
    prId: string,
  ): Promise<{ pr: PullRecord; repo: RepoRefRecord } | undefined> {
    const [row] = await this.db
      .select({ pr: t.pullRequests, repo: { id: t.repos.id, owner: t.repos.owner, name: t.repos.name } })
      .from(t.pullRequests)
      .innerJoin(t.repos, eq(t.repos.id, t.pullRequests.repoId))
      .where(and(eq(t.pullRequests.workspaceId, workspaceId), eq(t.pullRequests.id, prId)));
    return row ? { pr: toPullRecord(row.pr), repo: row.repo } : undefined;
  }

  /**
   * Idempotent import of GitHub's PR list in ONE statement (unique repo_id+number).
   * An existing PR only refreshes title/head/status/updated_at — diff stats,
   * body and last_reviewed_sha are owned by the detail fetch and reviews.
   */
  async upsertFromGitHub(workspaceId: string, repoId: string, prs: PrMeta[]): Promise<number> {
    // One INSERT … ON CONFLICT may not touch the same row twice → last one per number wins.
    const unique = [...new Map(prs.map((pr) => [pr.number, pr])).values()];
    if (unique.length === 0) return 0;
    await this.db
      .insert(t.pullRequests)
      .values(
        unique.map((pr) => ({
          workspaceId,
          repoId,
          number: pr.number,
          title: pr.title,
          author: pr.author,
          branch: pr.branch,
          base: pr.base,
          headSha: pr.head_sha,
          additions: pr.additions,
          deletions: pr.deletions,
          filesCount: pr.files_count,
          status: pr.status,
          openedAt: toDate(pr.opened_at),
          updatedAt: toDate(pr.updated_at),
        })),
      )
      .onConflictDoUpdate({
        target: [t.pullRequests.repoId, t.pullRequests.number],
        set: {
          title: sql`excluded.title`,
          headSha: sql`excluded.head_sha`,
          status: sql`excluded.status`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
    return unique.length;
  }

  async listForRepo(workspaceId: string, repoId: string): Promise<PullRecord[]> {
    const rows = await this.db
      .select()
      .from(t.pullRequests)
      .where(and(eq(t.pullRequests.workspaceId, workspaceId), eq(t.pullRequests.repoId, repoId)));
    return rows.map(toPullRecord);
  }

  async updateDiffStats(workspaceId: string, prId: string, stats: DiffStats): Promise<void> {
    await this.db.update(t.pullRequests).set(stats).where(this.ownedPr(workspaceId, prId));
  }

  /** Every `kind='review'` review of the PRs (with agent name), newest first. */
  async reviewsNewestFirst(prIds: string[]): Promise<ListReviewRow[]> {
    if (prIds.length === 0) return [];
    return this.db
      .select({
        id: t.reviews.id,
        prId: t.reviews.prId,
        agentId: t.reviews.agentId,
        agentName: t.agents.name,
        runId: t.reviews.runId,
        score: t.reviews.score,
      })
      .from(t.reviews)
      .leftJoin(t.agents, eq(t.agents.id, t.reviews.agentId))
      .where(and(inArray(t.reviews.prId, prIds), eq(t.reviews.kind, 'review')))
      .orderBy(desc(t.reviews.createdAt));
  }

  async findingPreviewsByReview(reviewIds: string[]): Promise<Map<string, PrFindingPreview[]>> {
    const byReview = new Map<string, PrFindingPreview[]>();
    if (reviewIds.length === 0) return byReview;
    const rows = await this.db.select().from(t.findings).where(inArray(t.findings.reviewId, reviewIds));
    for (const f of rows) {
      const list = byReview.get(f.reviewId) ?? [];
      list.push({
        id: f.id,
        severity: f.severity as PrFindingPreview['severity'],
        category: f.category as PrFindingPreview['category'],
        title: f.title,
        file: f.file,
        start_line: f.startLine,
        end_line: f.endLine,
        confidence: f.confidence,
        rationale: f.rationale,
      });
      byReview.set(f.reviewId, list);
    }
    return byReview;
  }

  /**
   * Summed cost of every successful ('done') run per PR. SUM ignores NULL costs, and a
   * PR whose done runs are all unpriced yields NULL → no entry → null, never 0.
   */
  async doneRunCostByPr(prIds: string[]): Promise<Map<string, number>> {
    const costByPr = new Map<string, number>();
    if (prIds.length === 0) return costByPr;
    const rows = await this.db
      .select({ prId: t.agentRuns.prId, cost: sql<number | null>`sum(${t.agentRuns.costUsd})` })
      .from(t.agentRuns)
      .where(and(inArray(t.agentRuns.prId, prIds), eq(t.agentRuns.status, 'done')))
      .groupBy(t.agentRuns.prId);
    for (const c of rows) if (c.prId && c.cost != null) costByPr.set(c.prId, Number(c.cost));
    return costByPr;
  }

  /** Replace the files/commits snapshot and refresh body + diff stats atomically. No-op for a foreign PR. */
  async replaceDetailSnapshot(workspaceId: string, prId: string, detail: PrDetail): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [owned] = await tx.select({ id: t.pullRequests.id }).from(t.pullRequests).where(this.ownedPr(workspaceId, prId));
      if (!owned) return;
      await tx.delete(t.prFiles).where(eq(t.prFiles.prId, prId));
      if (detail.files.length > 0) {
        await tx.insert(t.prFiles).values(
          detail.files.map((f) => ({
            prId,
            path: f.path,
            additions: f.additions,
            deletions: f.deletions,
            patch: f.patch ?? null,
          })),
        );
      }
      await tx.delete(t.prCommits).where(eq(t.prCommits.prId, prId));
      if (detail.commits.length > 0) {
        await tx.insert(t.prCommits).values(
          detail.commits.map((c) => ({
            prId,
            sha: c.sha,
            message: c.message,
            author: c.author,
            committedAt: toDate(c.committed_at),
          })),
        );
      }
      await tx
        .update(t.pullRequests)
        .set({
          body: detail.body ?? null,
          additions: detail.additions,
          deletions: detail.deletions,
          filesCount: detail.files_count,
        })
        .where(this.ownedPr(workspaceId, prId));
    });
  }

  async persistedDetail(workspaceId: string, prId: string): Promise<PersistedDetail> {
    const [files, commits] = await Promise.all([
      this.db.select().from(t.prFiles).where(inArray(t.prFiles.prId, this.ownedPrIds(workspaceId, prId))),
      this.db.select().from(t.prCommits).where(inArray(t.prCommits.prId, this.ownedPrIds(workspaceId, prId))),
    ]);
    return {
      files: files.map((f) => ({ path: f.path, additions: f.additions, deletions: f.deletions, patch: f.patch ?? null })),
      commits: commits.map((c) => ({
        sha: c.sha,
        message: c.message,
        author: c.author,
        committed_at: c.committedAt?.toISOString() ?? null,
      })),
    };
  }
}
