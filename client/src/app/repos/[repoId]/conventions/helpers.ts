import type { ConventionRecord } from "@devdigest/shared";

export function acceptedConventions(items: ConventionRecord[]): ConventionRecord[] {
  return items.filter((c) => c.status === "accepted");
}
