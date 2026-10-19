import type { CSSProperties } from "react";

/** Co-located styles for the skill ConfigTab. */
export const s = {
  wrap: { maxWidth: 860 } satisfies CSSProperties,
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" } satisfies CSSProperties,
  h2: { fontSize: 18, fontWeight: 700 } satisfies CSSProperties,
  version: { marginLeft: 0 } satisfies CSSProperties,
  enabledLabel: {
    marginLeft: "auto",
    marginRight: 6,
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  blockedNote: { fontSize: 12, color: "var(--warn)", marginBottom: 14, textAlign: "right" } satisfies CSSProperties,
  vetting: { marginBottom: 20 } satisfies CSSProperties,
  savedNote: { fontSize: 13, color: "var(--ok)", whiteSpace: "nowrap" } satisfies CSSProperties,
} as const;
