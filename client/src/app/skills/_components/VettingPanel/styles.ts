import type { CSSProperties } from "react";

/** Co-located styles for VettingPanel. */
export const s = {
  wrap: (blocked: boolean): CSSProperties => ({
    border: "1px solid " + (blocked ? "var(--border-strong)" : "var(--border)"),
    borderRadius: 8,
    background: "var(--bg-elevated)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  }),
  head: { display: "flex", alignItems: "center", gap: 10 } satisfies CSSProperties,
  title: { fontSize: 13, fontWeight: 600, flex: 1 } satisfies CSSProperties,
  summary: { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 } satisfies CSSProperties,
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  list: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 } satisfies CSSProperties,
  finding: { fontSize: 13, lineHeight: 1.4 } satisfies CSSProperties,
  rule: { fontWeight: 600, marginRight: 6 } satisfies CSSProperties,
  line: { fontSize: 12, color: "var(--text-muted)", marginLeft: 6 } satisfies CSSProperties,
  excerpt: {
    display: "block",
    marginTop: 3,
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 5,
    background: "var(--bg-hover)",
    color: "var(--text-secondary)",
    overflowWrap: "anywhere",
  } satisfies CSSProperties,
  muted: { fontSize: 13, color: "var(--text-muted)" } satisfies CSSProperties,
} as const;
