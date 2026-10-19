import type { CSSProperties } from "react";

export const s = {
  body: { padding: 24, display: "flex", flexDirection: "column", gap: 4 } satisfies CSSProperties,
  banner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    marginBottom: 18,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--accent-bg, var(--bg-surface))",
    fontSize: 13.5,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  bannerStrong: { color: "var(--text-primary)", fontWeight: 600 } satisfies CSSProperties,
  bannerRepo: { color: "var(--accent-text)" } satisfies CSSProperties,
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" } satisfies CSSProperties,
  toggleWrap: { display: "flex", flexDirection: "column", alignItems: "flex-start" } satisfies CSSProperties,
  error: { fontSize: 12.5, color: "var(--crit)", marginTop: 6 } satisfies CSSProperties,
  footer: { display: "flex", alignItems: "center", gap: 10, width: "100%" } satisfies CSSProperties,
  savedAs: { flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-muted)" } satisfies CSSProperties,
};
