import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import type { SecretsProvider, SecretKey } from '@devdigest/shared';
import { AppError } from '../../platform/errors.js';

const StoredSecrets = z.record(z.string(), z.unknown());

interface Loaded {
  values: Record<string, string>;
  /** The file exists but isn't a JSON object of strings — writing it back would drop entries. */
  invalid: boolean;
}

/**
 * LocalSecretsProvider — writable MVP secrets backend.
 *
 * Reads stored overrides from a JSON file on disk (BYO keys entered via the
 * UI), falling back to process.env when a key has not been set. Writes persist
 * to the same file (mode 0600) so keys survive restarts. GITHUB_TOKEN is the
 * canonical key; GITHUB_PAT is still read as a fallback for back-compat.
 *
 * Stored values take precedence over env so a key entered in the UI wins.
 * Only a missing file counts as "no stored keys": an unreadable or malformed
 * file still serves its string entries but refuses writes.
 * Swap for a VaultSecretsProvider later without touching call sites.
 */
export class LocalSecretsProvider implements SecretsProvider {
  private cache: Loaded | null = null;

  constructor(
    private readonly filePath: string,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  private async load(): Promise<Loaded> {
    if (this.cache) return this.cache;
    this.cache = await this.read();
    return this.cache;
  }

  private async read(): Promise<Loaded> {
    let text: string;
    try {
      text = await readFile(this.filePath, 'utf8');
    } catch (err) {
      const missing = (err as NodeJS.ErrnoException).code === 'ENOENT';
      return { values: {}, invalid: !missing };
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { values: {}, invalid: true };
    }
    const parsed = StoredSecrets.safeParse(json);
    if (!parsed.success) return { values: {}, invalid: true };
    const values: Record<string, string> = {};
    let invalid = false;
    for (const [key, value] of Object.entries(parsed.data)) {
      if (typeof value === 'string') values[key] = value;
      else invalid = true;
    }
    return { values, invalid };
  }

  async get(key: SecretKey): Promise<string | undefined> {
    const stored = (await this.load()).values[key as string];
    if (stored) return stored;
    if (key === 'GITHUB_TOKEN') return this.env.GITHUB_TOKEN ?? this.env.GITHUB_PAT;
    return this.env[key as string];
  }

  async set(key: SecretKey, value: string): Promise<void> {
    const loaded = await this.load();
    if (loaded.invalid) {
      throw new AppError(
        'secrets_file_invalid',
        `Refusing to overwrite ${this.filePath}: it is not a JSON object of string values. Fix or remove the file, then save the key again.`,
        409,
      );
    }
    loaded.values[key as string] = value;
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(loaded.values, null, 2)}\n`, { mode: 0o600 });
  }
}
