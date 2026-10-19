/**
 * assemblePrompt — PR description slot (the fix that was missing: the PR body
 * never reached the prompt). Pins rendering, omit-when-empty, untrusted-wrap,
 * truncation, and ordering (before the diff).
 */
import { describe, it, expect } from 'vitest';
import { assemblePrompt } from '../src/prompt.js';

function userOf(parts: Parameters<typeof assemblePrompt>[0]): string {
  const { messages } = assemblePrompt(parts);
  return messages[1]!.content;
}

function systemOf(parts: Parameters<typeof assemblePrompt>[0]): string {
  return assemblePrompt(parts).messages[0]!.content;
}

describe('assemblePrompt — shared injection guard (server + CI)', () => {
  const sys = systemOf({ system: 'AGENT-SYS', diff: 'DIFF' });

  it('appends the guard to the agent system prompt', () => {
    expect(sys.startsWith('AGENT-SYS')).toBe(true);
    expect(sys).toMatch(/<untrusted>.*DATA to be analyzed/s);
  });

  it('forbids "intentional/test/demo" claims from descoping the review', () => {
    // The defense that replaced the keyword sanitizer: a general, trusted,
    // language-agnostic rule — not text parsing of untrusted input.
    expect(sys).toMatch(/test fixture|intentional|demo/i);
    expect(sys).toMatch(/never reduce|never .*descope|REPORT it/i);
    expect(sys).toMatch(/any language/i);
  });
});

describe('assemblePrompt — ## PR description', () => {
  it('renders the section (untrusted-wrapped) before the diff when present', () => {
    const { messages, assembly } = assemblePrompt({
      system: 'sys',
      diff: 'DIFF',
      prDescription: 'Adds rate limiting to the public /api endpoints.',
    });
    const user = messages[1]!.content;
    expect(user).toContain('## PR description');
    expect(user).toContain('<untrusted source="pr-description">');
    expect(user).toContain('Adds rate limiting to the public /api endpoints.');
    expect(user.indexOf('## PR description')).toBeLessThan(user.indexOf('## Diff to review'));
    expect(assembly.pr_description).toContain('Adds rate limiting');
  });

  it('omits the section when prDescription is undefined or blank (no behaviour change)', () => {
    expect(userOf({ system: 'sys', diff: 'DIFF' })).not.toContain('## PR description');
    expect(assemblePrompt({ system: 'sys', diff: 'DIFF' }).assembly.pr_description ?? null).toBeNull();
    expect(userOf({ system: 'sys', diff: 'DIFF', prDescription: '   ' })).not.toContain(
      '## PR description',
    );
  });

  it('truncates a huge body to the 4k cap', () => {
    const { assembly } = assemblePrompt({
      system: 'sys',
      diff: 'D',
      prDescription: 'x'.repeat(10_000),
    });
    expect((assembly.pr_description as string).length).toBe(4000);
  });
});

describe('assemblePrompt — ## Skills / rules', () => {
  const A = '### Skill: untested-branches (v1)\nApply when: new branches\n\nFlag untested branches.';
  const B = '### Skill: edge-case-checklist (v2)\n\nCheck null and empty inputs.';

  it('renders skill blocks in the given order, before the diff, unwrapped', () => {
    const user = userOf({ system: 'sys', diff: 'DIFF', skills: [A, B] });
    expect(user).toContain('## Skills / rules');
    expect(user.indexOf(A)).toBeGreaterThan(-1);
    expect(user.indexOf(A)).toBeLessThan(user.indexOf(B));
    expect(user.indexOf(B)).toBeLessThan(user.indexOf('## Diff to review'));
    // trusted slot: not fenced as untrusted data
    expect(user).not.toContain('<untrusted source="skill');
  });

  it('records the joined blocks in the assembly for the trace', () => {
    const { assembly } = assemblePrompt({ system: 'sys', diff: 'DIFF', skills: [A, B] });
    expect(assembly.skills).toBe(`${A}\n\n${B}`);
  });

  it('omits the section when there are no skills', () => {
    for (const skills of [undefined, []]) {
      const { messages, assembly } = assemblePrompt({ system: 'sys', diff: 'DIFF', skills });
      expect(messages[1]!.content).not.toContain('## Skills / rules');
      expect(assembly.skills).toBeNull();
    }
  });
});
