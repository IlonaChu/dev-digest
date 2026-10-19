import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { waitForPrRuns } from './helpers/runs.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { MockGitClient, MockLLMProvider, MockEmbedder } from '../src/adapters/mocks.js';
import type { Review, SkillVetting } from '@devdigest/shared';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

if (!hasDocker) {
  // eslint-disable-next-line no-console
  console.warn('[skills.it] Docker not available — skipping integration tests.');
}

const DIFF = `diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
@@ -10,3 +10,4 @@
   port: 3000,
+  retries: 3,
   redisUrl: x,`;

const APPROVE: Review = { verdict: 'approve', summary: 'ok', score: 100, findings: [] };

const TQ_SKILLS = ['untested-branches', 'edge-case-checklist', 'mock-discipline', 'flaky-test-patterns'];
const API_SKILLS = ['breaking-change', 'response-schema', 'semver-discipline'];

type Db = PgFixture['handle']['db'];

let seq = 0;
const uniq = (base: string) => `${base}-${seq++}`;

d('skills ↔ agents (Testcontainers pg)', () => {
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

  const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

  async function makeApp(llm = new MockLLMProvider('openai', { structured: APPROVE })) {
    return {
      llm,
      app: await buildApp({
        config: config(),
        db: pg.handle.db,
        overrides: {
          embedder: new MockEmbedder(),
          git: new MockGitClient({ diff: DIFF }),
          llm: { openai: llm },
        },
      }),
    };
  }

  async function insertSkill(
    name: string,
    over: Partial<typeof t.skills.$inferInsert> = {},
    ws = workspaceId,
  ) {
    const [row] = await pg.handle.db
      .insert(t.skills)
      .values({
        workspaceId: ws,
        name,
        description: `Apply when ${name}.`,
        type: 'custom',
        source: 'manual',
        body: `Body of ${name}.`,
        ...over,
      })
      .returning();
    return row!;
  }

  async function createAgent(app: Awaited<ReturnType<typeof makeApp>>['app'], name = uniq('agent')) {
    const res = await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { name, provider: 'openai', model: 'gpt-4.1', system_prompt: 'review' },
    });
    expect(res.statusCode).toBe(201);
    return res.json().id as string;
  }

  async function links(app: Awaited<ReturnType<typeof makeApp>>['app'], agentId: string) {
    const res = await app.inject({ method: 'GET', url: `/agents/${agentId}/skills` });
    expect(res.statusCode).toBe(200);
    return res.json() as { skill_id: string; order: number; enabled: boolean }[];
  }

  let prSeq = 0;
  async function setupPr() {
    const db: Db = pg.handle.db;
    const name = `skills-repo-${prSeq++}`;
    const [repo] = await db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` })
      .returning();
    const [pr] = await db
      .insert(t.pullRequests)
      .values({
        workspaceId,
        repoId: repo!.id,
        number: 1,
        title: 'Add retries',
        author: 'dev',
        branch: 'feat/retries',
        base: 'main',
        headSha: 'abc123',
        additions: 1,
        deletions: 0,
        filesCount: 1,
        status: 'needs_review',
        body: 'Adds retries.',
      })
      .returning();
    await db.insert(t.prFiles).values({
      prId: pr!.id,
      path: 'src/config.ts',
      additions: 1,
      deletions: 0,
      patch: '@@ -10,3 +10,4 @@\n   port: 3000,\n+  retries: 3,\n   redisUrl: x,',
    });
    return pr!;
  }

  async function runReview(
    app: Awaited<ReturnType<typeof makeApp>>['app'],
    agentId: string,
  ): Promise<{ runId: string; trace: any }> {
    const pr = await setupPr();
    const res = await app.inject({
      method: 'POST',
      url: `/pulls/${pr.id}/review`,
      payload: { agentId },
    });
    expect(res.statusCode).toBe(200);
    const runId = res.json().runs[0].run_id as string;
    await waitForPrRuns(pg.handle.db, pr.id, { expected: 1 });
    const trace = (await app.inject({ method: 'GET', url: `/runs/${runId}/trace` })).json();
    return { runId, trace };
  }

  /** The user message of the (single) model call a mock provider received. */
  function userPrompt(llm: MockLLMProvider): string {
    const call = llm.calls.find((c) => c.method === 'completeStructured')!;
    const msgs = (call.req as { messages: { role: string; content: string }[] }).messages;
    return msgs.find((m) => m.role === 'user')!.content;
  }

  // ---------------------------------------------------------------- seed

  it('seed creates the Test Quality Reviewer with its 4 skills linked in order', async () => {
    const db: Db = pg.handle.db;
    const { app } = await makeApp();
    const [agent] = await db
      .select()
      .from(t.agents)
      .where(and(eq(t.agents.workspaceId, workspaceId), eq(t.agents.name, 'Test Quality Reviewer')));
    expect(agent).toBeDefined();
    expect(agent!.systemPrompt).toContain('# Role');

    const ls = await links(app, agent!.id);
    expect(ls).toHaveLength(4);
    expect(ls.every((l) => l.enabled)).toBe(true);

    const skillRows = await db.select().from(t.skills).where(eq(t.skills.workspaceId, workspaceId));
    const byId = new Map(skillRows.map((s) => [s.id, s]));
    expect(ls.map((l) => byId.get(l.skill_id)!.name)).toEqual(TQ_SKILLS);
    expect(ls.map((l) => l.order)).toEqual([0, 1, 2, 3]);

    for (const l of ls) {
      const s = byId.get(l.skill_id)!;
      expect(s.source).toBe('manual');
      expect(s.version).toBe(1);
      expect(s.enabled).toBe(true);
      expect(s.body.length).toBeGreaterThan(400);
      expect(s.description).toMatch(/^Apply when/);
      const [v1] = await db
        .select()
        .from(t.skillVersions)
        .where(and(eq(t.skillVersions.skillId, s.id), eq(t.skillVersions.version, 1)));
      expect(v1!.body).toBe(s.body);
      expect(v1!.description).toBe(s.description);
    }
    await app.close();
  });

  it('seed is idempotent and does not restore a link the user removed', async () => {
    const db: Db = pg.handle.db;
    const { app } = await makeApp();
    const [agent] = await db
      .select()
      .from(t.agents)
      .where(and(eq(t.agents.workspaceId, workspaceId), eq(t.agents.name, 'Test Quality Reviewer')));
    const before = await links(app, agent!.id);

    await seed(db);
    expect(await links(app, agent!.id)).toEqual(before);
    const names = (await db.select().from(t.skills).where(eq(t.skills.workspaceId, workspaceId))).map(
      (s) => s.name,
    );
    expect(names.filter((n) => TQ_SKILLS.includes(n))).toHaveLength(4);

    // user drops the last skill in the UI; a re-seed must keep it dropped
    const kept = before.slice(0, 3).map((l) => ({ skill_id: l.skill_id }));
    const res = await app.inject({
      method: 'POST',
      url: `/agents/${agent!.id}/skills`,
      payload: { links: kept },
    });
    expect(res.statusCode).toBe(200);
    await seed(db);
    expect(await links(app, agent!.id)).toHaveLength(3);

    // restore the original set for any later test
    await app.inject({
      method: 'POST',
      url: `/agents/${agent!.id}/skills`,
      payload: { links: before.map((l) => ({ skill_id: l.skill_id })) },
    });
    await app.close();
  });

  // ------------------------------------------------------------ link API

  it('POST /agents/:id/skills sets order and per-agent enabled; legacy bodies keep working', async () => {
    const { app } = await makeApp();
    const agentId = await createAgent(app);
    const a = await insertSkill(uniq('a'));
    const b = await insertSkill(uniq('b'));
    const c = await insertSkill(uniq('c'));

    const set = await app.inject({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      payload: { links: [{ skill_id: c.id }, { skill_id: a.id }, { skill_id: b.id, enabled: false }] },
    });
    expect(set.statusCode).toBe(200);
    expect(set.json().map((l: { skill_id: string }) => l.skill_id)).toEqual([c.id, a.id, b.id]);
    expect(await links(app, agentId)).toEqual([
      { agent_id: agentId, skill_id: c.id, order: 0, enabled: true },
      { agent_id: agentId, skill_id: a.id, order: 1, enabled: true },
      { agent_id: agentId, skill_id: b.id, order: 2, enabled: false },
    ]);

    // legacy skill_ids: replaces the set, keeps the existing per-agent switch of b
    await app.inject({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      payload: { skill_ids: [b.id, a.id] },
    });
    expect((await links(app, agentId)).map((l) => [l.skill_id, l.order, l.enabled])).toEqual([
      [b.id, 0, false],
      [a.id, 1, true],
    ]);

    // legacy single link appends at the end
    await app.inject({ method: 'POST', url: `/agents/${agentId}/skills`, payload: { skill_id: c.id } });
    expect((await links(app, agentId)).map((l) => l.skill_id)).toEqual([b.id, a.id, c.id]);

    // empty links clears
    await app.inject({ method: 'POST', url: `/agents/${agentId}/skills`, payload: { links: [] } });
    expect(await links(app, agentId)).toEqual([]);
    await app.close();
  });

  it('rejects a skill from another workspace, an unknown id and duplicates with 422, leaving links intact', async () => {
    const db: Db = pg.handle.db;
    const { app } = await makeApp();
    const agentId = await createAgent(app);
    const mine = await insertSkill(uniq('mine'));
    await app.inject({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      payload: { links: [{ skill_id: mine.id }] },
    });

    const [otherWs] = await db.insert(t.workspaces).values({ name: uniq('other') }).returning();
    const foreign = await insertSkill(uniq('foreign'), {}, otherWs!.id);

    for (const payload of [
      { links: [{ skill_id: mine.id }, { skill_id: foreign.id }] },
      { skill_ids: [foreign.id] },
      { skill_id: foreign.id },
      { links: [{ skill_id: '00000000-0000-4000-8000-000000000000' }] },
      { links: [{ skill_id: mine.id }, { skill_id: mine.id }] },
    ]) {
      const res = await app.inject({ method: 'POST', url: `/agents/${agentId}/skills`, payload });
      expect(res.statusCode, JSON.stringify(payload)).toBe(422);
    }
    expect((await links(app, agentId)).map((l) => l.skill_id)).toEqual([mine.id]);
    await app.close();
  });

  // -------------------------------------------------------------- prompt

  it('a review puts only usable skills in the prompt, in link order, and records skills_meta + log', async () => {
    const { app, llm } = await makeApp();
    const agentId = await createAgent(app);

    const first = await insertSkill(uniq('first'), { version: 2 });
    const second = await insertSkill(uniq('second'));
    const globallyOff = await insertSkill(uniq('globally-off'), { enabled: false });
    const linkOff = await insertSkill(uniq('link-off'));
    const unvetted = await insertSkill(uniq('imported-unvetted'), { source: 'imported', enabled: true });
    const badVetting: SkillVetting = {
      status: 'malicious',
      findings: [{ rule: 'pipe-to-shell', message: 'curl | sh' }],
      llm: null,
      version: 1,
      checked_at: new Date().toISOString(),
    };
    const blocked = await insertSkill(uniq('imported-malicious'), {
      source: 'imported',
      enabled: true,
      vetting: badVetting,
    });
    const cleanImported = await insertSkill(uniq('imported-clean'), {
      source: 'imported',
      enabled: true,
      vetting: { ...badVetting, status: 'clean', findings: [] },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      payload: {
        links: [
          { skill_id: second.id },
          { skill_id: globallyOff.id },
          { skill_id: linkOff.id, enabled: false },
          { skill_id: unvetted.id },
          { skill_id: blocked.id },
          { skill_id: first.id },
          { skill_id: cleanImported.id },
        ],
      },
    });
    expect(res.statusCode).toBe(200);

    const { trace } = await runReview(app, agentId);
    const prompt = userPrompt(llm);

    expect(prompt).toContain('## Skills / rules');
    const positions = [second, first, cleanImported].map((s) =>
      prompt.indexOf(`### Skill: ${s.name} (v${s.version})`),
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((x, y) => x - y)).toEqual(positions); // link order
    expect(prompt).toContain(`Apply when: Apply when ${second.name}.`);
    expect(prompt).toContain(`Body of ${second.name}.`);

    for (const absent of [globallyOff, linkOff, unvetted, blocked]) {
      expect(prompt).not.toContain(absent.name);
      expect(prompt).not.toContain(`Body of ${absent.name}.`);
    }

    // trace: per-skill meta with token counts, same order as the prompt
    const meta = trace.prompt_assembly.skills_meta as { id: string; name: string; version: number; tokens: number }[];
    expect(meta.map((m) => m.name)).toEqual([second.name, first.name, cleanImported.name]);
    expect(meta.map((m) => m.version)).toEqual([1, 2, 1]);
    expect(meta.every((m) => m.tokens > 0)).toBe(true);
    expect(trace.prompt_assembly.skills).toContain(`### Skill: ${first.name} (v2)`);

    // log: ONE line naming the attached skills, nothing about the disabled ones
    const skillLines = (trace.log as { msg: string }[]).map((l) => l.msg).filter((m) => m.startsWith('skills:'));
    expect(skillLines).toHaveLength(1);
    expect(skillLines[0]).toContain('3 attached');
    expect(skillLines[0]).toContain(`${second.name} v1 · ${meta[0]!.tokens} tok`);
    const wholeLog = (trace.log as { msg: string }[]).map((l) => l.msg).join('\n');
    for (const absent of [globallyOff, linkOff, unvetted, blocked]) {
      expect(wholeLog).not.toContain(absent.name);
    }
    await app.close();
  });

  it('an agent with no usable skills gets no skills section, no skills_meta and no skills log line', async () => {
    const { app, llm } = await makeApp();
    const agentId = await createAgent(app);
    const off = await insertSkill(uniq('off'), { enabled: false });
    await app.inject({
      method: 'POST',
      url: `/agents/${agentId}/skills`,
      payload: { links: [{ skill_id: off.id }] },
    });

    const { trace } = await runReview(app, agentId);
    expect(userPrompt(llm)).not.toContain('## Skills / rules');
    expect(trace.prompt_assembly.skills ?? null).toBeNull();
    expect(trace.prompt_assembly.skills_meta ?? null).toBeNull();
    expect((trace.log as { msg: string }[]).some((l) => l.msg.startsWith('skills:'))).toBe(false);
    await app.close();
  });

  it('the seeded Test Quality Reviewer injects its 4 skills in order', async () => {
    const db: Db = pg.handle.db;
    const [tq] = await db
      .select()
      .from(t.agents)
      .where(and(eq(t.agents.workspaceId, workspaceId), eq(t.agents.name, 'Test Quality Reviewer')));
    // seeded agents use openrouter; point this one at the mock provider for the run
    await db.update(t.agents).set({ provider: 'openai', model: 'gpt-4.1' }).where(eq(t.agents.id, tq!.id));

    const { app, llm } = await makeApp();
    const { trace } = await runReview(app, tq!.id);
    const prompt = userPrompt(llm);
    const pos = TQ_SKILLS.map((n) => prompt.indexOf(`### Skill: ${n} (v1)`));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((x, y) => x - y)).toEqual(pos);
    expect((trace.prompt_assembly.skills_meta as { name: string }[]).map((m) => m.name)).toEqual(TQ_SKILLS);
    await app.close();
  });

  it('the seeded API Contract Reviewer links its 3 skills and injects them in order', async () => {
    const db: Db = pg.handle.db;
    const [api] = await db
      .select()
      .from(t.agents)
      .where(and(eq(t.agents.workspaceId, workspaceId), eq(t.agents.name, 'API Contract Reviewer')));
    expect(api).toBeDefined();
    await db.update(t.agents).set({ provider: 'openai', model: 'gpt-4.1' }).where(eq(t.agents.id, api!.id));

    const { app, llm } = await makeApp();
    const ls = await links(app, api!.id);
    const skillRows = await db.select().from(t.skills).where(eq(t.skills.workspaceId, workspaceId));
    const byId = new Map(skillRows.map((s) => [s.id, s]));
    expect(ls.map((l) => byId.get(l.skill_id)!.name)).toEqual(API_SKILLS);
    expect(ls.map((l) => l.order)).toEqual([0, 1, 2]);
    for (const l of ls) {
      const s = byId.get(l.skill_id)!;
      expect(s.source).toBe('manual');
      expect(s.description).toMatch(/^Apply when/);
      expect(s.body).toContain('## Good');
      expect(s.body).toContain('## Bad');
    }
    // deprecation-policy ships as an import file, not as a seeded skill
    expect(skillRows.some((s) => s.name === 'deprecation-policy')).toBe(false);

    const { trace } = await runReview(app, api!.id);
    const prompt = userPrompt(llm);
    const pos = API_SKILLS.map((n) => prompt.indexOf(`### Skill: ${n} (v1)`));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((x, y) => x - y)).toEqual(pos);
    expect((trace.prompt_assembly.skills_meta as { name: string }[]).map((m) => m.name)).toEqual(API_SKILLS);
    await app.close();
  });
});
