import { describe, expect, it } from "vitest";
import { acceptedConventions, confidenceColor, confidencePercent, locationLabel } from "./helpers";
import { convention } from "./fixtures";

describe("conventions helpers", () => {
  it("rounds and clamps confidence to a percentage", () => {
    expect(confidencePercent(0.914)).toBe(91);
    expect(confidencePercent(1.4)).toBe(100);
    expect(confidencePercent(-1)).toBe(0);
  });

  it("draws confidence green from 80% and amber below", () => {
    expect(confidenceColor(0.8)).toBe("var(--ok)");
    expect(confidenceColor(0.78)).toBe("var(--warn)");
  });

  it("formats a line range, and a single line without a dash", () => {
    expect(locationLabel(convention())).toBe("src/api/users.ts:23-31");
    expect(locationLabel(convention({ evidence_start_line: 5, evidence_end_line: 5 }))).toBe("src/api/users.ts:5");
  });

  it("keeps only accepted conventions", () => {
    const items = [convention({ id: "a", status: "accepted" }), convention({ id: "b", status: "rejected" }), convention({ id: "c" })];
    expect(acceptedConventions(items).map((c) => c.id)).toEqual(["a"]);
  });
});
