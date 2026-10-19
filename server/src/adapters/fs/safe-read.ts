import { readFile, realpath } from 'node:fs/promises';
import { ValidationError } from '../../platform/errors.js';
import { isInsideRoot, resolveInsideRoot } from '../../platform/safe-path.js';

/**
 * Read a repo-relative file under `root`, refusing `../` escapes AND symlinks that
 * point outside the clone (a cloned repo is untrusted input).
 */
export async function readFileInsideRoot(root: string, relPath: string): Promise<string> {
  const abs = resolveInsideRoot(root, relPath);
  const [realRoot, realTarget] = await Promise.all([realpath(root), realpath(abs)]);
  if (!isInsideRoot(realRoot, realTarget)) {
    throw new ValidationError('Path escapes the repository root', { path: relPath });
  }
  return readFile(realTarget, 'utf8');
}
