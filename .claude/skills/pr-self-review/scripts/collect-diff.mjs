// Collects every open change of the branch: commits since merge-base + staged + unstaged + untracked.
// Writes <state>/diff.json (with added lines, for content signals) and prints a summary.
// Usage: node collect-diff.mjs [--base <ref>]
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { git, isMain, repoRoot, stateDir, worktreeTree } from './lib.mjs';

const MAX_UNTRACKED_BYTES = 512 * 1024;
const isEnvFile = (p) => /^\.env/.test(basename(p)) && basename(p) !== '.env.example';

export function parseRaw(raw) {
  // `git diff --raw -z --no-renames`: ":<oldmode> <newmode> <oldsha> <newsha> <status>\0<path>\0"
  const parts = raw.split('\0').filter(Boolean);
  const files = [];
  for (let i = 0; i < parts.length; i += 2) {
    const [oldMode, newMode, , , status] = parts[i].slice(1).split(' ');
    files.push({ path: parts[i + 1], status, oldMode, newMode, added: [] });
  }
  return files;
}

export function addedLinesByFile(patch) {
  const out = new Map();
  let current = null;
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++ ')) {
      current = line === '+++ /dev/null' ? null : line.slice(6); // strip "+++ b/"
      if (current && !out.has(current)) out.set(current, []);
    } else if (current && line.startsWith('+')) {
      out.get(current).push(line.slice(1));
    }
  }
  return out;
}

export function collect({ cwd = process.cwd(), base: baseArg } = {}) {
  const root = repoRoot(cwd);
  const warnings = [];
  let baseRef = baseArg;
  if (!baseRef) {
    baseRef = ['origin/main', 'main'].find((r) => {
      try { git(['rev-parse', '--verify', '--quiet', r], { cwd: root }); return true; } catch { return false; }
    });
    if (!baseRef) throw new Error('No origin/main or main found; pass --base <ref>.');
    if (baseRef === 'main') warnings.push('origin/main not found; using local main as base.');
  }
  const base = git(['merge-base', 'HEAD', baseRef], { cwd: root }).trim();
  const head = git(['rev-parse', 'HEAD'], { cwd: root }).trim();

  const files = parseRaw(git(['diff', '--raw', '-z', '--no-renames', base], { cwd: root }));
  const added = addedLinesByFile(git(['diff', '-U0', '--no-color', '--no-renames', base], { cwd: root }));
  for (const f of files) if (!isEnvFile(f.path)) f.added = added.get(f.path) ?? [];

  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z'], { cwd: root }).split('\0').filter(Boolean);
  for (const path of untracked) {
    const f = { path, status: 'A', oldMode: '000000', newMode: '100644', untracked: true, added: [] };
    try {
      if (!isEnvFile(path) && statSync(join(root, path)).size <= MAX_UNTRACKED_BYTES) {
        const text = readFileSync(join(root, path), 'utf8');
        if (!text.includes('\0')) f.added = text.split('\n');
      }
    } catch { /* unreadable → no content signals */ }
    files.push(f);
  }

  const dirty = git(['status', '--porcelain'], { cwd: root }).trim().length > 0;
  if (dirty) warnings.push('Uncommitted changes are reviewed, but `git push` only sends commits — commit them before pushing.');

  return { base_ref: baseRef, base_sha: base, head_sha: head, tree_sha: worktreeTree(root), dirty, warnings, files };
}

if (isMain(import.meta.url)) {
  const i = process.argv.indexOf('--base');
  const diff = collect({ base: i > 0 ? process.argv[i + 1] : undefined });
  const out = join(stateDir(), 'diff.json');
  writeFileSync(out, JSON.stringify(diff, null, 2));
  const { files, ...meta } = diff;
  console.log(JSON.stringify({ ...meta, diff_json: out, files: files.map((f) => `${f.status} ${f.path}`) }, null, 2));
}
