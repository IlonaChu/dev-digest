import type { CSSProperties } from "react";

export const s = {
  row: { display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 } satisfies CSSProperties,
  label: { color: "var(--text-muted)" } satisfies CSSProperties,
  bar: { width: 140 } satisfies CSSProperties,
  pct: { fontWeight: 600, color: "var(--text-secondary)" } satisfies CSSProperties,
};
