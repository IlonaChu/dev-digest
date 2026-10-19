/**
 * RepoService — add/refresh/remove + the clone job, against a fake container
 * (no DB, no git). Pins the job-enqueue contract the clone/index pipeline
 * depends on and the best-effort branches that must never fail the caller.
 */
import { describe, it, expect, vi } from 'vitest';
import { RepoService } from '../src/modules/repos/service.js';
import { parseRepoUrl, withGitHubToken } from '../src/modules/repos/helpers.js';
import { CLONE_DEPTH, CLONE_JOB_KIND, GITHUB_TOKEN_SECRET } from '../src/modules/repos/constants.js';
import { INDEX_JOB_KIND, REFRESH_JOB_KIND } from '../src/modules/_shared/job-kinds.js';
import { MockGitClient } from '../src/adapters/mocks.js';
import { AppError, NotFoundError } from '../src/platform/errors.js';
import type { RepoRow } from '../src/modules/repos/repository.js';
import type { Container } from '../src/platform/container.js';

const WS = 'ws-1';

function row(o: Partial<RepoRow> = {}): RepoRow {
  return {
    id: 'r1',
    workspaceId: WS,
    owner: 'acme',
    name: 'api',
    fullName: 'acme/api',
    defaultBranch: 'main',
    clonePath: null,
    lastPolledAt: null,
    createdBy: 'u1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...o,
  } as RepoRow;
}

function makeService(opts: {
  existing?: RepoRow;
  byId?: RepoRow;
  removed?: boolean;
  workspaceId?: string | null;
  token?: string | null;
  enqueueFails?: (kind: string) => boolean;
} = {}) {
  const repo = {
    findByFullName: vi.fn(async () => opts.existing),
    insert: vi.fn(async (v: { owner: string; name: string; fullName: string }) => row({ id: 'new', ...v })),
    list: vi.fn(async () => [row(), row({ id: 'r2', fullName: 'acme/web', name: 'web' })]),
    getById: vi.fn(async () => opts.byId),
    remove: vi.fn(async () => opts.removed ?? true),
    updateClonePath: vi.fn(async () => {}),
    workspaceIdFor: vi.fn(async () => (opts.workspaceId === undefined ? WS : opts.workspaceId)),
  };
  const enqueue = vi.fn(async (_ws: string, kind: string, _payload: unknown) => {
    if (opts.enqueueFails?.(kind)) throw new Error(`no handler for ${kind}`);
    return { id: 'job' };
  });
  const handlers = new Map<string, (p: unknown) => Promise<void>>();
  const git = new MockGitClient();
  const clone = vi.spyOn(git, 'clone');
  const container = {
    reposRepo: repo,
    jobs: { enqueue, register: (kind: string, h: (p: unknown) => Promise<void>) => handlers.set(kind, h) },
    secrets: { get: vi.fn(async (name: string) => (name === GITHUB_TOKEN_SECRET ? (opts.token ?? null) : null)) },
    git,
  } as unknown as Container;
  return { service: new RepoService(container), repo, enqueue, clone, handlers };
}

describe('RepoService.add', () => {
  it('persists a new repo and enqueues its clone', async () => {
    const { service, repo, enqueue } = makeService();
    const res = await service.add(WS, 'u1', 'https://github.com/acme/api.git');
    expect(res.created).toBe(true);
    expect(res.repo).toMatchObject({ id: 'new', full_name: 'acme/api', workspace_id: WS });
    expect(repo.insert).toHaveBeenCalledWith({ workspaceId: WS, owner: 'acme', name: 'api', fullName: 'acme/api', createdBy: 'u1' });
    expect(enqueue).toHaveBeenCalledWith(WS, CLONE_JOB_KIND, {
      repoId: 'new',
      owner: 'acme',
      name: 'api',
      url: 'https://github.com/acme/api.git',
    });
  });

  it('returns the existing repo without inserting or cloning again', async () => {
    const { service, repo, enqueue } = makeService({ existing: row() });
    const res = await service.add(WS, 'u1', 'git@github.com:acme/api.git');
    expect(res).toMatchObject({ created: false, repo: { id: 'r1' } });
    expect(repo.insert).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects a URL it cannot parse with 400 invalid_repo_url', async () => {
    const { service } = makeService();
    await expect(service.add(WS, 'u1', 'https://gitlab.com/acme')).rejects.toMatchObject({
      code: 'invalid_repo_url',
      statusCode: 400,
    });
  });
});

describe('RepoService.runCloneJob', () => {
  const payload = { repoId: 'r1', owner: 'acme', name: 'api', url: 'https://github.com/acme/api.git' };

  it('clones with the stored token, saves the path, then enqueues indexing', async () => {
    const { service, repo, enqueue, clone } = makeService({ token: 'ghp_x' });
    await service.runCloneJob(payload);
    expect(clone).toHaveBeenCalledWith(
      { owner: 'acme', name: 'api' },
      withGitHubToken(payload.url, 'ghp_x'),
      { depth: CLONE_DEPTH },
    );
    expect(repo.updateClonePath).toHaveBeenCalledWith('r1', '/mock/clones/acme/api');
    expect(enqueue).toHaveBeenCalledWith(WS, INDEX_JOB_KIND, { repoId: 'r1', owner: 'acme', name: 'api' });
  });

  it('clones anonymously without a token', async () => {
    const { service, clone } = makeService({ token: null });
    await service.runCloneJob(payload);
    expect(clone.mock.calls[0]?.[1]).toBe(payload.url);
  });

  it('keeps the clone when the index follow-up cannot be enqueued', async () => {
    const { service, repo } = makeService({ enqueueFails: (k) => k === INDEX_JOB_KIND });
    await expect(service.runCloneJob(payload)).resolves.toBeUndefined();
    expect(repo.updateClonePath).toHaveBeenCalled();
  });

  it('skips indexing when the repo has no workspace any more', async () => {
    const { service, enqueue } = makeService({ workspaceId: null });
    await service.runCloneJob(payload);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('is what the registered clone handler runs', async () => {
    const { service, handlers, repo } = makeService();
    service.registerCloneJobHandler();
    await handlers.get(CLONE_JOB_KIND)?.(payload);
    expect(repo.updateClonePath).toHaveBeenCalledWith('r1', '/mock/clones/acme/api');
  });
});

describe('RepoService.refresh / remove / list', () => {
  it('re-clones from the canonical GitHub URL and enqueues an incremental refresh', async () => {
    const { service, enqueue } = makeService({ byId: row() });
    await expect(service.refresh(WS, 'r1')).resolves.toEqual({ status: 'refreshing' });
    expect(enqueue).toHaveBeenNthCalledWith(1, WS, CLONE_JOB_KIND, {
      repoId: 'r1',
      owner: 'acme',
      name: 'api',
      url: 'https://github.com/acme/api.git',
    });
    expect(enqueue).toHaveBeenNthCalledWith(2, WS, REFRESH_JOB_KIND, { repoId: 'r1', owner: 'acme', name: 'api' });
  });

  it('still answers refreshing when the refresh job cannot be enqueued', async () => {
    const { service } = makeService({ byId: row(), enqueueFails: (k) => k === REFRESH_JOB_KIND });
    await expect(service.refresh(WS, 'r1')).resolves.toEqual({ status: 'refreshing' });
  });

  it('404s refresh and remove for an unknown repo', async () => {
    const { service } = makeService({ byId: undefined, removed: false });
    await expect(service.refresh(WS, 'nope')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.remove(WS, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('maps every listed row to the Repo DTO', async () => {
    const { service } = makeService();
    const list = await service.list(WS);
    expect(list.map((r) => r.full_name)).toEqual(['acme/api', 'acme/web']);
    expect(list[0]).not.toHaveProperty('fullName');
  });
});

describe('repos helpers', () => {
  it('parses https and ssh GitHub URLs', () => {
    expect(parseRepoUrl('https://github.com/acme/api')).toEqual({ owner: 'acme', name: 'api' });
    expect(parseRepoUrl('https://github.com/acme/api.git/')).toEqual({ owner: 'acme', name: 'api' });
    expect(parseRepoUrl('git@github.com:acme/api.git')).toEqual({ owner: 'acme', name: 'api' });
    expect(() => parseRepoUrl('not a url')).toThrow(AppError);
  });

  it('embeds the token only into https github.com URLs', () => {
    expect(withGitHubToken('https://github.com/acme/api.git', 't0k')).toBe(
      'https://x-access-token:t0k@github.com/acme/api.git',
    );
    expect(withGitHubToken('git@github.com:acme/api.git', 't0k')).toBe('git@github.com:acme/api.git');
    expect(withGitHubToken('https://gitlab.com/acme/api.git', 't0k')).toBe('https://gitlab.com/acme/api.git');
  });
});
