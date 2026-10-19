import type { ConventionRecord } from "@devdigest/shared";

/** Confidence at or above this is drawn green, below it amber. */
export const HIGH_CONFIDENCE = 0.8;

export function confidencePercent(confidence: number): number {
  return Math.round(Math.max(0, Math.min(1, confidence)) * 100);
}

export function confidenceColor(confidence: number): string {
  return confidence >= HIGH_CONFIDENCE ? "var(--ok)" : "var(--warn)";
}

/** `path:23-31`, or `path:23` for a one-line range. */
export function locationLabel(c: Pick<ConventionRecord, "evidence_path" | "evidence_start_line" | "evidence_end_line">): string {
  const { evidence_path: path, evidence_start_line: start, evidence_end_line: end } = c;
  return start === end ? `${path}:${start}` : `${path}:${start}-${end}`;
}

export function acceptedConventions(items: ConventionRecord[]): ConventionRecord[] {
  return items.filter((c) => c.status === "accepted");
}
