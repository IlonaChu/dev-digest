import type { CSSProperties } from "react";

/** Co-located styles for PreviewTab. */
export const s = {
  wrap: { maxWidth: 860, display: "flex", flexDirection: "column", gap: 26 } satisfies CSSProperties,
  label: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: 8,
  } satisfies CSSProperties,
  hint: { fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.45 } satisfies CSSProperties,
  rendered: {
    padding: "14px 18px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--bg-elevated)",
    fontSize: 14,
  } satisfies CSSProperties,
  injected: {
    margin: 0,
    padding: "14px 18px",
    border: "1px solid var(--border-strong)",
    borderRadius: 8,
    background: "var(--bg-primary)",
    fontSize: 12.5,
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  } satisfies CSSProperties,
  empty: { fontSize: 13, color: "var(--text-muted)" } satisfies CSSProperties,
} as const;
