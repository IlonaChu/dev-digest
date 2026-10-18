import { describe, it, expect } from 'vitest';
import type { SkillVetting } from '@devdigest/shared';
import {
  buildSkillPrompt,
  selectPromptSkills,
  skillsLogLine,
  type LinkedSkillInput,
} from '../src/modules/reviews/helpers.js';

const clean = (version: number): SkillVetting => ({
  status: 'clean',
  findings: [],
  llm: null,
  version,
  checked_at: '2026-10-19T00:00:00.000Z',
});

function row(
  name: string,
  order: number,
  over: Partial<LinkedSkillInput['skill']> = {},
  linkEnabled = true,
): LinkedSkillInput {
  return {
    order,
    enabled: linkEnabled,
    skill: {
      id: `id-${name}`,
      name,
      description: `Apply when ${name}.`,
      body: `Rule body of ${name}.`,
      source: 'manual',
      enabled: true,
      version: 1,
      vetting: null,
      ...over,
    },
  };
}

describe('selectPromptSkills', () => {
  it('keeps enabled skills in link order', () => {
    const out = selectPromptSkills([row('b', 1), row('a', 0), row('c', 2)]);
    expect(out.map((s) => s.name)).toEqual(['a', 'b', 'c']);
  });

  it('drops a globally disabled skill', () => {
    const out = selectPromptSkills([row('a', 0), row('b', 1, { enabled: false })]);
    expect(out.map((s) => s.name)).toEqual(['a']);
  });

  it('drops a skill whose link is disabled for this agent', () => {
    const out = selectPromptSkills([row('a', 0, {}, false), row('b', 1)]);
    expect(out.map((s) => s.name)).toEqual(['b']);
  });

  it('drops an imported skill without a clean check, even when enabled=true', () => {
    const out = selectPromptSkills([
      row('own', 0),
      row('imp-none', 1, { source: 'imported', vetting: null }),
      row('imp-bad', 2, { source: 'imported', vetting: { ...clean(1), status: 'malicious' } }),
      row('imp-unv', 3, { source: 'imported', vetting: { ...clean(1), status: 'unverified' } }),
    ]);
    expect(out.map((s) => s.name)).toEqual(['own']);
  });

  it('keeps an imported skill with a clean check for its current version', () => {
    const out = selectPromptSkills([row('imp', 0, { source: 'imported', version: 2, vetting: clean(2) })]);
    expect(out.map((s) => s.name)).toEqual(['imp']);
  });

  it('drops an imported skill whose clean check is for an older version', () => {
    const out = selectPromptSkills([row('imp', 0, { source: 'imported', version: 3, vetting: clean(2) })]);
    expect(out).toEqual([]);
  });

  it('returns nothing for no rows', () => {
    expect(selectPromptSkills([])).toEqual([]);
  });
});

describe('buildSkillPrompt', () => {
  it('renders one block per skill via the shared formatter and counts tokens per block', () => {
    const skills = selectPromptSkills([row('a', 0), row('b', 1, { version: 4 })]);
    const { blocks, meta } = buildSkillPrompt(skills, (text) => text.length);
    expect(blocks[0]).toBe('### Skill: a (v1)\nApply when: Apply when a.\n\nRule body of a.');
    expect(blocks[1]).toContain('### Skill: b (v4)');
    expect(meta).toEqual([
      { id: 'id-a', name: 'a', version: 1, tokens: blocks[0]!.length },
      { id: 'id-b', name: 'b', version: 4, tokens: blocks[1]!.length },
    ]);
  });

  it('omits the "Apply when" line for an empty description', () => {
    const { blocks } = buildSkillPrompt([row('a', 0, { description: '  ' }).skill], () => 1);
    expect(blocks[0]).toBe('### Skill: a (v1)\n\nRule body of a.');
  });
});

describe('skillsLogLine', () => {
  it('names each attached skill with version and token cost', () => {
    expect(
      skillsLogLine([
        { id: '1', name: 'a', version: 1, tokens: 120 },
        { id: '2', name: 'b', version: 3, tokens: 80 },
      ]),
    ).toBe('skills: 2 attached — a v1 · 120 tok, b v3 · 80 tok');
  });
});
