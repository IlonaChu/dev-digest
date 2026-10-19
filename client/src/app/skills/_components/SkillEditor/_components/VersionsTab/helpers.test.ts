import { describe, it, expect } from "vitest";
import { isIdentical, lineDiff, shortDate } from "./helpers";

describe("lineDiff", () => {
  it("marks identical text as all same", () => {
    const d = lineDiff("a\nb", "a\nb")!;
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
    const d = lineDiff("x\nold\ny", "x\nnew\ny")!;
    expect(d.map((l) => l.kind)).toEqual(["same", "del", "add", "same"]);
    expect(d[1]!.text).toBe("old");
    expect(d[2]!.text).toBe("new");
    expect(isIdentical(d)).toBe(false);
  });

  it("handles an empty side", () => {
    expect(lineDiff("", "a")!.map((l) => l.kind)).toEqual(["del", "add"]);
  });

  it("keeps both orderings of the same lines distinct", () => {
    const d = lineDiff("a\nb", "b\na")!;
    expect(d.filter((l) => l.kind === "same")).toHaveLength(1);
  });

  it("keeps a long shared head and tail as same lines around the change", () => {
    const head = Array.from({ length: 500 }, (_, i) => `h${i}`).join("\n");
    const tail = Array.from({ length: 500 }, (_, i) => `t${i}`).join("\n");
    const d = lineDiff(`${head}\nold\n${tail}`, `${head}\nnew\n${tail}`)!;
    expect(d).toHaveLength(1002);
    expect(d.filter((l) => l.kind !== "same")).toEqual([
      { kind: "del", text: "old" },
      { kind: "add", text: "new" },
    ]);
    expect(d[0]).toEqual({ kind: "same", text: "h0" });
    expect(d.at(-1)).toEqual({ kind: "same", text: "t499" });
  });

  it("diffs huge texts whose change is small (only the middle is compared)", () => {
    const big = Array.from({ length: 20_000 }, (_, i) => `line ${i}`).join("\n");
    const d = lineDiff(big, `${big}\nextra`)!;
    expect(d.filter((l) => l.kind === "add")).toEqual([{ kind: "add", text: "extra" }]);
  });

  it("returns null when the changed middle is too large to diff", () => {
    const a = Array.from({ length: 50 }, (_, i) => `a${i}`).join("\n");
    const b = Array.from({ length: 50 }, (_, i) => `b${i}`).join("\n");
    expect(lineDiff(a, b, 100)).toBeNull();
    expect(lineDiff(a, b, 51 * 51)).not.toBeNull();
  });
});

describe("shortDate", () => {
  it("keeps the date part of an ISO timestamp", () => {
    expect(shortDate("2026-05-30T10:00:00.000Z")).toBe("2026-05-30");
  });
});
