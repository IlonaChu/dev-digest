import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  doublePrecision,
  integer,
  boolean,
  vector,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { now } from './_shared';
import { workspaces } from './core';
import { repos } from './repos';

// ============================================================ Knowledge / RAG

export const memory = pgTable(
  'memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    repoId: uuid('repo_id').references(() => repos.id, { onDelete: 'cascade' }),
    scope: text('scope', { enum: ['repo', 'global', 'team'] }).notNull(),
    kind: text('kind', {
      enum: ['decision', 'convention', 'preference', 'fact', 'learning'],
    }).notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    confidence: doublePrecision('confidence'),
    sources: jsonb('sources'),
    createdAt: now(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (t) => ({ wsIdx: index('memory_ws_idx').on(t.workspaceId) }),
);

/**
 * One run of the conventions extractor over a repo. Kept so the UI can show
 * "detected from N files · last scan …" and so the (nullable) model cost is not lost.
 */
export const conventionScans = pgTable(
  'convention_scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    sampleCount: integer('sample_count').notNull(),
    found: integer('found').notNull(),
    dropped: integer('dropped').notNull(),
    model: text('model').notNull(),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    /** null = unknown (unpriced model), 0 = free; never coerce. */
    costUsd: doublePrecision('cost_usd'),
    createdAt: now(),
  },
  (t) => ({
    repoIdx: index('convention_scans_repo_idx').on(t.repoId, t.createdAt),
    // FK lookups when a workspace is deleted (cascade).
    workspaceIdx: index('convention_scans_workspace_idx').on(t.workspaceId),
  }),
);

/** A rule found in the repo plus the evidence the server verified for it. */
export const conventions = pgTable(
  'conventions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    scanId: uuid('scan_id').references(() => conventionScans.id, { onDelete: 'set null' }),
    category: text('category').notNull().default('other'),
    rule: text('rule').notNull(),
    /** Normalised rule text; with the evidence path it identifies a rule across re-scans. */
    ruleKey: text('rule_key').notNull(),
    evidencePath: text('evidence_path').notNull(),
    evidenceStartLine: integer('evidence_start_line').notNull(),
    evidenceEndLine: integer('evidence_end_line').notNull(),
    evidenceSnippet: text('evidence_snippet').notNull(),
    confidence: doublePrecision('confidence').notNull(),
    status: text('status', { enum: ['pending', 'accepted', 'rejected'] })
      .notNull()
      .default('pending'),
    edited: boolean('edited').notNull().default(false),
    createdAt: now(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // Its leading `repo_id` also serves every per-repo read, so no separate repo index.
    ruleUq: uniqueIndex('conventions_repo_rule_uq').on(t.repoId, t.evidencePath, t.ruleKey),
    // FK lookups when a scan is deleted (`scan_id` is set null).
    scanIdx: index('conventions_scan_idx').on(t.scanId),
    statusCheck: check('conventions_status_check', sql`${t.status} in ('pending','accepted','rejected')`),
  }),
);
