import type { CSSProperties } from "react";

export const s = {
  bar: { display: "flex", alignItems: "center", gap: 14, marginBottom: 16 } satisfies CSSProperties,
  count: { fontSize: 13.5, color: "var(--text-secondary)" } satisfies CSSProperties,
  spacer: { flex: 1 } satisfies CSSProperties,
};
