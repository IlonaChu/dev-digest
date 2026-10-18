/**
 * Onion Architecture guard (skill: .claude/skills/onion-architecture). Runs the
 * dependency-cruiser rules in `.dependency-cruiser.cjs` — the same command as
 * `pnpm arch:check` — so a NEW layering violation fails `pnpm test`; legacy ones
 * are listed in `.dependency-cruiser-known-violations.json`. Hermetic: static
 * analysis of src/ only, no network or DB.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEPCRUISE = join(ROOT, 'node_modules/dependency-cruiser/bin/dependency-cruise.mjs');

/** The only places allowed to read the environment: config, adapters (secrets, git subprocess env) and CLI scripts. */
const ENV_ALLOWED = /^src\/(platform\/config\.ts|adapters\/|db\/(seed|migrate)\.ts$)/;

function sourceFiles(): string[] {
  return readdirSync(join(ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts'))
    .map((f) => `src/${f.split(sep).join('/')}`);
}

/** Code lines only — a comment that mentions process.env is not a read. */
function codeLines(file: string): string[] {
  return readFileSync(join(ROOT, file), 'utf8')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line));
}

describe('onion architecture', () => {
  it('adds no layering violation beyond the legacy baseline (pnpm arch:check)', () => {
    const run = spawnSync(
      process.execPath,
      [DEPCRUISE, 'src', '--config', '.dependency-cruiser.cjs', '--ignore-known', '--output-type', 'err'],
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(run.status, `${run.stdout}${run.stderr}`).toBe(0);
  });

  it('reads process.env only in config, adapters and CLI scripts', () => {
    const offenders = sourceFiles()
      .filter((f) => !ENV_ALLOWED.test(f))
      .filter((f) => codeLines(f).some((line) => /\bprocess\.env\b/.test(line)));
    expect(offenders).toEqual([]);
  });
});
