/**
 * PR-list rollup helpers (`modules/pulls/status.ts`) — the pure derivation that
 * decides each PR's review STATUS and tallies its FINDINGS for the list. The DB
 * `status` column holds GitHub's merge state; the review status
 * (needs_review / reviewed / stale) is derived here from head vs lastReviewedSha
 * + age, so it gets unit coverage independent of the route's queries.
 */
import { describe, it, expect } from 'vitest';
import {
  averageScore,
  deriveReviewStatus,
  latestReviewPerAgent,
  rollupSeverities,
  STALE_DAYS,
} from '../src/modules/pulls/status.js';
import type { ListReviewRow } from '../src/modules/pulls/status.js';

const DAY = 86_400_000;
const now = Date.UTC(2026, 5, 11);

describe('deriveReviewStatus', () => {
  it('needs_review when never reviewed, or when head moved since the last review', () => {
    expect(
      deriveReviewStatus({ ghStatus: 'open', lastReviewedSha: null, headSha: 'abc', updatedAt: new Date(now), now }),
    ).toBe('needs_review');
    expect(
      deriveReviewStatus({ ghStatus: 'open', lastReviewedSha: 'old', headSha: 'abc', updatedAt: new Date(now), now }),
    ).toBe('needs_review');
  });

  it('reviewed when the current head was reviewed and the PR is recent', () => {
    expect(
      deriveReviewStatus({ ghStatus: 'open', lastReviewedSha: 'abc', headSha: 'abc', updatedAt: new Date(now - DAY), now }),
    ).toBe('reviewed');
  });

  it('stale when the current head was reviewed but the PR is older than STALE_DAYS', () => {
    expect(
      deriveReviewStatus({
        ghStatus: 'open',
        lastReviewedSha: 'abc',
        headSha: 'abc',
        updatedAt: new Date(now - (STALE_DAYS + 1) * DAY),
        now,
      }),
    ).toBe('stale');
  });

  it('keeps merged/closed regardless of review state', () => {
    expect(
      deriveReviewStatus({ ghStatus: 'merged', lastReviewedSha: null, headSha: 'abc', updatedAt: null, now }),
    ).toBe('merged');
    expect(
      deriveReviewStatus({ ghStatus: 'closed', lastReviewedSha: 'abc', headSha: 'abc', updatedAt: new Date(now), now }),
    ).toBe('closed');
  });
});

describe('rollupSeverities', () => {
  it('tallies findings into critical / warning / suggestion buckets (ignores unknown)', () => {
    expect(
      rollupSeverities([
        { severity: 'CRITICAL' },
        { severity: 'CRITICAL' },
        { severity: 'WARNING' },
        { severity: 'SUGGESTION' },
        { severity: 'WEIRD' },
      ]),
    ).toEqual({ critical: 2, warning: 1, suggestion: 1 });
  });

  it('is all-zero for no findings', () => {
    expect(rollupSeverities([])).toEqual({ critical: 0, warning: 0, suggestion: 0 });
  });
});

const rv = (o: Partial<ListReviewRow> & { id: string }): ListReviewRow => ({
  prId: 'pr1',
  agentId: null,
  agentName: null,
  runId: null,
  score: null,
  ...o,
});

describe('latestReviewPerAgent', () => {
  it('keeps only the newest review of each agent (rows come newest-first)', () => {
    const byPr = latestReviewPerAgent([
      rv({ id: 'sec-new', agentId: 'a1', agentName: 'Sec' }),
      rv({ id: 'perf-new', agentId: 'a2', agentName: 'Perf' }),
      rv({ id: 'sec-old', agentId: 'a1', agentName: 'Sec' }),
      rv({ id: 'perf-old', agentId: 'a2', agentName: 'Perf' }),
    ]);
    expect(byPr.get('pr1')!.map((r) => r.id)).toEqual(['perf-new', 'sec-new']);
  });

  it('groups per PR, and reviews without an agent share one group', () => {
    const byPr = latestReviewPerAgent([
      rv({ id: 'seed-new' }),
      rv({ id: 'other', prId: 'pr2', agentId: 'a1', agentName: 'Sec' }),
      rv({ id: 'seed-old' }),
    ]);
    expect(byPr.get('pr1')!.map((r) => r.id)).toEqual(['seed-new']);
    expect(byPr.get('pr2')!.map((r) => r.id)).toEqual(['other']);
  });

  it('sorts groups by agent name, unnamed (no / deleted agent) last', () => {
    const byPr = latestReviewPerAgent([
      rv({ id: 'deleted', agentId: 'gone', agentName: null }),
      rv({ id: 'sec', agentId: 'a1', agentName: 'Sec' }),
      rv({ id: 'arch', agentId: 'a3', agentName: 'Arch' }),
    ]);
    expect(byPr.get('pr1')!.map((r) => r.id)).toEqual(['arch', 'sec', 'deleted']);
  });

  it('is empty for no reviews', () => {
    expect(latestReviewPerAgent([]).size).toBe(0);
  });
});

describe('averageScore', () => {
  it('is the rounded mean of the scores', () => {
    expect(averageScore([{ score: 65 }, { score: 80 }])).toBe(73);
    expect(averageScore([{ score: 90 }])).toBe(90);
  });

  it('skips null scores, and is null when no review has one', () => {
    expect(averageScore([{ score: 60 }, { score: null }])).toBe(60);
    expect(averageScore([{ score: null }])).toBeNull();
    expect(averageScore([])).toBeNull();
  });
});
