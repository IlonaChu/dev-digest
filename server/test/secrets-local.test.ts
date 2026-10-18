/**
 * LocalSecretsProvider — a malformed secrets file must never be "repaired" by a
 * write that silently drops the keys it already holds.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalSecretsProvider } from '../src/adapters/secrets/local.js';
import { AppError } from '../src/platform/errors.js';

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dd-secrets-'));
  file = join(dir, 'secrets.json');
});
afterEach(() => rm(dir, { recursive: true, force: true }));

const provider = (env: NodeJS.ProcessEnv = {}) => new LocalSecretsProvider(file, env);

describe('LocalSecretsProvider', () => {
  it('treats a missing file as empty, falls back to env, and creates the file on set', async () => {
    const p = provider({ OPENAI_API_KEY: 'from-env' });
    expect(await p.get('OPENAI_API_KEY')).toBe('from-env');
    await p.set('ANTHROPIC_API_KEY', 'sk-ant');
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ ANTHROPIC_API_KEY: 'sk-ant' });
  });

  it('merges a new key into the existing ones', async () => {
    await writeFile(file, JSON.stringify({ OPENAI_API_KEY: 'sk-1' }));
    await provider().set('GITHUB_TOKEN', 'ghp_1');
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ OPENAI_API_KEY: 'sk-1', GITHUB_TOKEN: 'ghp_1' });
  });

  it('serves the string entries of a file with a non-string value but refuses to overwrite it', async () => {
    const original = JSON.stringify({ OPENAI_API_KEY: 'sk-1', GITHUB_TOKEN: 'ghp_1', BROKEN: null });
    await writeFile(file, original);
    const p = provider();
    expect(await p.get('OPENAI_API_KEY')).toBe('sk-1');
    await expect(p.set('ANTHROPIC_API_KEY', 'sk-ant')).rejects.toMatchObject({
      code: 'secrets_file_invalid',
      statusCode: 409,
    });
    expect(await readFile(file, 'utf8')).toBe(original);
  });

  it('refuses to overwrite a file that is not valid JSON', async () => {
    await writeFile(file, '{ "OPENAI_API_KEY": "sk-1",');
    const p = provider({ OPENAI_API_KEY: 'from-env' });
    expect(await p.get('OPENAI_API_KEY')).toBe('from-env');
    await expect(p.set('OPENAI_API_KEY', 'sk-2')).rejects.toBeInstanceOf(AppError);
    expect(await readFile(file, 'utf8')).toBe('{ "OPENAI_API_KEY": "sk-1",');
  });

  it('reads GITHUB_PAT as the legacy fallback for GITHUB_TOKEN', async () => {
    expect(await provider({ GITHUB_PAT: 'ghp_legacy' }).get('GITHUB_TOKEN')).toBe('ghp_legacy');
  });
});
