import type { Container } from '../../platform/container.js';
import { NotFoundError } from '../../platform/errors.js';

/**
 * Manual PR-list sync. Unlike the list read, a missing token / GitHub failure
 * propagates — the user explicitly asked for a refresh. Never triggers a review.
 */
export class PollingService {
  constructor(private container: Container) {}

  async poll(workspaceId: string, repoId: string): Promise<{ synced: number; reviewTriggered: false }> {
    const repo = await this.container.reposRepo.findRecord(workspaceId, repoId);
    if (!repo) throw new NotFoundError('Repo not found');

    const gh = await this.container.github();
    const pulls = await gh.listPullRequests({ owner: repo.owner, name: repo.name });
    const synced = await this.container.pullsRepo.upsertFromGitHub(workspaceId, repo.id, pulls);
    await this.container.reposRepo.markPolled(repo.id);
    return { synced, reviewTriggered: false };
  }
}
