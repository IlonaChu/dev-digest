import { describe, expect, it } from "vitest";
import { convention } from "../../fixtures";
import { locationLabel } from "./helpers";

describe("locationLabel", () => {
  it("formats a line range, and a single line without a dash", () => {
    expect(locationLabel(convention())).toBe("src/api/users.ts:23-31");
    expect(locationLabel(convention({ evidence_start_line: 5, evidence_end_line: 5 }))).toBe("src/api/users.ts:5");
  });
});
