import { describe, expect, it } from 'vitest';
import type { SkillVetting } from '@devdigest/shared';
import { canEnable, enableBlockReason, isPromptUsable, requiresVetting } from '../src/modules/_shared/skill-policy.js';

const vetting = (status: SkillVetting['status'], version = 1): SkillVetting => ({
  status,
  findings: [],
  llm: null,
  version,
  checked_at: '2026-10-19T00:00:00.000Z',
});

describe('skill policy', () => {
  it('manual skills never need vetting', () => {
    expect(requiresVetting('manual')).toBe(false);
    expect(canEnable({ source: 'manual', version: 3, vetting: null })).toBe(true);
  });

  it('imported skills need a clean result for the CURRENT version', () => {
    const base = { source: 'imported' as const, version: 2 };
    expect(enableBlockReason({ ...base, vetting: null })).toBe('not_checked');
    expect(enableBlockReason({ ...base, vetting: vetting('clean', 1) })).toBe('stale_check');
    expect(enableBlockReason({ ...base, vetting: vetting('suspicious', 2) })).toBe('suspicious');
    expect(enableBlockReason({ ...base, vetting: vetting('malicious', 2) })).toBe('malicious');
    expect(enableBlockReason({ ...base, vetting: vetting('unverified', 2) })).toBe('unverified');
    expect(canEnable({ ...base, vetting: vetting('clean', 2) })).toBe(true);
  });

  it('isPromptUsable needs global enabled AND link enabled AND policy', () => {
    const ok = { source: 'imported' as const, version: 1, enabled: true, vetting: vetting('clean') };
    expect(isPromptUsable(ok, true)).toBe(true);
    expect(isPromptUsable(ok, false)).toBe(false);
    expect(isPromptUsable({ ...ok, enabled: false }, true)).toBe(false);
    expect(isPromptUsable({ ...ok, vetting: vetting('suspicious') }, true)).toBe(false);
    expect(isPromptUsable({ ...ok, enabled: true, vetting: vetting('clean', 9) }, true)).toBe(false);
  });
});
