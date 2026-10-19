import type { CSSProperties } from "react";

/** Co-located styles for VersionsTab. */
export const s = {
  wrap: { maxWidth: 1040 } satisfies CSSProperties,
  head: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 } satisfies CSSProperties,
  h2: { fontSize: 18, fontWeight: 700 } satisfies CSSProperties,
  hint: { fontSize: 14, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.45 } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 12 } satisfies CSSProperties,
  row: (current: boolean): CSSProperties => ({
    borderRadius: 10,
    border: "1px solid " + (current ? "var(--border-strong)" : "var(--border)"),
    background: "var(--bg-elevated)",
    overflow: "hidden",
  }),
  rowHead: { display: "flex", alignItems: "center", gap: 12, padding: "22px 24px" } satisfies CSSProperties,
  version: { fontSize: 15, fontWeight: 700, flexShrink: 0 } satisfies CSSProperties,
  current: { padding: 0, fontSize: 13 } satisfies CSSProperties,
  note: { fontSize: 13, color: "var(--text-secondary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } satisfies CSSProperties,
  actions: { marginLeft: "auto", display: "flex", gap: 8, flexShrink: 0 } satisfies CSSProperties,
  empty: { fontSize: 13, color: "var(--text-muted)" } satisfies CSSProperties,
} as const;
