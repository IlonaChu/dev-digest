import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { ConventionCategory, ConventionRecord, ConventionScan, ConventionStatus } from '@devdigest/shared';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

/**
 * Conventions data-access. Owns `conventions` and `convention_scans`;
 * workspace-scoped throughout, and a scan's rows are written in one transaction.
 * Returns the `ConventionRecord` / `ConventionScan` contracts — rows never leave this file.
 */
type ConventionRow = typeof t.conventions.$inferSelect;
type ConventionScanRow = typeof t.conventionScans.$inferSelect;

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
  async listForRepo(workspaceId: string, repoId: string): Promise<ConventionRecord[]> {
    const rows = await this.db
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
    return rows.map(toConventionRecord);
  }

  async latestScan(workspaceId: string, repoId: string): Promise<ConventionScan | undefined> {
    const [row] = await this.db
      .select()
      .from(t.conventionScans)
      .where(and(eq(t.conventionScans.workspaceId, workspaceId), eq(t.conventionScans.repoId, repoId)))
      .orderBy(desc(t.conventionScans.createdAt))
      .limit(1);
    return row ? toConventionScan(row) : undefined;
  }

  async getMany(workspaceId: string, repoId: string, ids: string[]): Promise<ConventionRecord[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
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
    return rows.map(toConventionRecord);
  }

  /**
   * Store one scan. A candidate that matches a stored rule (same evidence path
   * and rule key) refreshes its evidence but keeps the user's status and edited
   * text; a new one starts `pending`. Undecided rules that were not found again
   * are dropped. Scans of one repo run one at a time (transaction-scoped advisory
   * lock): two overlapping extracts would both miss each other's new rows and the
   * second would fail on the unique (repo, path, rule key) index.
   */
  async saveScan(
    workspaceId: string,
    repoId: string,
    scan: ScanValues,
    candidates: VerifiedCandidate[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`conventions:${repoId}`}, 0))`);
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
    });
  }

  /** Change one row's status and/or rule text (an edited rule keeps its key). */
  async patch(
    workspaceId: string,
    id: string,
    patch: ConventionPatch,
  ): Promise<ConventionRecord | undefined> {
    const [row] = await this.db
      .update(t.conventions)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.rule !== undefined ? { rule: patch.rule, edited: true } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(t.conventions.workspaceId, workspaceId), eq(t.conventions.id, id)))
      .returning();
    return row ? toConventionRecord(row) : undefined;
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

function toConventionRecord(row: ConventionRow): ConventionRecord {
  return {
    id: row.id,
    repo_id: row.repoId,
    category: row.category as ConventionRecord['category'],
    rule: row.rule,
    evidence_path: row.evidencePath,
    evidence_start_line: row.evidenceStartLine,
    evidence_end_line: row.evidenceEndLine,
    evidence_snippet: row.evidenceSnippet,
    confidence: row.confidence,
    status: row.status,
    edited: row.edited,
  };
}

function toConventionScan(row: ConventionScanRow): ConventionScan {
  return {
    id: row.id,
    sample_count: row.sampleCount,
    found: row.found,
    dropped: row.dropped,
    model: row.model,
    created_at: row.createdAt.toISOString(),
  };
}
