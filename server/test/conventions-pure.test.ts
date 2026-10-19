import { describe, expect, it } from 'vitest';
import type { ConventionCandidateOutput, ConventionRecord } from '@devdigest/shared';
import { ruleKey } from '../src/modules/conventions/helpers.js';
import {
  clipContent,
  collectSamples,
  isConfigFile,
  numberLines,
  type CloneReader,
  type SampleFile,
} from '../src/modules/conventions/sampling.js';
import { verifyEvidence } from '../src/modules/conventions/verify-evidence.js';
import {
  buildSkillDraft,
  estimateTokens,
  ruleSlug,
  slugify,
} from '../src/modules/conventions/skill-draft.js';

const file = (path: string, lines: string[]): SampleFile => ({
  path,
  kind: 'source',
  content: lines.join('\n'),
  lineCount: lines.length,
});

const candidate = (over: Partial<ConventionCandidateOutput['evidence']> = {}, confidence = 0.9): ConventionCandidateOutput => ({
  category: 'async',
  rule: 'Use async/await',
  evidence: { path: 'src/a.ts', start_line: 2, end_line: 3, quote: 'await db.users.find(id)', ...over },
  confidence,
});

const SAMPLES = [
  file('src/a.ts', ['import { db } from "./db";', 'const user = await db.users.find(id);', 'const posts = await db.posts.findMany({ userId });']),
];

describe('verifyEvidence', () => {
  it('accepts real evidence and cuts the snippet from the FILE, not the model', () => {
    const v = verifyEvidence(candidate(), SAMPLES);
    expect(v).toMatchObject({ ok: true, startLine: 2, endLine: 3, confidence: 0.9 });
    if (v.ok) expect(v.snippet).toBe(SAMPLES[0]!.content.split('\n').slice(1, 3).join('\n'));
  });

  it('tolerates whitespace differences in the quote', () => {
    expect(verifyEvidence(candidate({ quote: 'await   db.users.find(id)' }), SAMPLES).ok).toBe(true);
  });

  it.each([
    ['a file that was not sampled', { path: 'src/ghost.ts' }, 'unknown_file'],
    ['lines past the end of the file', { start_line: 2, end_line: 9 }, 'bad_range'],
    ['a range that starts at line 0', { start_line: 0, end_line: 1 }, 'bad_range'],
    ['an inverted range', { start_line: 3, end_line: 2 }, 'bad_range'],
    ['a quote that is not in the cited lines', { quote: 'await db.orders.find(id)' }, 'quote_not_found'],
    ['a quote that is in the file but outside the cited lines', { start_line: 1, end_line: 1 }, 'quote_not_found'],
  ])('rejects %s', (_label, evidence, reason) => {
    expect(verifyEvidence(candidate(evidence), SAMPLES)).toEqual({ ok: false, reason });
  });

  it('rejects a range longer than the limit', () => {
    const long = file('src/long.ts', Array.from({ length: 80 }, (_, i) => `line ${i + 1}`));
    const v = verifyEvidence(candidate({ path: 'src/long.ts', start_line: 1, end_line: 60, quote: 'line 3' }), [long]);
    expect(v).toEqual({ ok: false, reason: 'range_too_long' });
  });

  it('rejects low confidence and clamps a confidence above 1', () => {
    expect(verifyEvidence(candidate({}, 0.2), SAMPLES)).toEqual({ ok: false, reason: 'low_confidence' });
    const v = verifyEvidence(candidate({}, 7), SAMPLES);
    expect(v.ok && v.confidence).toBe(1);
  });
});

describe('sampling', () => {
  it('recognises config files', () => {
    for (const n of ['tsconfig.json', 'tsconfig.build.json', 'eslint.config.mjs', '.eslintrc.json', '.prettierrc', 'prettier.config.js', '.editorconfig']) {
      expect(isConfigFile(n), n).toBe(true);
    }
    for (const n of ['package.json', 'index.ts', 'README.md']) expect(isConfigFile(n), n).toBe(false);
  });

  it('clips by lines and by size on a line boundary', () => {
    expect(clipContent('a\nb\nc\nd', 2, 100)).toBe('a\nb');
    expect(clipContent('aaaa\nbbbb\ncccc', 100, 10)).toBe('aaaa\nbbbb');
  });

  it('numbers lines so the model can cite them', () => {
    expect(numberLines('x\ny')).toBe('   1| x\n   2| y');
  });

  it('collects root configs first, then ranked sources, skipping unreadable ones', async () => {
    const files: Record<string, string> = {
      'tsconfig.json': '{ "strict": true }',
      '.eslintrc.json': '{}',
      'src/a.ts': 'const a = 1;',
    };
    const reads: string[] = [];
    const tree: CloneReader = {
      list: async () => [
        { name: 'tsconfig.json', kind: 'file' },
        { name: '.eslintrc.json', kind: 'file' },
        { name: 'package.json', kind: 'file' },
        { name: 'src', kind: 'dir' },
      ],
      read: async (_root, rel) => {
        reads.push(rel);
        if (!(rel in files)) throw new Error('ENOENT');
        return files[rel]!;
      },
    };
    const out = await collectSamples(tree, '/clone', ['src/a.ts', 'src/missing.ts']);
    expect(out.map((f) => [f.path, f.kind])).toEqual([
      ['.eslintrc.json', 'config'],
      ['tsconfig.json', 'config'],
      ['src/a.ts', 'source'],
    ]);
    expect(reads).not.toContain('package.json');
  });

  it('survives an unreadable clone root', async () => {
    const tree: CloneReader = { list: async () => null, read: async () => 'x' };
    expect((await collectSamples(tree, '/clone', ['a.ts'])).map((f) => f.path)).toEqual(['a.ts']);
  });
});

describe('skill draft', () => {
  const rec = (over: Partial<ConventionRecord>): ConventionRecord => ({
    id: '00000000-0000-4000-8000-000000000001',
    repo_id: '00000000-0000-4000-8000-0000000000aa',
    category: 'async',
    rule: 'Always use async/await instead of .then() chains',
    evidence_path: 'src/api/users.ts',
    evidence_start_line: 23,
    evidence_end_line: 31,
    evidence_snippet: 'const user = await db.users.find(id);',
    confidence: 0.9,
    status: 'accepted',
    edited: false,
    ...over,
  });

  it('slugifies rule headings', () => {
    expect(slugify('Always use async/await instead of .then() chains')).toBe('always-use-async-await-instead-of-then-chains');
    expect(ruleSlug('Always use async/await instead of .then() chains')).toBe('async-await-then-chains');
    expect(ruleSlug('Use the')).toBe('use-the'); // never empties a slug
    expect(ruleSlug('Redis access goes through src/lib/redis.ts singleton').split('-').length).toBeLessThanOrEqual(6);
  });

  it('renders one section per rule with file:lines and the snippet', () => {
    const d = buildSkillDraft('payments-api', [rec({}), rec({ id: 'b', rule: 'Redis goes through the singleton', evidence_path: 'src/lib/redis.ts', evidence_start_line: 1, evidence_end_line: 1, evidence_snippet: 'export const redis = new Redis();' })]);
    expect(d.name).toBe('repo-conventions'); // fixed default, whatever the repo is called
    expect(d.description).toBe('2 house conventions extracted from payments-api');
    expect(d.body).toContain('# repo-conventions');
    expect(d.body).toContain('House conventions for `payments-api`.');
    expect(d.body).toContain('Detected in `src/api/users.ts:23-31`:');
    expect(d.body).toContain('Detected in `src/lib/redis.ts:1`:');
    expect(d.body).toContain('## redis-singleton');
    expect(estimateTokens(d.body)).toBe(Math.ceil(d.body.length / 4));
  });

  it('keeps slugs unique and uses a longer fence when the snippet has backticks', () => {
    const d = buildSkillDraft('r', [rec({}), rec({ id: 'b', evidence_snippet: 'const s = ```x```;' })]);
    const headings = [...d.body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(new Set(headings).size).toBe(2);
    expect(d.body).toContain('````\nconst s = ```x```;\n````');
  });
});

describe('ruleKey', () => {
  it('ignores case, punctuation and spacing', () => {
    expect(ruleKey('Use async/await,  not .then()!')).toBe(ruleKey('use ASYNC await not then'));
  });
});
