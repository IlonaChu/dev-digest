import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { SkillSource, SkillType, SkillVetting } from '@devdigest/shared';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';
import type { SkillRow, SkillVersionRow } from '../../db/rows.js';
import { AppError } from '../../platform/errors.js';
import { INITIAL_SKILL_VERSION } from './constants.js';

/**
 * Skills data-access. Owns `skills` and `skill_versions`; the `agent_skills`
 * link table belongs to the agents module (we only COUNT it for the cards).
 * Workspace-scoped throughout; every multi-row write is one transaction.
 */
export type { SkillRow, SkillVersionRow };

export interface InsertSkill {
  workspaceId: string;
  name: string;
  description: string;
  type: SkillType;
  source: SkillSource;
  body: string;
  enabled: boolean;
  vetting?: SkillVetting | null;
  /** Files the skill was derived from (extracted skills). */
  evidenceFiles?: string[] | null;
}

export interface UpdateSkill {
  name?: string;
  description?: string;
  type?: SkillType;
  body?: string;
  enabled?: boolean;
  /** Optional note stored on the new version (only used when content changes). */
  message?: string;
}

export interface SkillWithCount {
  row: SkillRow;
  agentCount: number;
}

export class SkillsRepository {
  constructor(private db: Db) {}

  async list(workspaceId: string): Promise<SkillWithCount[]> {
    const rows = await this.db
      .select({ skill: t.skills, agentCount: sql<number>`count(${t.agentSkills.agentId})::int` })
      .from(t.skills)
      .leftJoin(t.agentSkills, eq(t.agentSkills.skillId, t.skills.id))
      .where(eq(t.skills.workspaceId, workspaceId))
      .groupBy(t.skills.id)
      .orderBy(asc(t.skills.name));
    return rows.map((r) => ({ row: r.skill, agentCount: r.agentCount }));
  }

  async getById(workspaceId: string, id: string): Promise<SkillRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)));
    return row;
  }

  async agentCount(skillId: string): Promise<number> {
    const [r] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(t.agentSkills)
      .where(eq(t.agentSkills.skillId, skillId));
    return r?.n ?? 0;
  }

  async findByName(workspaceId: string, name: string): Promise<SkillRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.name, name)));
    return row;
  }

  /** Insert a skill AND its version-1 snapshot atomically. */
  async insert(values: InsertSkill): Promise<SkillRow> {
    return this.guardNameClash(() =>
      this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(t.skills)
          .values({
            workspaceId: values.workspaceId,
            name: values.name,
            description: values.description,
            type: values.type,
            source: values.source,
            body: values.body,
            enabled: values.enabled,
            version: INITIAL_SKILL_VERSION,
            vetting: values.vetting ?? null,
            evidenceFiles: values.evidenceFiles ?? null,
          })
          .returning();
        await tx.insert(t.skillVersions).values({
          skillId: row!.id,
          version: INITIAL_SKILL_VERSION,
          body: values.body,
          description: values.description,
          message: null,
        });
        return row!;
      }),
    );
  }

  /**
   * Update a skill. A change to body or description bumps the version and
   * snapshots it (with the optional note); name/type/enabled never do.
   */
  async update(workspaceId: string, id: string, patch: UpdateSkill): Promise<SkillRow | undefined> {
    return this.guardNameClash(() =>
      this.db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(t.skills)
          .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)))
          .for('update');
        if (!existing) return undefined;

        const bodyChanged = patch.body !== undefined && patch.body !== existing.body;
        const descChanged = patch.description !== undefined && patch.description !== existing.description;
        const bump = bodyChanged || descChanged;
        const nextVersion = bump ? existing.version + 1 : existing.version;
        const body = patch.body ?? existing.body;
        const description = patch.description ?? existing.description;

        const [row] = await tx
          .update(t.skills)
          .set({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.type !== undefined ? { type: patch.type } : {}),
            ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
            ...(bump ? { body, description, version: nextVersion } : {}),
          })
          .where(eq(t.skills.id, id))
          .returning();

        if (bump) {
          await tx.insert(t.skillVersions).values({
            skillId: id,
            version: nextVersion,
            body,
            description,
            message: patch.message?.trim() || null,
          });
        }
        return row;
      }),
    );
  }

  /** Newest first. Caller has already verified the skill belongs to the workspace. */
  async listVersions(skillId: string): Promise<SkillVersionRow[]> {
    return this.db
      .select()
      .from(t.skillVersions)
      .where(eq(t.skillVersions.skillId, skillId))
      .orderBy(desc(t.skillVersions.version));
  }

  /**
   * Restore vK as a NEW version carrying vK's content (history is append-only).
   * Undefined when the skill or that version does not exist.
   */
  async restore(workspaceId: string, id: string, version: number): Promise<SkillRow | undefined> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(t.skills)
        .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)))
        .for('update');
      if (!existing) return undefined;
      const [snap] = await tx
        .select()
        .from(t.skillVersions)
        .where(and(eq(t.skillVersions.skillId, id), eq(t.skillVersions.version, version)));
      if (!snap) return undefined;

      const nextVersion = existing.version + 1;
      const [row] = await tx
        .update(t.skills)
        .set({ body: snap.body, description: snap.description, version: nextVersion })
        .where(eq(t.skills.id, id))
        .returning();
      await tx.insert(t.skillVersions).values({
        skillId: id,
        version: nextVersion,
        body: snap.body,
        description: snap.description,
        message: `Restored from v${version}`,
      });
      return row;
    });
  }

  /** Store a vetting result; `disable` forces `enabled = false` in the same write. */
  async setVetting(
    workspaceId: string,
    id: string,
    vetting: SkillVetting,
    opts: { enabled?: boolean } = {},
  ): Promise<SkillRow | undefined> {
    const [row] = await this.db
      .update(t.skills)
      .set({ vetting, ...(opts.enabled !== undefined ? { enabled: opts.enabled } : {}) })
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)))
      .returning();
    return row;
  }

  /** Delete a skill (versions and agent links cascade). False if it wasn't there. */
  async deleteById(workspaceId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)))
      .returning({ id: t.skills.id });
    return rows.length > 0;
  }

  /** Map the unique (workspace, name) violation to a 409 the UI can show. */
  private async guardNameClash<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const e = err as { code?: string; cause?: { code?: string } };
      if ((e.code ?? e.cause?.code) === '23505') {
        throw new AppError('skill_name_taken', 'A skill with this name already exists', 409);
      }
      throw err;
    }
  }
}
