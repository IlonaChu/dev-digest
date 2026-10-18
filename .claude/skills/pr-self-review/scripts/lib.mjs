// Shared helpers for pr-self-review scripts. Node built-ins only (the repo root has no package.json).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function git(args, { cwd = process.cwd(), env } = {}) {
  return execFileSync('git', args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function repoRoot(cwd) {
  return git(['rev-parse', '--show-toplevel'], { cwd }).trim();
}

/** `.git/pr-self-review` of the main repo (shared by worktrees, never committed). */
export function stateDir(cwd) {
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd }).trim();
  const dir = join(common, 'pr-self-review');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Tree SHA of the working copy (tracked + untracked, minus .gitignore'd), computed in a throwaway
 * index so the real index is untouched. Same content committed later => same `HEAD^{tree}`.
 */
export function worktreeTree(cwd) {
  const realIndex = git(['rev-parse', '--path-format=absolute', '--git-path', 'index'], { cwd }).trim();
  const tmpIndex = join(stateDir(cwd), `index-${process.pid}`);
  try {
    if (existsSync(realIndex)) copyFileSync(realIndex, tmpIndex); // keeps the stat cache → fast
    const env = { GIT_INDEX_FILE: tmpIndex };
    git(['add', '-A'], { cwd, env });
    return git(['write-tree'], { cwd, env }).trim();
  } finally {
    rmSync(tmpIndex, { force: true });
  }
}

export function treeOf(rev, cwd) {
  return git(['rev-parse', `${rev}^{tree}`], { cwd }).trim();
}

/** Minimal glob → RegExp: `**`, `*`, `?`, `{a,b}`. Paths are repo-relative with `/`. */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '{') re += '(?:';
    else if (c === '}') re += ')';
    else if (c === ',') re += '|';
    else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

export const matchesAny = (path, globs = []) => globs.some((g) => globToRegExp(g).test(path));

/** True when the module is run directly (`node x.mjs`), false when imported by tests. */
export const isMain = (metaUrl) => process.argv[1] && metaUrl === pathToFileURL(process.argv[1]).href;
