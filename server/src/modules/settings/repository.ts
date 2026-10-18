import { eq } from 'drizzle-orm';
import type { Settings } from '@devdigest/shared';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';
import { rowsToSettings } from './helpers.js';

/** Non-secret workspace prefs stored as key/value rows in `settings`. */
export class SettingsRepository {
  constructor(private db: Db) {}

  async get(workspaceId: string): Promise<Settings> {
    const rows = await this.db
      .select({ key: t.settings.key, value: t.settings.value })
      .from(t.settings)
      .where(eq(t.settings.workspaceId, workspaceId));
    return rowsToSettings(rows);
  }

  /** Upsert every entry atomically, then return the merged settings. */
  async upsertMany(workspaceId: string, userId: string, entries: Record<string, unknown>): Promise<Settings> {
    await this.db.transaction(async (tx) => {
      for (const [key, value] of Object.entries(entries)) {
        await tx
          .insert(t.settings)
          .values({ workspaceId, userId, key, value })
          .onConflictDoUpdate({
            target: [t.settings.workspaceId, t.settings.userId, t.settings.key],
            set: { value },
          });
      }
    });
    return this.get(workspaceId);
  }
}
