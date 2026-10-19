import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import type { ConventionCategory, ConventionStatus } from '@devdigest/shared';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

/**
 * Conventions data-access. Owns `conventions` and `convention_scans`;
 * workspace-scoped throughout, and a scan's rows are written in one transaction.
 */
export type ConventionRow = typeof t.conventions.$inferSelect;
export type ConventionScanRow = typeof t.conventionScans.$inferSelect;

/** A verified candidate ready to be stored. */
export interface VerifiedCandidate {
  category: ConventionCategory;
  rule: string;
  ruleKey: string;
  evidencePath: string;
  evidenceStartLine: number;
  evidenceEndLine: number;
  evidenceSnippet: string;
  confidence: number;
}

export interface ScanValues {
  sampleCount: number;
  found: number;
  dropped: number;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  /** null = unknown cost; never coerced to 0. */
  costUsd: number | null;
}

export interface ConventionPatch {
  status?: ConventionStatus;
  rule?: string;
}

export class ConventionsRepository {
  constructor(private db: Db) {}

  /** The candidates shown to the user: everything except rejected rules (those stay stored for re-scans). */
  async listForRepo(workspaceId: string, repoId: string): Promise<ConventionRow[]> {
    return this.db
      .select()
      .from(t.conventions)
      .where(
        and(
          eq(t.conventions.workspaceId, workspaceId),
          eq(t.conventions.repoId, repoId),
          ne(t.conventions.status, 'rejected'),
        ),
      )
      .orderBy(desc(t.conventions.confidence), t.conventions.evidencePath);
  }

  async latestScan(workspaceId: string, repoId: string): Promise<ConventionScanRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.conventionScans)
      .where(and(eq(t.conventionScans.workspaceId, workspaceId), eq(t.conventionScans.repoId, repoId)))
      .orderBy(desc(t.conventionScans.createdAt))
      .limit(1);
    return row;
  }

  async getMany(workspaceId: string, repoId: string, ids: string[]): Promise<ConventionRow[]> {
    if (ids.length === 0) return [];
    return this.db
      .select()
      .from(t.conventions)
      .where(
        and(
          eq(t.conventions.workspaceId, workspaceId),
          eq(t.conventions.repoId, repoId),
          inArray(t.conventions.id, ids),
        ),
      )
      .orderBy(desc(t.conventions.confidence), t.conventions.evidencePath);
  }

  /**
   * Store one scan. A candidate that matches a stored rule (same evidence path
   * and rule key) refreshes its evidence but keeps the user's status and edited
   * text; a new one starts `pending`. Undecided rules that were not found again
   * are dropped.
   */
  async saveScan(
    workspaceId: string,
    repoId: string,
    scan: ScanValues,
    candidates: VerifiedCandidate[],
  ): Promise<ConventionScanRow> {
    return this.db.transaction(async (tx) => {
      const [scanRow] = await tx
        .insert(t.conventionScans)
        .values({ workspaceId, repoId, ...scan })
        .returning();

      const existing = await tx
        .select()
        .from(t.conventions)
        .where(and(eq(t.conventions.workspaceId, workspaceId), eq(t.conventions.repoId, repoId)));
      const byIdentity = new Map(existing.map((r) => [`${r.evidencePath}\u0000${r.ruleKey}`, r]));
      const seen = new Set<string>();

      for (const c of candidates) {
        const identity = `${c.evidencePath}\u0000${c.ruleKey}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        const prev = byIdentity.get(identity);
        if (prev) {
          await tx
            .update(t.conventions)
            .set({
              scanId: scanRow!.id,
              category: c.category,
              evidenceStartLine: c.evidenceStartLine,
              evidenceEndLine: c.evidenceEndLine,
              evidenceSnippet: c.evidenceSnippet,
              confidence: c.confidence,
              ...(prev.edited ? {} : { rule: c.rule }),
              updatedAt: new Date(),
            })
            .where(eq(t.conventions.id, prev.id));
        } else {
          await tx.insert(t.conventions).values({
            workspaceId,
            repoId,
            scanId: scanRow!.id,
            category: c.category,
            rule: c.rule,
            ruleKey: c.ruleKey,
            evidencePath: c.evidencePath,
            evidenceStartLine: c.evidenceStartLine,
            evidenceEndLine: c.evidenceEndLine,
            evidenceSnippet: c.evidenceSnippet,
            confidence: c.confidence,
          });
        }
      }

      const stale = existing
        .filter((r) => r.status === 'pending' && !r.edited)
        .filter((r) => !seen.has(`${r.evidencePath}\u0000${r.ruleKey}`))
        .map((r) => r.id);
      if (stale.length > 0) {
        await tx.delete(t.conventions).where(inArray(t.conventions.id, stale));
      }
      return scanRow!;
    });
  }

  /** Change one row's status and/or rule text (an edited rule keeps its key). */
  async patch(
    workspaceId: string,
    id: string,
    patch: ConventionPatch,
  ): Promise<ConventionRow | undefined> {
    const [row] = await this.db
      .update(t.conventions)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.rule !== undefined ? { rule: patch.rule, edited: true } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(t.conventions.workspaceId, workspaceId), eq(t.conventions.id, id)))
      .returning();
    return row;
  }

  /** Move every NOT-rejected rule of a repo to `status` (select all / deselect all). */
  async setStatusForUndecided(
    workspaceId: string,
    repoId: string,
    status: Exclude<ConventionStatus, 'rejected'>,
  ): Promise<void> {
    await this.db
      .update(t.conventions)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(t.conventions.workspaceId, workspaceId),
          eq(t.conventions.repoId, repoId),
          ne(t.conventions.status, 'rejected'),
        ),
      );
  }
}
