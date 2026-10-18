import type { CSSProperties } from "react";

/** Co-located styles for the agent's Skills tab. */
export const s = {
  wrap: { maxWidth: 960 } satisfies CSSProperties,
  head: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 } satisfies CSSProperties,
  h2: { fontSize: 20, fontWeight: 700 } satisfies CSSProperties,
  hint: { fontSize: 14, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.45 } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
  filter: {
    marginLeft: "auto",
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "7px 12px",
    fontSize: 13,
    color: "var(--text-primary)",
    outline: "none",
    width: 220,
  } satisfies CSSProperties,
  muted: { fontSize: 13, color: "var(--text-muted)", marginBottom: 12 } satisfies CSSProperties,
} as const;
