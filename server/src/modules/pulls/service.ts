import type {
  GitHubClient,
  PrCommentInput,
  PrDetail,
  PrMeta,
  PrReviewComment,
} from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { AppError, NotFoundError } from '../../platform/errors.js';
import type { WarnLogger } from '../_shared/logger.js';
import { BACKFILL_LIMIT, buildAgentRollups, needsDiffStats, toListItem, toPersistedDetail } from './domain.js';
import { latestReviewPerAgent } from './status.js';
import type { PullRecord, RepoRefRecord } from './types.js';

/**
 * PR import + reads. Local-first: GitHub is consulted when a token is configured,
 * but reads never fail on it — imported/seeded PRs stay viewable offline.
 */
export class PullsService {
  constructor(private container: Container) {}

  private get repo() {
    return this.container.pullsRepo;
  }

  private async githubOrNull(log: WarnLogger, msg: string): Promise<GitHubClient | null> {
    try {
      return await this.container.github();
    } catch (err) {
      log.warn({ err }, msg);
      return null;
    }
  }

  async listForRepo(workspaceId: string, repoId: string, log: WarnLogger): Promise<PrMeta[]> {
    const repo = await this.container.reposRepo.findRecord(workspaceId, repoId);
    if (!repo) throw new NotFoundError('Repo not found');

    const gh = await this.githubOrNull(
      log,
      'GitHub client unavailable (no token / offline); serving persisted PRs',
    );
    if (gh) {
      try {
        const pulls = await gh.listPullRequests({ owner: repo.owner, name: repo.name });
        await this.repo.upsertFromGitHub(workspaceId, repo.id, pulls);
      } catch (err) {
        log.warn({ err }, 'GitHub PR sync skipped (no token / offline); serving persisted PRs');
      }
    }

    const prs = await this.repo.listForRepo(workspaceId, repo.id);
    if (gh) await this.backfillDiffStats(gh, workspaceId, repo, prs, log);

    const prIds = prs.map((p) => p.id);
    const latestByPr = latestReviewPerAgent(await this.repo.reviewsNewestFirst(prIds));
    const latestIds = [...latestByPr.values()].flatMap((list) => list.map((l) => l.id));
    const [findingsByReview, costByPr] = await Promise.all([
      this.repo.findingPreviewsByReview(latestIds),
      this.repo.doneRunCostByPr(prIds),
    ]);
    const rollups = buildAgentRollups(latestByPr, findingsByReview);

    const now = Date.now();
    return prs.map((pr) => toListItem(pr, rollups.get(pr.id), costByPr.get(pr.id), now));
  }

  /** Mutates `prs` in place so the response reflects the freshly-fetched stats. */
  private async backfillDiffStats(
    gh: GitHubClient,
    workspaceId: string,
    repo: RepoRefRecord,
    prs: PullRecord[],
    log: WarnLogger,
  ): Promise<void> {
    for (const pr of prs.filter(needsDiffStats).slice(0, BACKFILL_LIMIT)) {
      try {
        const detail = await gh.getPullRequest({ owner: repo.owner, name: repo.name }, pr.number);
        const stats = { additions: detail.additions, deletions: detail.deletions, filesCount: detail.files_count };
        await this.repo.updateDiffStats(workspaceId, pr.id, stats);
        Object.assign(pr, stats);
      } catch (err) {
        log.warn({ err, number: pr.number }, 'PR diff-stat backfill skipped');
      }
    }
  }

  private async resolve(workspaceId: string, prId: string) {
    const found = await this.repo.findPullWithRepo(workspaceId, prId);
    if (!found) throw new NotFoundError('Pull request not found');
    return found;
  }

  async getDetail(workspaceId: string, prId: string, log: WarnLogger): Promise<PrDetail> {
    const { pr, repo } = await this.resolve(workspaceId, prId);
    try {
      const gh = await this.container.github();
      const detail = await gh.getPullRequest({ owner: repo.owner, name: repo.name }, pr.number);
      await this.repo.replaceDetailSnapshot(workspaceId, pr.id, detail);
      return { ...detail, id: pr.id };
    } catch (err) {
      log.warn({ err }, 'GitHub PR detail refresh skipped (no token / offline); serving persisted detail');
      return toPersistedDetail(pr, await this.repo.persistedDetail(workspaceId, pr.id));
    }
  }

  /** Proxied live to GitHub (no local mirror) — empty when offline. */
  async listComments(workspaceId: string, prId: string, log: WarnLogger): Promise<PrReviewComment[]> {
    const { pr, repo } = await this.resolve(workspaceId, prId);
    const gh = await this.githubOrNull(log, 'GitHub client unavailable; serving no PR comments');
    if (!gh) return [];
    try {
      return await gh.listReviewComments({ owner: repo.owner, name: repo.name }, pr.number);
    } catch (err) {
      log.warn({ err }, 'GitHub review-comments fetch skipped (offline / error)');
      return [];
    }
  }

  async createComment(workspaceId: string, prId: string, input: PrCommentInput): Promise<PrReviewComment> {
    const { pr, repo } = await this.resolve(workspaceId, prId);
    let gh: GitHubClient;
    try {
      gh = await this.container.github();
    } catch {
      throw new AppError('github_unavailable', 'Connect a GitHub token to post comments.', 400);
    }
    try {
      return await gh.createReviewComment({ owner: repo.owner, name: repo.name }, pr.number, {
        commitId: pr.headSha,
        path: input.path,
        line: input.line,
        ...(input.side ? { side: input.side } : {}),
        body: input.body,
        ...(input.in_reply_to != null ? { inReplyTo: input.in_reply_to } : {}),
      });
    } catch (err) {
      // GitHub rejects comments on lines outside the diff / on closed PRs (422).
      const msg = err instanceof Error ? err.message : 'Failed to post the comment to GitHub.';
      throw new AppError('github_comment_failed', msg, 400, { cause: String(err) });
    }
  }
}
