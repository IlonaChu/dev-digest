/* Severity group-by shared by the PR list (FindingsPopover) and the PR detail
   (SeverityFilter, FindingsPanel). Keyed on the Zod `Severity` (3 levels), never the
   UI token type, so `INFO` can't leak into counters. */
import type { FindingRecord, Severity } from "@devdigest/shared";

/** Levels shown in filters and counters, most severe first. */
export const SEVERITY_LEVELS: readonly Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];

export type SeverityCounts = Record<Severity, number>;

/** Findings per severity across the given list — a plain group-by, no LLM call. */
export function countBySeverity(findings: readonly Pick<FindingRecord, "severity">[]): SeverityCounts {
  const counts = Object.fromEntries(SEVERITY_LEVELS.map((l) => [l, 0])) as SeverityCounts;
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}
