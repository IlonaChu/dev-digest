import { describe, expect, it } from 'vitest';
import type { LLMProvider } from '@devdigest/shared';
import { MockLLMProvider } from '../src/adapters/mocks.js';
import type { Container } from '../src/platform/container.js';
import { AppError } from '../src/platform/errors.js';
import { ConventionsService } from '../src/modules/conventions/service.js';
import type {
  ConventionRow,
  ScanValues,
  VerifiedCandidate,
} from '../src/modules/conventions/repository.js';

const WS = 'ws1';
const REPO = '00000000-0000-4000-8000-0000000000aa';

class FakeRepo {
  rows: ConventionRow[] = [];
  scans: ScanValues[] = [];
  async listForRepo() {
    return this.rows;
  }
  async latestScan() {
    return undefined;
  }
  async getMany(_ws: string, _repo: string, ids: string[]) {
    return this.rows.filter((r) => ids.includes(r.id));
  }
  async saveScan(_ws: string, _repo: string, scan: ScanValues, candidates: VerifiedCandidate[]) {
    this.scans.push(scan);
    this.rows = candidates.map((c, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      workspaceId: WS,
      repoId: REPO,
      scanId: null,
      category: c.category,
      rule: c.rule,
      ruleKey: c.ruleKey,
      evidencePath: c.evidencePath,
      evidenceStartLine: c.evidenceStartLine,
      evidenceEndLine: c.evidenceEndLine,
      evidenceSnippet: c.evidenceSnippet,
      confidence: c.confidence,
      status: 'pending' as const,
      edited: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    return { id: 's1', createdAt: new Date(), ...scan } as never;
  }
}

const FILES: Record<string, string> = {
  'tsconfig.json': '{ "compilerOptions": { "strict": true } }',
  'src/api/users.ts': 'import { db } from "../db";\nconst user = await db.users.find(id);\nconst posts = await db.posts.findMany({ userId });',
};

const good = {
  category: 'async',
  rule: 'Use async/await instead of .then() chains',
  evidence: { path: 'src/api/users.ts', start_line: 2, end_line: 3, quote: 'await db.users.find(id)' },
  confidence: 0.9,
};

function setup(opts: {
  clonePath?: string | null;
  paths?: string[];
  candidates?: unknown[];
  llm?: LLMProvider;
} = {}) {
  const repo = new FakeRepo();
  const created: Record<string, unknown>[] = [];
  const llm =
    opts.llm ??
    new MockLLMProvider('openai', {
      structuredBySchema: { ConventionExtraction: { candidates: opts.candidates ?? [good] } },
    });
  const container = {
    conventionsRepo: repo,
    reposRepo: {
      findRecord: async (_ws: string, id: string) =>
        id === REPO
          ? { id, owner: 'acme', name: 'payments-api', fullName: 'acme/payments-api', clonePath: opts.clonePath === undefined ? '/clone' : opts.clonePath, lastPolledAt: null }
          : undefined,
    },
    repoIntel: { getConventionSamples: async () => opts.paths ?? ['src/api/users.ts'] },
    sourceTree: {
      list: async () => [{ name: 'tsconfig.json', kind: 'file' }],
      read: async (_root: string, rel: string) => {
        if (!(rel in FILES)) throw new Error('ENOENT');
        return FILES[rel]!;
      },
    },
    settingsRepo: { get: async () => ({}) },
    llm: async () => llm,
    skillsRepo: {
      insert: async (v: Record<string, unknown>) => {
        created.push(v);
        return { id: 'skill-1', ...v };
      },
    },
  } as unknown as Container;
  return { service: new ConventionsService(container), repo, llm, created };
}

/** Mark every stored row with `status`, as the user would by Accept / Reject. */
const decideAll = (repo: FakeRepo, status: ConventionRow['status']) => {
  repo.rows = repo.rows.map((r) => ({ ...r, status }));
};

const llmCalls = (llm: LLMProvider) => (llm as MockLLMProvider).calls.filter((c) => c.method === 'completeStructured').length;

describe('ConventionsService.extract', () => {
  it('stores only candidates whose evidence checks out and counts the dropped ones', async () => {
    const ghost = { ...good, rule: 'Ghost rule', evidence: { ...good.evidence, path: 'src/ghost.ts' } };
    const wrongQuote = { ...good, rule: 'Wrong quote', evidence: { ...good.evidence, quote: 'never written' } };
    const { service, repo } = setup({ candidates: [good, ghost, wrongQuote] });

    const res = await service.extract(WS, REPO);

    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({
      rule: good.rule,
      evidence_path: 'src/api/users.ts',
      evidence_start_line: 2,
      evidence_end_line: 3,
      status: 'pending',
    });
    expect(res.items[0]!.evidence_snippet).toBe(FILES['src/api/users.ts']!.split('\n').slice(1, 3).join('\n'));
    expect(repo.scans[0]).toMatchObject({ found: 3, dropped: 2, sampleCount: 2, costUsd: 0.001 });
  });

  it('sends one cheap-model call with the files wrapped as untrusted and line-numbered', async () => {
    const { service, llm } = setup();
    await service.extract(WS, REPO);
    expect(llmCalls(llm)).toBe(1);
    const req = (llm as MockLLMProvider).calls.find((c) => c.method === 'completeStructured')!.req as {
      model: string;
      temperature: number;
      messages: { content: string }[];
    };
    expect(req.model).toBe('deepseek/deepseek-v4-flash');
    expect(req.temperature).toBe(0);
    expect(req.messages[1]!.content).toContain('<untrusted source="source:src/api/users.ts">');
    expect(req.messages[1]!.content).toContain('   2| const user = await db.users.find(id);');
    expect(req.messages[1]!.content).toContain('config:tsconfig.json');
  });

  it('answers 409 repo_not_ready WITHOUT calling the model when there is no clone or no samples', async () => {
    for (const o of [{ clonePath: null }, { paths: [] as string[] }, { paths: ['src/missing.ts'] }]) {
      const { service, llm } = setup(o);
      await expect(service.extract(WS, REPO)).rejects.toMatchObject({ code: 'repo_not_ready', statusCode: 409 });
      expect(llmCalls(llm)).toBe(0);
    }
  });

  it('turns a model outage into a readable 502', async () => {
    const down = {
      completeStructured: async () => {
        throw new Error('upstream timeout');
      },
    } as unknown as LLMProvider;
    const { service } = setup({ llm: down });
    const err = await service.extract(WS, REPO).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ code: 'extraction_failed', statusCode: 502 });
    expect(err.message).toContain('upstream timeout');
  });

  it('404s on an unknown repo', async () => {
    const { service } = setup();
    await expect(service.extract(WS, '00000000-0000-4000-8000-0000000000bb')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('ConventionsService skill', () => {
  it('builds a draft from the accepted conventions, named repo-conventions', async () => {
    const { service, repo } = setup();
    const { items } = await service.extract(WS, REPO);
    decideAll(repo, 'accepted');
    const draft = await service.draft(WS, REPO, items.map((i) => i.id));
    expect(draft).toMatchObject({ name: 'repo-conventions', type: 'convention' });
    expect(draft.body).toContain('Detected in `src/api/users.ts:2-3`:');
    expect(draft.token_estimate).toBeGreaterThan(0);
  });

  it('creates an `extracted` skill carrying the evidence files', async () => {
    const { service, repo, created } = setup();
    const { items } = await service.extract(WS, REPO);
    decideAll(repo, 'accepted');
    const out = await service.createSkill(WS, REPO, {
      name: 'repo-conventions',
      body: '# edited by the user',
      convention_ids: items.map((i) => i.id),
    });
    expect(out).toEqual({ skill_id: 'skill-1' });
    expect(created[0]).toMatchObject({
      workspaceId: WS,
      source: 'extracted',
      type: 'convention',
      enabled: true,
      body: '# edited by the user',
      evidenceFiles: ['src/api/users.ts'],
    });
  });

  it('refuses pending and rejected conventions (only accepted ones reach the skill)', async () => {
    for (const status of ['pending', 'rejected'] as const) {
      const { service, repo, created } = setup();
      const { items } = await service.extract(WS, REPO);
      decideAll(repo, status);
      const ids = items.map((i) => i.id);
      await expect(service.draft(WS, REPO, ids)).rejects.toMatchObject({ statusCode: 422 });
      await expect(service.createSkill(WS, REPO, { name: 'x', body: 'y', convention_ids: ids })).rejects.toMatchObject({
        statusCode: 422,
      });
      expect(created).toHaveLength(0);
    }
  });

  it('rejects ids that do not belong to the repo', async () => {
    const { service } = setup();
    await service.extract(WS, REPO);
    await expect(service.draft(WS, REPO, ['00000000-0000-4000-8000-00000000ffff'])).rejects.toMatchObject({ statusCode: 422 });
    await expect(
      service.createSkill(WS, REPO, { name: 'x', body: 'y', convention_ids: ['00000000-0000-4000-8000-00000000ffff'] }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});
