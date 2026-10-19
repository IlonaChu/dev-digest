/**
 * PollingService (manual PR-list sync) and WorkspaceService (clone overview)
 * against a fake container — no DB, no GitHub.
 */
import { describe, it, expect, vi } from 'vitest';
import { PollingService } from '../src/modules/polling/service.js';
import { WorkspaceService } from '../src/modules/workspace/service.js';
import { NotFoundError } from '../src/platform/errors.js';
import type { RepoRecord } from '../src/modules/repos/repository.js';
import type { Container } from '../src/platform/container.js';

const WS = 'ws-1';

const record = (o: Partial<RepoRecord> = {}): RepoRecord => ({
  id: 'r1',
  owner: 'acme',
  name: 'api',
  fullName: 'acme/api',
  clonePath: null,
  lastPolledAt: null,
  ...o,
});

describe('PollingService.poll', () => {
  function make(opts: { repo?: RepoRecord; listFails?: boolean } = {}) {
    const pulls = [{ number: 1 }, { number: 2 }];
    const reposRepo = {
      findRecord: vi.fn(async () => opts.repo),
      markPolled: vi.fn(async () => {}),
    };
    const pullsRepo = { upsertFromGitHub: vi.fn(async (_ws: string, _id: string, list: unknown[]) => list.length) };
    const listPullRequests = vi.fn(async () => {
      if (opts.listFails) throw new Error('GitHub 401');
      return pulls;
    });
    const container = {
      reposRepo,
      pullsRepo,
      github: async () => ({ listPullRequests }),
    } as unknown as Container;
    return { service: new PollingService(container), reposRepo, pullsRepo, listPullRequests, pulls };
  }

  it('upserts the GitHub PR list, marks the repo polled and never triggers a review', async () => {
    const { service, reposRepo, pullsRepo, listPullRequests, pulls } = make({ repo: record() });
    await expect(service.poll(WS, 'r1')).resolves.toEqual({ synced: 2, reviewTriggered: false });
    expect(listPullRequests).toHaveBeenCalledWith({ owner: 'acme', name: 'api' });
    expect(pullsRepo.upsertFromGitHub).toHaveBeenCalledWith(WS, 'r1', pulls);
    expect(reposRepo.markPolled).toHaveBeenCalledWith('r1');
  });

  it('404s for a repo outside the workspace without calling GitHub', async () => {
    const { service, listPullRequests } = make({ repo: undefined });
    await expect(service.poll(WS, 'nope')).rejects.toBeInstanceOf(NotFoundError);
    expect(listPullRequests).not.toHaveBeenCalled();
  });

  it('propagates a GitHub failure and does not mark the repo polled', async () => {
    const { service, reposRepo, pullsRepo } = make({ repo: record(), listFails: true });
    await expect(service.poll(WS, 'r1')).rejects.toThrow('GitHub 401');
    expect(pullsRepo.upsertFromGitHub).not.toHaveBeenCalled();
    expect(reposRepo.markPolled).not.toHaveBeenCalled();
  });
});

describe('WorkspaceService.overview', () => {
  it('reports the clone dir and each repo in snake_case with a derived `cloned` flag', async () => {
    const polled = new Date('2026-10-18T10:00:00Z');
    const container = {
      config: { cloneDir: '/data/clones' },
      reposRepo: {
        listRecords: vi.fn(async () => [
          record({ clonePath: '/data/clones/acme/api', lastPolledAt: polled }),
          record({ id: 'r2', fullName: 'acme/web' }),
        ]),
      },
    } as unknown as Container;

    await expect(new WorkspaceService(container).overview(WS)).resolves.toEqual({
      workspaceId: WS,
      cloneDir: '/data/clones',
      repos: [
        {
          id: 'r1',
          full_name: 'acme/api',
          clone_path: '/data/clones/acme/api',
          last_polled_at: '2026-10-18T10:00:00.000Z',
          cloned: true,
        },
        { id: 'r2', full_name: 'acme/web', clone_path: null, last_polled_at: null, cloned: false },
      ],
    });
  });
});
