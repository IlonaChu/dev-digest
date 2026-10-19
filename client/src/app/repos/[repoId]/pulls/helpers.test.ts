import { describe, it, expect } from "vitest";
import type { PrMeta } from "./constants";
import { filterPulls, pullCounts } from "./helpers";

const pr = (number: number, status: string, title: string, updated_at: string | null): PrMeta =>
  ({ number, status, title, updated_at, additions: 0, deletions: 0 }) as PrMeta;

const PULLS = [
  pr(1, "needs_review", "Add login", "2026-01-02T00:00:00Z"),
  pr(2, "reviewed", "Fix logout", "2026-01-03T00:00:00Z"),
  pr(3, "merged", "Bump deps", "2026-01-01T00:00:00Z"),
  pr(14, "needs_review", "Refactor", null),
];

const numbers = (list: PrMeta[]) => list.map((p) => p.number);

describe("filterPulls", () => {
  it("keeps every status for 'all', newest first, unknown dates last", () => {
    expect(numbers(filterPulls(PULLS, { status: "all", query: "", sort: "newest" }))).toEqual([2, 1, 3, 14]);
  });

  it("filters by status chip", () => {
    expect(numbers(filterPulls(PULLS, { status: "needs_review", query: "", sort: "newest" }))).toEqual([1, 14]);
  });

  it("matches the query case-insensitively against title or number", () => {
    expect(numbers(filterPulls(PULLS, { status: "all", query: "  LOG ", sort: "newest" }))).toEqual([2, 1]);
    expect(numbers(filterPulls(PULLS, { status: "all", query: "14", sort: "newest" }))).toEqual([14]);
  });

  it("sorts oldest first and does not mutate the input", () => {
    const input = [...PULLS];
    expect(numbers(filterPulls(input, { status: "all", query: "", sort: "oldest" }))).toEqual([14, 3, 1, 2]);
    expect(input).toEqual(PULLS);
  });
});

describe("pullCounts", () => {
  it("counts open (derived review statuses) and needs-review PRs", () => {
    expect(pullCounts(PULLS)).toEqual({ open: 3, needsReview: 2 });
  });
});
