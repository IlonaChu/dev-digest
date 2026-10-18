import type { CSSProperties } from "react";
import type { DiffKind } from "../../helpers";

const KIND: Record<DiffKind, { color: string; bg: string; mark: string }> = {
  same: { color: "var(--text-secondary)", bg: "transparent", mark: " " },
  add: { color: "var(--ok)", bg: "var(--ok-bg)", mark: "+" },
  del: { color: "var(--crit)", bg: "var(--crit-bg)", mark: "−" },
};

/** Co-located styles for DiffModal. */
export const s = {
  body: { padding: 20, display: "flex", flexDirection: "column", gap: 14 } satisfies CSSProperties,
  label: { fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 } satisfies CSSProperties,
  box: {
    border: "1px solid var(--border)",
    borderRadius: 8,
    overflow: "auto",
    maxHeight: "55vh",
    background: "var(--bg-primary)",
    fontSize: 12.5,
    lineHeight: 1.55,
  } satisfies CSSProperties,
  line: (kind: DiffKind): CSSProperties => ({
    display: "flex",
    gap: 10,
    padding: "0 12px",
    color: KIND[kind].color,
    background: KIND[kind].bg,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  }),
  mark: { width: 10, flexShrink: 0, userSelect: "none" } satisfies CSSProperties,
  same: { fontSize: 13, color: "var(--text-muted)" } satisfies CSSProperties,
} as const;

export const MARK = (kind: DiffKind) => KIND[kind].mark;
