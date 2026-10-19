import { describe, it, expect } from 'vitest';
import {
  buildAgentRollups,
  needsDiffStats,
  toListItem,
  toPersistedDetail,
} from '../src/modules/pulls/domain.js';
import type { PullRecord } from '../src/modules/pulls/types.js';

const pr = (over: Partial<PullRecord> = {}): PullRecord => ({
  id: 'pr-1',
  repoId: 'repo-1',
  number: 7,
  title: 'Add cache',
  author: 'ana',
  branch: 'feat/cache',
  base: 'main',
  headSha: 'h2',
  lastReviewedSha: null,
  additions: 10,
  deletions: 2,
  filesCount: 3,
  status: 'open',
  body: 'why',
  openedAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-02T00:00:00Z'),
  ...over,
});

describe('pulls domain', () => {
  it('needsDiffStats only for fully-zeroed imports', () => {
    expect(needsDiffStats(pr({ additions: 0, deletions: 0, filesCount: 0 }))).toBe(true);
    expect(needsDiffStats(pr({ additions: 0, deletions: 0, filesCount: 1 }))).toBe(false);
  });

  it('buildAgentRollups averages scores and attaches findings per latest review', () => {
    const latest = new Map([
      [
        'pr-1',
        [
          { id: 'r1', prId: 'pr-1', agentId: 'a1', agentName: 'Sec', runId: 'run1', score: 80 },
          { id: 'r2', prId: 'pr-1', agentId: 'a2', agentName: 'Perf', runId: 'run2', score: 61 },
        ],
      ],
    ]);
    const finding = {
      id: 'f1',
      severity: 'WARNING' as const,
      category: 'security' as const,
      title: 't',
      file: 'a.ts',
      start_line: 1,
      end_line: 1,
      confidence: 0.9,
      rationale: 'r',
    };
    const rollup = buildAgentRollups(latest, new Map([['r1', [finding]]])).get('pr-1');
    expect(rollup?.score).toBe(71);
    expect(rollup?.findingsByAgent.map((s) => s.findings.length)).toEqual([1, 0]);
  });

  it('toListItem derives review status and defaults the rollup fields', () => {
    const item = toListItem(pr(), undefined, undefined, Date.parse('2026-10-03T00:00:00Z'));
    expect(item).toMatchObject({
      id: 'pr-1',
      head_sha: 'h2',
      files_count: 3,
      status: 'needs_review',
      score: null,
      cost_usd: null,
      findings_by_agent: [],
      opened_at: '2026-10-01T00:00:00.000Z',
    });
  });

  it('toPersistedDetail keeps the raw merge state and the stored snapshot', () => {
    const detail = toPersistedDetail(pr({ status: 'merged' }), {
      files: [{ path: 'a.ts', additions: 1, deletions: 0, patch: null }],
      commits: [],
    });
    expect(detail.status).toBe('merged');
    expect(detail.body).toBe('why');
    expect(detail.files).toHaveLength(1);
  });
});
