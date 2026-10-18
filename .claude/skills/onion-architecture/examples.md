# Examples — before / after on this codebase

The "before" snippets are real legacy code (all listed in the baseline). The "after" shows the direction; check
names and field mappings against the current code before applying one.

## 1. A route that queries the database → service + repository

**Before** — `server/src/modules/workspace/routes.ts` (violates `only-repositories-touch-the-db`):

```ts
import { eq } from 'drizzle-orm';
import * as t from '../../db/schema.js';

app.get('/workspace', async (req) => {
  const { workspaceId } = await getContext(container, req);
  const repos = await container.db.select().from(t.repos).where(eq(t.repos.workspaceId, workspaceId));
  return {
    workspaceId,
    cloneDir: container.config.cloneDir,
    repos: repos.map((r) => ({ id: r.id, full_name: r.fullName, clone_path: r.clonePath, /* … */ })),
  };
});
```

**After**:

```ts
// workspace/repository.ts — the only file that knows Drizzle; maps rows → wire shape
export class WorkspaceRepository {
  constructor(private db: Db) {}
  async listClonedRepos(workspaceId: string): Promise<WorkspaceRepo[]> {
    const rows = await this.db.select().from(t.repos).where(eq(t.repos.workspaceId, workspaceId));
    return rows.map(toWorkspaceRepo);
  }
}

// workspace/service.ts — orchestration, no Drizzle, no HTTP
export class WorkspaceService {
  private repo: WorkspaceRepository;
  constructor(private container: Container) {
    this.repo = new WorkspaceRepository(container.db);
  }
  async overview(workspaceId: string): Promise<WorkspaceOverview> {
    return { workspaceId, cloneDir: this.container.config.cloneDir, repos: await this.repo.listClonedRepos(workspaceId) };
  }
}

// workspace/routes.ts — HTTP only
const service = new WorkspaceService(app.container);
app.get('/workspace', async (req) => {
  const { workspaceId } = await getContext(app.container, req);
  return service.overview(workspaceId);
});
```

Then `pnpm arch:baseline` and confirm the diff only removes the two `workspace/routes.ts` entries.

## 2. A Drizzle row crossing into the service → contract type from the repository

**Before** — `server/src/modules/reviews/service.ts`:

```ts
import type { AgentRow } from '../../db/rows.js';   // persistence type in the application ring

async resolveTargets(workspaceId: string, opts: { agentId?: string; all?: boolean }): Promise<AgentRow[]> { … }
```

**After** — the repository (here the shared `container.agentsRepo`) returns a domain/contract shape and the
service signature speaks it:

```ts
import type { Agent } from '@devdigest/shared';

async resolveTargets(workspaceId: string, opts: { agentId?: string; all?: boolean }): Promise<Agent[]> { … }
```

`run-executor.ts` reads `agent.system_prompt` instead of `agent.systemPrompt`. Because the row type is used along
the whole run path, this is a deliberate refactor — do it only when asked, not as a drive-by.

## 3. Filesystem access in a module → port through the Container

**Before** — `server/src/modules/repo-intel/service.ts` (violates `node-io-only-in-infrastructure`):

```ts
import { readFile } from 'node:fs/promises';
// …
const content = await readClone(repo.clonePath, file);   // fs.readFile under the hood
```

**After** — the `GitClient` port already has `readFile(repo: RepoRef, path: string): Promise<string>`:

```ts
const content = await this.container.git.readFile(repoRef, file);
```

Check the semantics match first (working tree vs. a commit, missing file → `''`/throw vs. `null`). If they don't,
add a method to the port rather than reaching for `fs` again.

## 4. A new external integration — port, adapter, Container, mock, guard

Say a module must look up issues in an external tracker.

```ts
// vendor/shared/adapters.ts (+ mirror to client/src/vendor/shared/adapters.ts) — shaped for our needs
export interface IssueTracker {
  findIssue(ref: { key: string }): Promise<{ key: string; title: string; url: string } | null>;
}

// src/adapters/issues/tracker-http.ts — the only file that knows the vendor API
export class HttpIssueTracker implements IssueTracker {
  constructor(private token: string) {}
  async findIssue({ key }: { key: string }) {
    const res = await withRetry(() => withTimeout(fetch(/* … */), 10_000));
    if (res.status === 404) return null;
    if (!res.ok) throw new ExternalServiceError(`Issue tracker ${res.status}`);
    const body = IssueResponse.parse(await res.json());          // parse at the boundary
    return { key: body.key, title: body.fields.summary, url: body.self };
  }
}

// platform/container.ts — the only place that picks the implementation
async issueTracker(): Promise<IssueTracker> {
  if (this.overrides.issueTracker) return this.overrides.issueTracker;
  const token = await this.secrets.get('ISSUE_TRACKER_TOKEN');
  if (!token) throw new ConfigError('ISSUE_TRACKER_TOKEN is not set');
  return (this._issueTracker ??= new HttpIssueTracker(token));
}

// src/adapters/mocks.ts — deterministic double, injected via ContainerOverrides.issueTracker
export class MockIssueTracker implements IssueTracker { /* returns fixtures */ }
```

If the adapter uses an SDK package instead of `fetch`, add it to `IO_SDKS` in `server/.dependency-cruiser.cjs`.
Clear `_issueTracker` in `invalidateSecretCaches()` so a key changed in Settings takes effect.

## 5. A decision buried in a route → pure function in the module core

Already done once in this repo (server INSIGHTS 2026-10-18): the PR list's "latest review per agent" and score
average lived inline in `pulls/routes.ts`. They now live in `pulls/status.ts`:

```ts
export function latestReviewPerAgent<R extends ListReviewRow>(rows: readonly R[]): Map<string, R[]> { … }
export function averageScore(reviews: readonly { score: number | null }[]): number | null { … }
export function deriveReviewStatus(args: {
  ghStatus: string; lastReviewedSha: string | null; headSha: string; updatedAt: Date | null; now: number; staleDays?: number;
}): PrStatus { … }
```

No I/O, `now` passed in, covered by `test/pulls-status.test.ts` without Docker. The route (still legacy for its
queries) only calls them.

## 6. The core talking outward without importing the outside (reviewer-core)

```ts
// server/src/modules/reviews/run-executor.ts — the shell wires callbacks to infrastructure
reviewPullRequest({
  /* resolved diff + prompt inputs as strings, the LLMProvider from container.llm(id) */
  onEvent: (e) => runLog.event(e.kind, e.msg, e.data),   // → RunLogger → runBus/SSE + pino
  checkCancelled: () => {
    if (this.container.runBus.isCancelled(runId)) throw new RunCancelledError();
  },
});
```

The engine knows only the function types; it never imports `RunLogger`, `runBus` or an error class from the
server. That's dependency inversion with plain callbacks — no interface file needed.
