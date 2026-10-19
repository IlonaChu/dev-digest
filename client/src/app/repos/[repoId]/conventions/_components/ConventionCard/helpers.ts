import type { ConventionRecord } from "@devdigest/shared";

/** `path:23-31`, or `path:23` for a one-line range. */
export function locationLabel(c: Pick<ConventionRecord, "evidence_path" | "evidence_start_line" | "evidence_end_line">): string {
  const { evidence_path: path, evidence_start_line: start, evidence_end_line: end } = c;
  return start === end ? `${path}:${start}` : `${path}:${start}-${end}`;
}
