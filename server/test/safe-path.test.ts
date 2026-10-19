/**
 * Path containment for reads from cloned (untrusted) repos: `resolveInsideRoot`
 * (lexical) and `readFileInsideRoot` (also follows symlinks). Temp dirs only.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isInsideRoot, resolveInsideRoot } from '../src/platform/safe-path.js';
import { readFileInsideRoot } from '../src/adapters/fs/safe-read.js';
import { ValidationError } from '../src/platform/errors.js';

describe('resolveInsideRoot', () => {
  it('resolves a nested relative path', () => {
    expect(resolveInsideRoot('/clones/o/r', 'src/a.ts')).toBe('/clones/o/r/src/a.ts');
  });

  it.each(['../secret', 'src/../../secret', '/etc/passwd', '', '.'])('rejects %j', (rel) => {
    expect(() => resolveInsideRoot('/clones/o/r', rel)).toThrow(ValidationError);
  });

  it('accepts names that merely start with two dots', () => {
    expect(resolveInsideRoot('/clones/o/r', '..config.ts')).toBe('/clones/o/r/..config.ts');
  });

  it('isInsideRoot rejects a sibling dir sharing the prefix', () => {
    expect(isInsideRoot('/clones/o/r', '/clones/o/r2/a.ts')).toBe(false);
  });
});

describe('readFileInsideRoot', () => {
  let base: string;
  let root: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'safe-read-'));
    root = join(base, 'repo');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src/a.ts'), 'export const a = 1;');
    await writeFile(join(base, 'outside.txt'), 'secret');
  });
  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  it('reads a file inside the root', async () => {
    await expect(readFileInsideRoot(root, 'src/a.ts')).resolves.toBe('export const a = 1;');
  });

  it('rejects ../ traversal', async () => {
    await expect(readFileInsideRoot(root, '../outside.txt')).rejects.toThrow(ValidationError);
  });

  it('rejects a symlink that points outside the root', async () => {
    await symlink(join(base, 'outside.txt'), join(root, 'src/link.ts'));
    await expect(readFileInsideRoot(root, 'src/link.ts')).rejects.toThrow(ValidationError);
  });

  it('follows a symlink that stays inside the root', async () => {
    await symlink(join(root, 'src/a.ts'), join(root, 'src/alias.ts'));
    await expect(readFileInsideRoot(root, 'src/alias.ts')).resolves.toBe('export const a = 1;');
  });
});
