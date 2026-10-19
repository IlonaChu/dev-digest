import { describe, expect, it } from "vitest";
import { confidenceColor, confidencePercent } from "./helpers";

describe("confidence helpers", () => {
  it("rounds and clamps confidence to a percentage", () => {
    expect(confidencePercent(0.914)).toBe(91);
    expect(confidencePercent(1.4)).toBe(100);
    expect(confidencePercent(-1)).toBe(0);
  });

  it("draws confidence green from 80% and amber below", () => {
    expect(confidenceColor(0.8)).toBe("var(--ok)");
    expect(confidenceColor(0.78)).toBe("var(--warn)");
  });
});
