import { describe, expect, it, vi } from 'vitest';
import { parseSkillImport, toSkillName } from '../src/modules/skills/import-parser.js';
import type { ArchiveEntry, ArchiveReader } from '../src/modules/skills/ports.js';
import { ValidationError } from '../src/platform/errors.js';

const enc = (s: string) => new TextEncoder().encode(s);

/** Fake archive: `files` maps path → text; only listEntries/readText exist (no extract). */
function fakeArchive(files: Record<string, string>) {
  const readText = vi.fn((_a: Uint8Array, path: string) => {
    if (!(path in files)) throw new Error('missing');
    return files[path]!;
  });
  const reader: ArchiveReader = {
    listEntries: () =>
      Object.entries(files).map(([path, text]): ArchiveEntry => ({
        path,
        size: text.length,
        isDirectory: path.endsWith('/'),
      })),
    readText,
  };
  return { reader, readText };
}
const noArchive = fakeArchive({}).reader;

describe('parseSkillImport — markdown', () => {
  it('reads one-line frontmatter and strips it from the body', () => {
    const md = '---\nname: "My Rubric"\ndescription: Flag missing tests\ntype: rubric\n---\n# Heading\nBody';
    const r = parseSkillImport('x.md', enc(md), noArchive);
    expect(r).toMatchObject({
      name: 'my-rubric',
      description: 'Flag missing tests',
      type: 'rubric',
      body: '# Heading\nBody',
      ignored_files: [],
    });
  });

  it('falls back to the first heading, then the filename; unknown type → custom', () => {
    expect(parseSkillImport('a.md', enc('# Test Quality Rules\nx'), noArchive).name).toBe('test-quality-rules');
    expect(parseSkillImport('Flaky Tests.md', enc('no heading'), noArchive).name).toBe('flaky-tests');
    expect(parseSkillImport('a.md', enc('---\ntype: nonsense\n---\nbody'), noArchive).type).toBe('custom');
  });

  it('rejects empty content, NUL bytes, oversize and unknown extensions with ValidationError', () => {
    expect(() => parseSkillImport('a.md', enc('---\nname: x\n---\n'), noArchive)).toThrow(ValidationError);
    expect(() => parseSkillImport('a.md', enc('a\u0000b'), noArchive)).toThrow(ValidationError);
    expect(() => parseSkillImport('a.md', new Uint8Array(256 * 1024 + 1).fill(97), noArchive)).toThrow(ValidationError);
    expect(() => parseSkillImport('a.exe', enc('x'), noArchive)).toThrow(/Unsupported/);
  });
});

describe('parseSkillImport — zip', () => {
  it('reads ONLY SKILL.md and lists scripts as ignored + executable', () => {
    const { reader, readText } = fakeArchive({
      'SKILL.md': '# Gate\nrules',
      'scripts/run.sh': 'rm -rf /',
      'scripts/notes.txt': 'hi',
      'helper.py': 'print(1)',
      'README.txt': 'readme',
    });
    const r = parseSkillImport('gate.zip', new Uint8Array(10), reader);
    expect(r.name).toBe('gate');
    expect(readText).toHaveBeenCalledTimes(1);
    expect(readText.mock.calls[0]![1]).toBe('SKILL.md');
    expect(r.ignored_files).toEqual([
      { path: 'scripts/run.sh', executable: true },
      { path: 'scripts/notes.txt', executable: true }, // anything under scripts/ is treated as runnable
      { path: 'helper.py', executable: true },
      { path: 'README.txt', executable: false },
    ]);
  });

  it('finds SKILL.md inside the single top-level folder', () => {
    const { reader } = fakeArchive({ 'my-skill/': '', 'my-skill/SKILL.md': '# A\nb', 'my-skill/bin/x': 'bin' });
    const r = parseSkillImport('a.zip', new Uint8Array(10), reader);
    expect(r.body).toBe('# A\nb');
    expect(r.ignored_files).toEqual([{ path: 'my-skill/bin/x', executable: true }]);
  });

  it('falls back to the only root .md; ignores macOS noise', () => {
    const { reader } = fakeArchive({ 'rules.md': '# R\nx', '__MACOSX/._rules.md': 'junk', '.DS_Store': 'x' });
    const r = parseSkillImport('a.zip', new Uint8Array(10), reader);
    expect(r.name).toBe('r');
    expect(r.ignored_files).toEqual([]);
  });

  it('rejects a zip without a skill file, too many entries, and a bad archive', () => {
    expect(() => parseSkillImport('a.zip', new Uint8Array(10), fakeArchive({ 'a.md': 'x', 'b.md': 'y' }).reader)).toThrow(/No SKILL.md/);
    const many = Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`f${i}.txt`, 'x']));
    expect(() => parseSkillImport('a.zip', new Uint8Array(10), fakeArchive(many).reader)).toThrow(/too many entries/);
    const broken: ArchiveReader = { listEntries: () => { throw new Error('bad zip'); }, readText: () => '' };
    expect(() => parseSkillImport('a.zip', new Uint8Array(10), broken)).toThrow(ValidationError);
    expect(() => parseSkillImport('a.zip', new Uint8Array(1024 * 1024 + 1), noArchive)).toThrow(/too large/);
  });

  it('rejects a SKILL.md whose declared size exceeds the cap without reading it', () => {
    const readText = vi.fn();
    const reader: ArchiveReader = {
      listEntries: () => [{ path: 'SKILL.md', size: 300 * 1024, isDirectory: false }],
      readText,
    };
    expect(() => parseSkillImport('a.zip', new Uint8Array(10), reader)).toThrow(/too large/);
    expect(readText).not.toHaveBeenCalled();
  });
});

describe('toSkillName', () => {
  it('kebab-cases, trims and caps at 64 chars', () => {
    expect(toSkillName('  Hello, World!  ')).toBe('hello-world');
    expect(toSkillName('!!!')).toBe('imported-skill');
    expect(toSkillName('a'.repeat(100))).toHaveLength(64);
  });
});
