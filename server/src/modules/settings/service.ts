import type {
  ConnTestProvider,
  ConnTestResult,
  SecretsStatus,
  Settings,
  SettingsUpdate,
} from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { GITHUB_PROVIDER, SECRET_KEY_BY_PROVIDER } from './constants.js';
import { SettingsRepository } from './repository.js';

/** Workspace prefs, secret presence and provider connection tests. */
export class SettingsService {
  private repo: SettingsRepository;

  constructor(private container: Container) {
    this.repo = new SettingsRepository(container.db);
  }

  get(workspaceId: string): Promise<Settings> {
    return this.repo.get(workspaceId);
  }

  update(workspaceId: string, userId: string, patch: SettingsUpdate): Promise<Settings> {
    return this.repo.upsertMany(workspaceId, userId, patch);
  }

  /** Which provider keys are configured — booleans only, never the values. */
  async secretsStatus(): Promise<SecretsStatus> {
    const entries = await Promise.all(
      (Object.entries(SECRET_KEY_BY_PROVIDER) as [keyof SecretsStatus, string][]).map(
        async ([provider, key]) => [provider, Boolean(await this.container.secrets.get(key))] as const,
      ),
    );
    return Object.fromEntries(entries) as SecretsStatus;
  }

  /**
   * Persist a UI-supplied key first (BYO key) so the test reflects — and the rest
   * of the app uses — the new value, then do one cheap live call.
   */
  async testConnection(provider: ConnTestProvider, key?: string): Promise<ConnTestResult> {
    const { container } = this;
    try {
      if (key) {
        if (!container.secrets.set) {
          return { provider, ok: false, message: 'Secrets backend is read-only' };
        }
        await container.secrets.set(SECRET_KEY_BY_PROVIDER[provider], key);
        container.invalidateSecretCaches();
      }
      if (provider === GITHUB_PROVIDER) {
        const login = await (await container.github()).currentLogin();
        return { provider, ok: true, message: `Connected as @${login}` };
      }
      const models = await (await container.llm(provider)).listModels();
      return { provider, ok: true, message: `OK — ${models.length} models available` };
    } catch (err) {
      return { provider, ok: false, message: (err as Error).message };
    }
  }
}
