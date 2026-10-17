import type { FindingRecord, Severity } from "@devdigest/shared";
import { SEVERITY_LEVELS } from "./constants";

export type SeverityCounts = Record<Severity, number>;

/** Findings per severity across the given list (dismissed ones included — they stay visible in the lists). */
export function countBySeverity(findings: readonly Pick<FindingRecord, "severity">[]): SeverityCounts {
  const counts = Object.fromEntries(SEVERITY_LEVELS.map((l) => [l, 0])) as SeverityCounts;
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}

/**
 * Parse the `?severity=` param; anything that is not a known level means "no filter".
 * Type-only import of `@devdigest/shared` on purpose: a runtime import pulls
 * `vendor/shared/index.ts`, whose `./contracts/*.js` re-exports webpack cannot resolve.
 */
export function parseSeverity(raw: string | null | undefined): Severity | null {
  return SEVERITY_LEVELS.find((level) => level === raw) ?? null;
}
