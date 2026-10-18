import {
  OPEN_STATUSES,
  SIZE_MEDIUM_MAX,
  SIZE_SMALL_MAX,
  type PrMeta,
  type PullSort,
  type SizeInfo,
} from "./constants";

/** Status chip + free-text match (title or #number) + updated_at order — what the list renders. */
export function filterPulls(
  pulls: readonly PrMeta[],
  { status, query, sort }: { status: string; query: string; sort: PullSort },
): PrMeta[] {
  const q = query.trim().toLowerCase();
  const updated = (p: PrMeta) => Date.parse(p.updated_at ?? "") || 0;
  return pulls
    .filter((p) => status === "all" || p.status === status)
    .filter((p) => !q || p.title.toLowerCase().includes(q) || String(p.number).includes(q))
    .sort((a, b) => (sort === "oldest" ? updated(a) - updated(b) : updated(b) - updated(a)));
}

/** Header counters: open PRs (derived review status) and how many of them need review. */
export function pullCounts(pulls: readonly PrMeta[]): { open: number; needsReview: number } {
  return {
    open: pulls.filter((p) => OPEN_STATUSES.has(p.status)).length,
    needsReview: pulls.filter((p) => p.status === "needs_review").length,
  };
}

/** Bucket a PR into S/M/L by total changed lines. */
export function sizeOf(pr: PrMeta): SizeInfo {
  const lines = pr.additions + pr.deletions;
  const size = lines < SIZE_SMALL_MAX ? "S" : lines < SIZE_MEDIUM_MAX ? "M" : "L";
  return { size, lines };
}

/** Compact relative time for the list's UPDATED column (e.g. "3h", "2d"). */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const m = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
