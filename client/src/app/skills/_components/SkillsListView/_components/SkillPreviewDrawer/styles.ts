import type { CSSProperties } from "react";

/** Co-located styles for SkillPreviewDrawer. */
export const s = {
  titleRow: { display: "flex", alignItems: "center", gap: 10 } satisfies CSSProperties,
  meta: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 } satisfies CSSProperties,
  metaText: { fontSize: 12, color: "var(--text-muted)" } satisfies CSSProperties,
  vetting: { marginBottom: 18 } satisfies CSSProperties,
  body: { fontSize: 14 } satisfies CSSProperties,
  footer: { display: "flex", justifyContent: "flex-end", gap: 10 } satisfies CSSProperties,
} as const;
