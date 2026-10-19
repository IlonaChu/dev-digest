// Deterministic checks of the repo rules in AGENTS.md ("Do not touch", copied contracts, symlinks).
// Usage: node repo-rules.mjs [path/to/diff.json]   → JSON array of findings
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { isMain, stateDir } from './lib.mjs';

const MIGRATION_SQL = /^server\/src\/db\/migrations\/[^/]+\.sql$/;
const SCHEMA = /^server\/src\/db\/schema(\.ts|\/)/;

const finding = (rule, severity, file, evidence, fix) =>
  ({ source: 'repo-rules', skill: 'repo-rules', rule, severity, file, line: 1, evidence, failure_scenario: evidence, fix });

export function checkRepoRules(diff) {
  const out = [];
  const paths = new Set(diff.files.map((f) => f.path));
  const touched = (re) => diff.files.some((f) => re.test(f.path));

  for (const f of diff.files) {
    const name = basename(f.path);
    if (MIGRATION_SQL.test(f.path) && (f.status === 'M' || f.status === 'D')) {
      out.push(finding('migration-edited', 'CRITICAL', f.path,
        'An existing generated migration was edited or deleted; databases that already applied it silently diverge.',
        'Revert it and change `server/src/db/schema*`, then run `pnpm db:generate` for a new migration.'));
    }
    if (MIGRATION_SQL.test(f.path) && f.status === 'A' && !touched(SCHEMA)) {
      out.push(finding('migration-without-schema', 'WARNING', f.path,
        'A new migration was added without any change to `server/src/db/schema*` — looks hand-written.',
        'Change the Drizzle schema and generate the migration with `pnpm db:generate`.'));
    }
    if (/^\.env/.test(name) && name !== '.env.example' && f.status !== 'D') {
      out.push(finding('env-file-committed', 'CRITICAL', f.path,
        'A `.env*` file is part of the change; it holds secrets and must never reach the remote.',
        `Remove it from git (\`git rm --cached ${f.path}\`) and rotate any secret it contained.`));
    }
    if (f.path.startsWith('server/clones/')) {
      out.push(finding('clones-committed', 'CRITICAL', f.path,
        '`server/clones/` holds repos cloned by the app (other copies of dev-digest), not our code.',
        `Remove it from the change (\`git rm -r --cached server/clones\`).`));
    }
    if (name === 'CLAUDE.md' && f.oldMode === '120000' && f.newMode !== '120000') {
      out.push(finding('claude-md-symlink-replaced', 'WARNING', f.path,
        '`CLAUDE.md` must stay a symlink to `AGENTS.md`; it was replaced by a regular file.',
        `Edit AGENTS.md instead and restore the link: \`ln -sf AGENTS.md ${f.path}\`.`));
    }
    if (name === 'pnpm-lock.yaml' && f.status !== 'D' && !paths.has(join(dirname(f.path), 'package.json'))) {
      out.push(finding('lockfile-without-manifest', 'WARNING', f.path,
        'The lockfile changed but the package.json next to it did not — likely a manual or accidental edit.',
        'Revert it, or regenerate it with `pnpm install` inside that package.'));
    }
  }

  const serverShared = diff.files.filter((f) => f.path.startsWith('server/src/vendor/shared/'));
  if (serverShared.length > 0 && !touched(/^client\/src\/vendor\/shared\//)) {
    out.push(finding('shared-contract-not-mirrored', 'WARNING', serverShared[0].path,
      '`server/src/vendor/shared` (canonical) changed but `client/src/vendor/shared` did not.',
      'Mirror the contract change into `client/src/vendor/shared` (the copies already diverge — merge by hand).'));
  }
  return out;
}

if (isMain(import.meta.url)) {
  const diff = JSON.parse(readFileSync(process.argv[2] ?? join(stateDir(), 'diff.json'), 'utf8'));
  console.log(JSON.stringify(checkRepoRules(diff), null, 2));
}
