import { describe, it, expect } from "vitest";
import { formatCost, formatTokenCount } from "./cost";

describe("formatCost", () => {
  it("no data renders an em dash, never $0.00", () => {
    expect(formatCost(null)).toBe("—");
    expect(formatCost(undefined)).toBe("—");
    expect(formatCost(Number.NaN)).toBe("—");
  });

  it("a real zero renders $0.00", () => {
    expect(formatCost(0)).toBe("$0.00");
  });

  it("uses 3 decimals from one cent up", () => {
    expect(formatCost(0.014)).toBe("$0.014");
    expect(formatCost(0.01)).toBe("$0.010");
    expect(formatCost(0.06)).toBe("$0.060");
    expect(formatCost(1.2346)).toBe("$1.235");
  });

  it("uses 2 significant digits below one cent", () => {
    expect(formatCost(0.0013)).toBe("$0.0013");
    expect(formatCost(0.003)).toBe("$0.0030");
    expect(formatCost(0.00012927)).toBe("$0.00013");
    expect(formatCost(0.000012)).toBe("$0.000012");
    expect(formatCost(0.00001)).toBe("$0.000010");
  });

  it("per-run costs and their PR sum round alike (two $0.0001 runs no longer sum to $0.0003)", () => {
    expect(formatCost(0.0001292704)).toBe("$0.00013");
    expect(formatCost(0.0001335824)).toBe("$0.00013");
    expect(formatCost(0.0001292704 + 0.0001335824)).toBe("$0.00026");
  });

  it("does not collapse a tiny positive cost into zero", () => {
    expect(formatCost(0.0000001)).toBe("<$0.000001");
  });
});

describe("formatTokenCount", () => {
  it("groups thousands with a space", () => {
    expect(formatTokenCount(9119)).toBe("9 119");
    expect(formatTokenCount(1234567)).toBe("1 234 567");
    expect(formatTokenCount(42)).toBe("42");
  });

  it("null renders an em dash", () => {
    expect(formatTokenCount(null)).toBe("—");
  });
});
