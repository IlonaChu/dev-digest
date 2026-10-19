import type { ConventionRecord } from "@devdigest/shared";

/** Shared test fixtures for the Conventions page tests. */
export function convention(over: Partial<ConventionRecord> = {}): ConventionRecord {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    repo_id: "00000000-0000-4000-8000-0000000000aa",
    category: "async",
    rule: "Always use async/await instead of .then() chains",
    evidence_path: "src/api/users.ts",
    evidence_start_line: 23,
    evidence_end_line: 31,
    evidence_snippet: "const user = await db.users.find(id);",
    confidence: 0.91,
    status: "pending",
    edited: false,
    ...over,
  };
}
