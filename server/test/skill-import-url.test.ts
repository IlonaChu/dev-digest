import { describe, expect, it } from 'vitest';
import { filenameFromUrl, normalizeSkillUrl } from '../src/modules/skills/import-url.js';
import { ValidationError } from '../src/platform/errors.js';

describe('normalizeSkillUrl', () => {
  it('accepts http(s), trims, and drops the fragment', () => {
    expect(normalizeSkillUrl('  https://example.com/SKILL.md#intro ')).toBe('https://example.com/SKILL.md');
    expect(normalizeSkillUrl('http://localhost:8080/a.zip')).toBe('http://localhost:8080/a.zip');
  });

  it('rewrites a GitHub file page to its raw file, keeping nested paths', () => {
    expect(normalizeSkillUrl('https://github.com/acme/skills/blob/main/SKILL.md')).toBe(
      'https://raw.githubusercontent.com/acme/skills/main/SKILL.md',
    );
    expect(normalizeSkillUrl('https://github.com/acme/skills/blob/v1.2/dir/sub/SKILL.md?plain=1')).toBe(
      'https://raw.githubusercontent.com/acme/skills/v1.2/dir/sub/SKILL.md',
    );
    // not a file page → untouched
    expect(normalizeSkillUrl('https://github.com/acme/skills')).toBe('https://github.com/acme/skills');
    expect(normalizeSkillUrl('https://raw.githubusercontent.com/acme/skills/main/SKILL.md')).toBe(
      'https://raw.githubusercontent.com/acme/skills/main/SKILL.md',
    );
  });

  it('rejects empty, malformed, non-http and over-long URLs with a ValidationError', () => {
    for (const bad of ['', '   ', 'not a url', 'ftp://example.com/SKILL.md', 'file:///etc/passwd', `https://x.io/${'a'.repeat(2100)}`]) {
      expect(() => normalizeSkillUrl(bad)).toThrow(ValidationError);
    }
  });
});

describe('filenameFromUrl', () => {
  it('keeps a .md / .zip name from the path (decoded)', () => {
    expect(filenameFromUrl('https://x.io/a/b/SKILL.md', 'text/plain')).toBe('SKILL.md');
    expect(filenameFromUrl('https://x.io/my%20skill.ZIP?dl=1', null)).toBe('my skill.ZIP');
  });

  it('falls back to the content type when the extension is missing or foreign', () => {
    expect(filenameFromUrl('https://x.io/skills/retry', 'text/plain; charset=utf-8')).toBe('retry.md');
    expect(filenameFromUrl('https://x.io/skills/retry.txt', 'text/plain')).toBe('retry.md');
    expect(filenameFromUrl('https://x.io/download', 'application/zip')).toBe('download.zip');
    expect(filenameFromUrl('https://x.io/', null)).toBe('skill.md');
    expect(filenameFromUrl('garbage', null)).toBe('skill.md');
  });
});
