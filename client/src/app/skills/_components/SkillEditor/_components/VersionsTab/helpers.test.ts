import { describe, it, expect } from "vitest";
import { isIdentical, lineDiff, shortDate } from "./helpers";

describe("lineDiff", () => {
  it("marks identical text as all same", () => {
    const d = lineDiff("a\nb", "a\nb");
    expect(d).toEqual([
      { kind: "same", text: "a" },
      { kind: "same", text: "b" },
    ]);
    expect(isIdentical(d)).toBe(true);
  });

  it("reports an added line", () => {
    expect(lineDiff("a\nc", "a\nb\nc")).toEqual([
      { kind: "same", text: "a" },
      { kind: "add", text: "b" },
      { kind: "same", text: "c" },
    ]);
  });

  it("reports a removed line", () => {
    expect(lineDiff("a\nb\nc", "a\nc")).toEqual([
      { kind: "same", text: "a" },
      { kind: "del", text: "b" },
      { kind: "same", text: "c" },
    ]);
  });

  it("reports a changed line as a removal followed by an addition", () => {
    const d = lineDiff("x\nold\ny", "x\nnew\ny");
    expect(d.map((l) => l.kind)).toEqual(["same", "del", "add", "same"]);
    expect(d[1]!.text).toBe("old");
    expect(d[2]!.text).toBe("new");
    expect(isIdentical(d)).toBe(false);
  });

  it("handles an empty side", () => {
    expect(lineDiff("", "a").map((l) => l.kind)).toEqual(["del", "add"]);
  });

  it("keeps both orderings of the same lines distinct", () => {
    const d = lineDiff("a\nb", "b\na");
    expect(d.filter((l) => l.kind === "same")).toHaveLength(1);
  });
});

describe("shortDate", () => {
  it("keeps the date part of an ISO timestamp", () => {
    expect(shortDate("2026-05-30T10:00:00.000Z")).toBe("2026-05-30");
  });
});
