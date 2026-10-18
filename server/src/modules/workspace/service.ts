import type { Container } from '../../platform/container.js';

/** Where clones live plus a summary of the workspace's cloned repos. */
export class WorkspaceService {
  constructor(private container: Container) {}

  async overview(workspaceId: string) {
    const repos = await this.container.reposRepo.listRecords(workspaceId);
    return {
      workspaceId,
      cloneDir: this.container.config.cloneDir,
      repos: repos.map((r) => ({
        id: r.id,
        full_name: r.fullName,
        clone_path: r.clonePath,
        last_polled_at: r.lastPolledAt?.toISOString() ?? null,
        cloned: Boolean(r.clonePath),
      })),
    };
  }
}
