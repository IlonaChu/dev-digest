export type DiffKind = "same" | "add" | "del";

export interface DiffLine {
  kind: DiffKind;
  text: string;
}

/** Cap on the LCS table (changed lines of one side × the other) — about 4 MB. Beyond it the
    diff is not computed: skill bodies may be up to ~1 MB (thousands of lines). */
export const MAX_DIFF_CELLS = 1_000_000;

/**
 * Line diff of two texts (longest-common-subsequence). Lines only in `from` are `del`,
 * lines only in `to` are `add`, shared lines are `same`, in reading order. The shared head
 * and tail are matched first, so the quadratic part only covers the changed middle; when
 * that middle is still bigger than `maxCells` the result is `null` (too large to diff).
 */
export function lineDiff(from: string, to: string, maxCells = MAX_DIFF_CELLS): DiffLine[] | null {
  const a = from.split("\n");
  const b = to.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const n = endA - start;
  const m = endB - start;
  if ((n + 1) * (m + 1) > maxCells) return null;

  // lcs[i * (m + 1) + j] = length of the LCS of a[start + i:endA] and b[start + j:endB]
  const w = m + 1;
  const lcs = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * w + j] =
        a[start + i] === b[start + j] ? lcs[(i + 1) * w + j + 1]! + 1 : Math.max(lcs[(i + 1) * w + j]!, lcs[i * w + j + 1]!);
    }
  }
  const out: DiffLine[] = a.slice(0, start).map((text) => ({ kind: "same" as const, text }));
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[start + i] === b[start + j]) {
      out.push({ kind: "same", text: a[start + i]! });
      i++;
      j++;
    } else if (lcs[(i + 1) * w + j]! >= lcs[i * w + j + 1]!) {
      out.push({ kind: "del", text: a[start + i++]! });
    } else {
      out.push({ kind: "add", text: b[start + j++]! });
    }
  }
  while (i < n) out.push({ kind: "del", text: a[start + i++]! });
  while (j < m) out.push({ kind: "add", text: b[start + j++]! });
  for (const text of a.slice(endA)) out.push({ kind: "same", text });
  return out;
}

/** True when the diff has no added or removed line. */
export function isIdentical(diff: DiffLine[]): boolean {
  return diff.every((l) => l.kind === "same");
}

/** `2026-05-30T10:00:00Z` → `2026-05-30` (locale-independent, matches the design). */
export function shortDate(iso: string): string {
  return iso.slice(0, 10);
}
