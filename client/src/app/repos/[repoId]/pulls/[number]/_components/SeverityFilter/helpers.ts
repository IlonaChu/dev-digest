import type { FindingRecord, Severity } from "@devdigest/shared";
import { SEVERITY_LEVELS } from "./constants";

export type SeverityCounts = Record<Severity, number>;

/**
 * Findings per severity across the given list — a plain group-by on the findings
 * already loaded, no LLM call. Type-only import of `@devdigest/shared` on purpose:
 * a runtime import pulls `vendor/shared/index.ts`, whose `./contracts/*.js`
 * re-exports webpack cannot resolve.
 */
export function countBySeverity(findings: readonly Pick<FindingRecord, "severity">[]): SeverityCounts {
  const counts = Object.fromEntries(SEVERITY_LEVELS.map((l) => [l, 0])) as SeverityCounts;
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}
