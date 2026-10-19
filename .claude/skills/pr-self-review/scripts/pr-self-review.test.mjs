// Run: node --test .claude/skills/pr-self-review/scripts/
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { collect, parseRaw } from './collect-diff.mjs';
import { evaluate, isGuardedCommand, readVerdict, record, statusOf } from './gate.mjs';
import { globToRegExp, treeOf } from './lib.mjs';
import { checkRepoRules } from './repo-rules.mjs';
import { route } from './route.mjs';

const routing = JSON.parse(readFileSync(join(dirname(dirname(fileURLToPath(import.meta.url))), 'routing.json'), 'utf8'));
const file = (path, added = [], extra = {}) => ({ path, status: 'M', oldMode: '100644', newMode: '100644', added, ...extra });

test('globToRegExp handles **, * and braces', () => {
  assert.ok(globToRegExp('client/src/**/*.{ts,tsx}').test('client/src/a/b/C.tsx'));
  assert.ok(globToRegExp('client/src/**/*.{ts,tsx}').test('client/src/x.ts'));
  assert.ok(!globToRegExp('server/src/modules/*/routes.ts').test('server/src/modules/a/b/routes.ts'));
  assert.ok(globToRegExp('**/tsconfig*.json').test('tsconfig.json'));
});

test('UI-only diff runs only UI skills', () => {
  const r = route({ files: [file('client/src/components/RunCostBadge/RunCostBadge.tsx')] }, routing);
  assert.deepEqual(Object.keys(r.groups), ['ui']);
  assert.ok(r.skills['react-best-practices'] && r.skills['frontend-architecture']);
  assert.equal(r.skills['onion-architecture'], undefined);
});

test('backend-only diff runs only backend (+ matching cross) skills', () => {
  const r = route({ files: [file('server/src/modules/pulls/routes.ts', ["import { db } from '../../db/client.js';"])] }, routing);
  assert.ok(r.skills['onion-architecture'] && r.skills['fastify-best-practices'] && r.skills.security);
  assert.equal(r.groups.ui, undefined);
});

test('content signals route files outside path globs; ignore/uncovered/unrouted work', () => {
  const r = route({
    files: [
      file('client/src/components/X/X.ts', ["'use client';"]),
      file('docs/agent-prompts/README.md'),
      file('server/pnpm-lock.yaml'),
      file('client/src/old.tsx', [], { status: 'D' }),
    ],
  }, routing, ['zod', 'brand-new-skill']);
  assert.deepEqual(r.skills['next-best-practices'].files, ['client/src/components/X/X.ts']);
  assert.deepEqual(r.uncovered, ['docs/agent-prompts/README.md']);
  assert.deepEqual(r.unrouted_skills, ['brand-new-skill']);
});

test('repo rules', () => {
  const rules = (files) => checkRepoRules({ files }).map((f) => `${f.rule}:${f.severity}`);
  assert.deepEqual(rules([file('server/src/db/migrations/0001_x.sql')]), ['migration-edited:CRITICAL']);
  assert.deepEqual(rules([file('server/src/db/migrations/0009_x.sql', [], { status: 'A' })]), ['migration-without-schema:WARNING']);
  assert.deepEqual(rules([file('server/src/db/migrations/0009_x.sql', [], { status: 'A' }), file('server/src/db/schema/core.ts')]), []);
  assert.deepEqual(rules([file('server/.env', [], { status: 'A' }), file('server/.env.example')]), ['env-file-committed:CRITICAL']);
  assert.deepEqual(rules([file('client/CLAUDE.md', [], { oldMode: '120000' })]), ['claude-md-symlink-replaced:WARNING']);
  assert.deepEqual(rules([file('server/src/vendor/shared/contracts/findings.ts')]), ['shared-contract-not-mirrored:WARNING']);
  assert.deepEqual(rules([file('client/pnpm-lock.yaml')]), ['lockfile-without-manifest:WARNING']);
});

test('parseRaw reads modes and status', () => {
  assert.deepEqual(parseRaw(':120000 100644 aaa bbb M\0CLAUDE.md\0'),
    [{ path: 'CLAUDE.md', status: 'M', oldMode: '120000', newMode: '100644', added: [] }]);
});

test('gate decisions', () => {
  assert.ok(isGuardedCommand('git push -u origin feature/x'));
  assert.ok(isGuardedCommand('cd /x && git -C repo push'));
  assert.ok(isGuardedCommand('gh pr create --fill'));
  assert.ok(!isGuardedCommand('git status && echo "push"'));
  assert.ok(!isGuardedCommand('git log --oneline'));
  assert.ok(!isGuardedCommand(`git commit -m "gate blocks git push"`));
  assert.ok(!isGuardedCommand(`perl -pi -e 's/x/blocks git push \\/ gh pr create/' AGENTS.md`));
  assert.ok(isGuardedCommand(`git commit -m "wip" && git push`));
  assert.deepEqual(statusOf([{ severity: 'WARNING' }, { severity: 'CRITICAL' }]), { status: 'BLOCK', criticals: 1 });
  assert.equal(evaluate(null, 't').ok, false);
  assert.equal(evaluate({ tree_sha: 'other', status: 'PASS' }, 't').ok, false);
  assert.equal(evaluate({ tree_sha: 't', status: 'BLOCK', criticals: 2 }, 't').ok, false);
  assert.equal(evaluate({ tree_sha: 't', status: 'PASS' }, 't').ok, true);
});

test('verdict survives commit of reviewed content and is invalidated by any edit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pr-self-review-'));
  const sh = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  try {
    sh('init', '-q', '-b', 'main');
    sh('config', 'user.email', 't@t'); sh('config', 'user.name', 't');
    writeFileSync(join(dir, 'a.ts'), 'export const a = 1;\n');
    sh('add', '.'); sh('commit', '-qm', 'base');
    sh('checkout', '-qb', 'feature');
    writeFileSync(join(dir, 'b.ts'), "import { z } from 'zod';\n"); // untracked, uncommitted

    const diff = collect({ cwd: dir, base: 'main' });
    assert.deepEqual(diff.files.map((f) => f.path), ['b.ts']);
    assert.equal(diff.dirty, true);
    record({ tree_sha: diff.tree_sha, base_sha: diff.base_sha, head_sha: diff.head_sha, findings: [] }, dir);

    sh('add', '.'); sh('commit', '-qm', 'feature');
    const tree = treeOf('HEAD', dir);
    assert.equal(tree, diff.tree_sha);
    assert.equal(evaluate(readVerdict(tree, dir), tree).ok, true);

    writeFileSync(join(dir, 'b.ts'), 'changed\n');
    sh('commit', '-qam', 'edit');
    const edited = treeOf('HEAD', dir);
    assert.equal(evaluate(readVerdict(edited, dir), edited).ok, false);
    assert.throws(() => record({ tree_sha: diff.tree_sha, findings: [] }, dir), /changed during the review/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
