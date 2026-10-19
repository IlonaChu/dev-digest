import { isAbsolute, relative, resolve, sep } from 'node:path';
import { ValidationError } from './errors.js';

/** True when `target` (absolute) is `root` itself or lies below it. */
export function isInsideRoot(root: string, target: string): boolean {
  const rel = relative(resolve(root), resolve(target));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/**
 * Resolve a repo-relative path against `root`, rejecting anything that escapes it
 * (`../`, absolute paths). Lexical only — callers that follow symlinks must also
 * check the `realpath` with `isInsideRoot`.
 */
export function resolveInsideRoot(root: string, relPath: string): string {
  const target = resolve(root, relPath);
  if (relPath === '' || !isInsideRoot(root, target) || resolve(root) === target) {
    throw new ValidationError('Path escapes the repository root', { path: relPath });
  }
  return target;
}
