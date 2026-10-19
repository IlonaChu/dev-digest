import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { MockGitClient, MockLLMProvider, MockEmbedder } from '../src/adapters/mocks.js';
import type { ConventionList, ConventionRecord, ConventionSkillDraft, Skill } from '@devdigest/shared';
import type { LLMProvider } from '@devdigest/shared';
import type { RepoIntel } from '../src/modules/repo-intel/types.js';
import type { SourceTree } from '../src/modules/repo-intel/ports.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

if (!hasDocker) {
  // eslint-disable-next-line no-console
  console.warn('[conventions-routes.it] Docker not available — skipping integration tests.');
}

const FILES: Record<string, string> = {
  'tsconfig.json': '{ "compilerOptions": { "strict": true } }',
  'src/api/users.ts': 'import { db } from "../db";\nconst user = await db.users.find(id);\nconst posts = await db.posts.findMany({ userId });',
  'src/lib/redis.ts': 'import Redis from "ioredis";\nexport const redis = new Redis(config.redisUrl);',
};

const tree: SourceTree = {
  list: async () => [{ name: 'tsconfig.json', kind: 'file' }],
  size: async () => 10,
  read: async (_root, rel) => {
    if (!(rel in FILES)) throw new Error('ENOENT');
    return FILES[rel]!;
  },
};

const intel = (paths: string[]) => ({ getConventionSamples: async () => paths }) as unknown as RepoIntel;

const asyncRule = {
  category: 'async',
  rule: 'Use async/await instead of .then() chains',
  evidence: { path: 'src/api/users.ts', start_line: 2, end_line: 3, quote: 'await db.users.find(id)' },
  confidence: 0.91,
};
const redisRule = {
  category: 'structure',
  rule: 'Redis access goes through the src/lib/redis.ts singleton',
  evidence: { path: 'src/lib/redis.ts', start_line: 2, end_line: 2, quote: 'export const redis = new Redis' },
  confidence: 0.85,
};
const invented = {
  category: 'style',
  rule: 'Always end files with a newline',
  evidence: { path: 'src/api/users.ts', start_line: 1, end_line: 1, quote: 'this text is not in the file' },
  confidence: 0.99,
};

let seq = 0;

d('conventions routes (Testcontainers pg)', () => {
  let pg: PgFixture;
  let workspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    workspaceId = ws!.id;
  });
  afterAll(async () => {
    await pg?.stop();
  });

  async function makeRepo(clonePath: string | null = '/clone') {
    const name = `payments-api-${seq++}`;
    const [repo] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}`, clonePath })
      .returning();
    return repo!;
  }

  async function makeApp(opts: { candidates?: unknown[]; paths?: string[]; llm?: LLMProvider } = {}) {
    const llm =
      opts.llm ??
      new MockLLMProvider('openai', {
        structuredBySchema: { ConventionExtraction: { candidates: opts.candidates ?? [asyncRule, redisRule, invented] } },
      });
    const app = await buildApp({
      config: loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv),
      db: pg.handle.db,
      overrides: {
        embedder: new MockEmbedder(),
        git: new MockGitClient(),
        llm: { openrouter: llm },
        sourceTree: tree,
        repoIntel: intel(opts.paths ?? ['src/api/users.ts', 'src/lib/redis.ts']),
      },
    });
    return { app, llm: llm as MockLLMProvider };
  }

  it('extract → list: keeps only verified candidates, all start pending, scan metadata is stored', async () => {
    const repo = await makeRepo();
    const { app, llm } = await makeApp();

    const res = await app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/extract` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as ConventionList;
    expect(body.items.map((i) => i.rule).sort()).toEqual([asyncRule.rule, redisRule.rule].sort());
    expect(body.items.every((i) => i.status === 'pending')).toBe(true);
    expect(body.items[0]!.confidence).toBeGreaterThanOrEqual(body.items[1]!.confidence);
    expect(body.scan).toMatchObject({ sample_count: 3, found: 3, dropped: 1 });
    expect(llm.calls.filter((c) => c.method === 'completeStructured')).toHaveLength(1);

    const listed = (await app.inject({ method: 'GET', url: `/repos/${repo.id}/conventions` })).json() as ConventionList;
    expect(listed.items).toHaveLength(2);

    const [scan] = await pg.handle.db.select().from(t.conventionScans).where(eq(t.conventionScans.repoId, repo.id));
    expect(scan!.costUsd).toBe(0.001);
    await app.close();
  });

  it('accept / reject / edit via PATCH, and bulk deselect leaves rejected rows alone', async () => {
    const repo = await makeRepo();
    const { app } = await makeApp();
    const { items } = (await app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/extract` })).json() as ConventionList;
    const [a, b] = items as [ConventionRecord, ConventionRecord];

    const rejected = await app.inject({ method: 'PATCH', url: `/conventions/${b.id}`, payload: { status: 'rejected' } });
    expect((rejected.json() as ConventionRecord).status).toBe('rejected');

    const edited = (await app.inject({ method: 'PATCH', url: `/conventions/${a.id}`, payload: { rule: 'Prefer await over .then()' } })).json() as ConventionRecord;
    expect(edited).toMatchObject({ rule: 'Prefer await over .then()', edited: true, status: 'pending' });

    const none = (await app.inject({ method: 'PATCH', url: `/repos/${repo.id}/conventions/status`, payload: { status: 'pending' } })).json() as ConventionList;
    expect(Object.fromEntries(none.items.map((i) => [i.id, i.status]))).toEqual({ [a.id]: 'pending' });
    const [stored] = await pg.handle.db.select().from(t.conventions).where(eq(t.conventions.id, b.id));
    expect(stored!.status).toBe('rejected');

    const empty = await app.inject({ method: 'PATCH', url: `/conventions/${a.id}`, payload: {} });
    expect(empty.statusCode).toBe(422);
    const ghost = await app.inject({ method: 'PATCH', url: '/conventions/00000000-0000-4000-8000-00000000ffff', payload: { status: 'accepted' } });
    expect(ghost.statusCode).toBe(404);
    await app.close();
  });

  it('a rejected candidate leaves the list, stays rejected after a re-scan and never reaches the skill', async () => {
    const repo = await makeRepo();
    const { app } = await makeApp();
    const { items } = (await app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/extract` })).json() as ConventionList;
    const [a, b] = items as [ConventionRecord, ConventionRecord];

    const res = await app.inject({ method: 'PATCH', url: `/conventions/${a.id}`, payload: { status: 'rejected' } });
    expect(res.statusCode).toBe(200);
    const listed = (await app.inject({ method: 'GET', url: `/repos/${repo.id}/conventions` })).json() as ConventionList;
    expect(listed.items.map((i) => i.id)).toEqual([b.id]);

    // The model proposes the same rule again: it is matched to the stored row and stays hidden.
    const rescan = (await app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/extract` })).json() as ConventionList;
    expect(rescan.items.map((i) => i.id)).toEqual([b.id]);
    const rows = await pg.handle.db.select().from(t.conventions).where(eq(t.conventions.repoId, repo.id));
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === a.id)!.status).toBe('rejected');

    // Select all skips it, and the skill endpoints refuse rejected and undecided ids.
    const all = (await app.inject({ method: 'PATCH', url: `/repos/${repo.id}/conventions/status`, payload: { status: 'accepted' } })).json() as ConventionList;
    expect(all.items.map((i) => [i.id, i.status])).toEqual([[b.id, 'accepted']]);
    const withRejected = await app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/skill-draft`, payload: { ids: [a.id, b.id] } });
    expect(withRejected.statusCode).toBe(422);
    const create = await app.inject({
      method: 'POST',
      url: `/repos/${repo.id}/conventions/skill`,
      payload: { name: 'never-created', body: 'x', convention_ids: [a.id] },
    });
    expect(create.statusCode).toBe(422);
    await app.inject({ method: 'PATCH', url: `/conventions/${b.id}`, payload: { status: 'pending' } });
    const withPending = await app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/skill-draft`, payload: { ids: [b.id] } });
    expect(withPending.statusCode).toBe(422);

    const gone = await app.inject({ method: 'DELETE', url: `/conventions/${a.id}` });
    expect(gone.statusCode).toBe(404); // there is no delete: reject is a status
    await app.close();
  });

  it('re-scan keeps the user decisions and edited text, and drops stale undecided rows', async () => {
    const repo = await makeRepo();
    const first = await makeApp({ candidates: [asyncRule, redisRule] });
    const { items } = (await first.app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/extract` })).json() as ConventionList;
    const a = items.find((i) => i.rule === asyncRule.rule)!;
    const r = items.find((i) => i.rule === redisRule.rule)!;
    await first.app.inject({ method: 'PATCH', url: `/conventions/${a.id}`, payload: { status: 'rejected' } });
    await first.app.inject({ method: 'PATCH', url: `/conventions/${r.id}`, payload: { status: 'pending' } });
    await first.app.close();

    // Second scan finds only the async rule again, with a different confidence.
    const second = await makeApp({ candidates: [{ ...asyncRule, confidence: 0.7 }] });
    const after = (await second.app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/extract` })).json() as ConventionList;
    expect(after.items).toHaveLength(0); // the async rule is rejected (hidden), the stale redis rule is dropped
    const rows = await pg.handle.db.select().from(t.conventions).where(eq(t.conventions.repoId, repo.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: a.id, status: 'rejected', confidence: 0.7 });
    await second.app.close();
  });

  it('409 repo_not_ready without calling the model (no clone / nothing indexed)', async () => {
    const noClone = await makeRepo(null);
    const a = await makeApp();
    const r1 = await a.app.inject({ method: 'POST', url: `/repos/${noClone.id}/conventions/extract` });
    expect(r1.statusCode).toBe(409);
    expect((r1.json() as { error: { code: string } }).error.code).toBe('repo_not_ready');
    expect(a.llm.calls).toHaveLength(0);
    await a.app.close();

    const cloned = await makeRepo();
    const b = await makeApp({ paths: [] });
    const r2 = await b.app.inject({ method: 'POST', url: `/repos/${cloned.id}/conventions/extract` });
    expect(r2.statusCode).toBe(409);
    expect(b.llm.calls).toHaveLength(0);
    await b.app.close();
  });

  it('a model outage is a readable 502 and stores nothing', async () => {
    const repo = await makeRepo();
    const down = {
      completeStructured: async () => {
        throw new Error('provider unreachable');
      },
    } as unknown as LLMProvider;
    const { app } = await makeApp({ llm: down });
    const res = await app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/extract` });
    expect(res.statusCode).toBe(502);
    expect((res.json() as { error: { message: string } }).error.message).toContain('provider unreachable');
    expect(await pg.handle.db.select().from(t.conventions).where(eq(t.conventions.repoId, repo.id))).toHaveLength(0);
    await app.close();
  });

  it('draft → create skill (source extracted, evidence files) → link to an agent with the existing endpoint', async () => {
    const repo = await makeRepo();
    const { app } = await makeApp();
    const { items } = (await app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/extract` })).json() as ConventionList;
    const ids = items.map((i) => i.id);
    await app.inject({ method: 'PATCH', url: `/repos/${repo.id}/conventions/status`, payload: { status: 'accepted' } });

    const draft = (await app.inject({ method: 'POST', url: `/repos/${repo.id}/conventions/skill-draft`, payload: { ids } })).json() as ConventionSkillDraft;
    expect(draft.name).toBe('repo-conventions');
    expect(draft.body).toContain('Detected in `src/api/users.ts:2-3`:');
    expect(draft.body).toContain('Detected in `src/lib/redis.ts:2`:');

    const created = await app.inject({
      method: 'POST',
      url: `/repos/${repo.id}/conventions/skill`,
      payload: { name: draft.name, description: draft.description, type: 'convention', enabled: true, body: `${draft.body}\nEdited.`, convention_ids: ids },
    });
    expect(created.statusCode).toBe(201);
    const { skill_id } = created.json() as { skill_id: string };

    const skill = (await app.inject({ method: 'GET', url: `/skills/${skill_id}` })).json() as Skill;
    expect(skill).toMatchObject({ source: 'extracted', type: 'convention', version: 1, enabled: true });
    expect(skill.body).toContain('Edited.');
    expect([...(skill.evidence_files ?? [])].sort()).toEqual(['src/api/users.ts', 'src/lib/redis.ts']);

    const dup = await app.inject({
      method: 'POST',
      url: `/repos/${repo.id}/conventions/skill`,
      payload: { name: draft.name, body: 'x', convention_ids: ids },
    });
    expect(dup.statusCode).toBe(409);
    expect((dup.json() as { error: { code: string } }).error.code).toBe('skill_name_taken');

    const [agent] = await pg.handle.db.select().from(t.agents);
    const link = await app.inject({
      method: 'POST',
      url: `/agents/${agent!.id}/skills`,
      payload: { links: [{ skill_id, enabled: true }] },
    });
    expect(link.statusCode).toBe(200);
    await app.close();
  });

  it('refuses conventions of another repository', async () => {
    const one = await makeRepo();
    const two = await makeRepo();
    const { app } = await makeApp();
    const { items } = (await app.inject({ method: 'POST', url: `/repos/${one.id}/conventions/extract` })).json() as ConventionList;
    await app.inject({ method: 'PATCH', url: `/repos/${one.id}/conventions/status`, payload: { status: 'accepted' } });
    const res = await app.inject({ method: 'POST', url: `/repos/${two.id}/conventions/skill-draft`, payload: { ids: [items[0]!.id] } });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});
