import type { CSSProperties } from "react";
import type { DiffKind } from "../../helpers";

const KIND: Record<DiffKind, { color: string; bg: string; mark: string }> = {
  same: { color: "var(--text-secondary)", bg: "transparent", mark: " " },
  add: { color: "var(--ok)", bg: "var(--ok-bg)", mark: "+" },
  del: { color: "var(--crit)", bg: "var(--crit-bg)", mark: "−" },
};

/** Co-located styles for VersionDiff (the unfolded part of a version row). */
export const s = {
  panel: {
    borderTop: "1px solid var(--border)",
    padding: "18px 24px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  } satisfies CSSProperties,
  plain: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.65,
    color: "var(--text-primary)",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  } satisfies CSSProperties,
  label: { fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 } satisfies CSSProperties,
  box: { fontSize: 13, lineHeight: 1.65 } satisfies CSSProperties,
  line: (kind: DiffKind): CSSProperties => ({
    display: "flex",
    gap: 10,
    margin: "0 -8px",
    padding: "0 8px",
    borderRadius: 4,
    color: KIND[kind].color,
    background: KIND[kind].bg,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  }),
  mark: { width: 10, flexShrink: 0, userSelect: "none" } satisfies CSSProperties,
  same: { fontSize: 13, color: "var(--text-muted)" } satisfies CSSProperties,
} as const;

export const MARK = (kind: DiffKind) => KIND[kind].mark;
