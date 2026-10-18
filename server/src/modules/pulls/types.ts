import type { PrCommit, PrFile } from '@devdigest/shared';

/** A persisted pull request as the pulls module works with it (no Drizzle row shape). */
export interface PullRecord {
  id: string;
  repoId: string;
  number: number;
  title: string;
  author: string;
  branch: string;
  base: string;
  headSha: string;
  lastReviewedSha: string | null;
  additions: number;
  deletions: number;
  filesCount: number;
  /** GitHub merge state (open/merged/closed) — the review status is derived on read. */
  status: string;
  body: string | null;
  openedAt: Date | null;
  updatedAt: Date | null;
}

export interface RepoRefRecord {
  id: string;
  owner: string;
  name: string;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  filesCount: number;
}

export interface PersistedDetail {
  files: PrFile[];
  commits: PrCommit[];
}
