// Records review verdicts and enforces them before push / PR. One script for every entry point:
//   node gate.mjs record <result.json>   write <state>/<tree>.json + latest.md (status derived from findings)
//   node gate.mjs check [<rev>]          exit 0 only if <rev>'s tree (default HEAD) has a PASS verdict
//   node gate.mjs --hook                 Claude Code PreToolUse (stdin JSON); exit 2 blocks the Bash call
//   node gate.mjs --pre-push             git pre-push hook (stdin: <local ref> <local sha> <remote ref> <remote sha>)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain, stateDir, treeOf, worktreeTree } from './lib.mjs';

const GUARDED_COMMAND = /(^|[;&|(\s])(git\s+(-C\s+\S+\s+)?push|gh\s+pr\s+(create|merge))\b/;
const ZERO_SHA = /^0+$/;
const SEVERITY_ORDER = ['CRITICAL', 'WARNING', 'SUGGESTION'];

// Quoted text (commit messages, echo, perl/sed scripts) is not a command — strip it so "git push" inside a
// string doesn't trip the gate. Trade-off: `bash -c "git push"` slips through; the git pre-push hook still catches it.
const QUOTED = /'[^']*'|"(?:[^"\\]|\\.)*"/g;
export const isGuardedCommand = (command = '') => GUARDED_COMMAND.test(command.replace(QUOTED, "''"));

export function statusOf(findings) {
  const criticals = findings.filter((f) => f.severity === 'CRITICAL').length;
  return { status: criticals > 0 ? 'BLOCK' : 'PASS', criticals };
}

/** Pure decision: is this tree allowed to leave the machine? */
export function evaluate(verdict, tree) {
  if (!verdict) return { ok: false, reason: `No /pr-self-review verdict for the current code (tree ${tree.slice(0, 10)}). Run /pr-self-review first.` };
  if (verdict.tree_sha !== tree) return { ok: false, reason: 'The code changed after the last review. Run /pr-self-review again.' };
  if (verdict.status !== 'PASS') {
    return { ok: false, reason: `/pr-self-review found ${verdict.criticals} CRITICAL finding(s). Fix them and re-run the review. Report: ${verdict.report ?? 'latest.md'}` };
  }
  return { ok: true, reason: 'PASS' };
}

export function readVerdict(tree, cwd) {
  const file = join(stateDir(cwd), `${tree}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

export function renderReport(v) {
  const rows = [...v.findings]
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    .map((f) => `| ${f.severity}${f.unverified ? ' (unverified)' : ''} | \`${f.file}:${f.line}\` | ${f.skill} | ${f.rule} | ${String(f.failure_scenario ?? f.evidence ?? '').replace(/\|/g, '\\|')} | ${String(f.fix ?? '').replace(/\|/g, '\\|')} |`);
  return [
    `# PR self-review — ${v.status === 'BLOCK' ? `BLOCKED — ${v.criticals} critical` : 'PASS'}`,
    '',
    `tree \`${v.tree_sha}\` · base \`${v.base_sha}\` · head \`${v.head_sha}\` · ${v.created_at}`,
    '',
    `Skills run: ${(v.skills_run ?? []).join(', ') || '—'}`,
    '',
    rows.length ? ['| Severity | Location | Skill | Rule | Why | Fix |', '|---|---|---|---|---|---|', ...rows].join('\n') : 'No findings.',
    '',
    `Not covered by any skill: ${(v.uncovered ?? []).join(', ') || '—'}`,
    ...(v.notes?.length ? ['', '## Notes', ...v.notes.map((n) => `- ${n}`)] : []),
    '',
  ].join('\n');
}

export function record(result, cwd) {
  const current = worktreeTree(cwd);
  if (result.tree_sha !== current) {
    throw new Error(`The code changed during the review (reviewed ${result.tree_sha}, now ${current}). Re-run /pr-self-review.`);
  }
  const dir = stateDir(cwd);
  const verdict = { ...result, ...statusOf(result.findings ?? []), findings: result.findings ?? [], created_at: new Date().toISOString(), report: join(dir, 'latest.md') };
  writeFileSync(join(dir, `${verdict.tree_sha}.json`), JSON.stringify(verdict, null, 2));
  writeFileSync(verdict.report, renderReport(verdict));
  return verdict;
}

function check(rev) {
  const tree = treeOf(rev);
  return evaluate(readVerdict(tree), tree);
}

async function stdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main(argv) {
  const [mode, arg] = argv;
  if (mode === 'record') {
    const v = record(JSON.parse(readFileSync(arg, 'utf8')));
    console.log(`${v.status === 'BLOCK' ? `BLOCKED — ${v.criticals} critical` : 'PASS'} · verdict ${v.tree_sha} · report ${v.report}`);
    return v.status === 'BLOCK' ? 1 : 0;
  }
  if (mode === 'check') {
    const r = check(arg ?? 'HEAD');
    (r.ok ? console.log : console.error)(r.reason);
    return r.ok ? 0 : 1;
  }
  if (mode === '--hook') {
    const input = JSON.parse((await stdin()) || '{}');
    if (!isGuardedCommand(input.tool_input?.command)) return 0;
    let r;
    try { r = check('HEAD'); } catch (err) { r = { ok: false, reason: err.message }; } // fail closed, guarded commands only
    if (!r.ok) console.error(`pr-self-review gate: ${r.reason}`);
    return r.ok ? 0 : 2;
  }
  if (mode === '--pre-push') {
    for (const line of (await stdin()).split('\n').filter(Boolean)) {
      const [localRef, localSha] = line.split(' ');
      if (ZERO_SHA.test(localSha)) continue; // branch deletion
      const r = check(localSha);
      if (!r.ok) {
        console.error(`pr-self-review gate blocked push of ${localRef}: ${r.reason}`);
        return 1;
      }
    }
    return 0;
  }
  console.error('Usage: gate.mjs record <result.json> | check [<rev>] | --hook | --pre-push');
  return 64;
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    // In --hook mode exit 1 is a non-blocking error, so a crash never blocks unrelated Bash calls.
    (err) => { console.error(`pr-self-review gate error: ${err.message}`); process.exit(1); },
  );
}
