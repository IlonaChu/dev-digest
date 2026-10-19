import type { CSSProperties } from "react";

/** Co-located styles for the Conventions page. */
export const s = {
  /** Left-aligned like the other lab pages (Skills list), not centered; width matches the reference layout. */
  content: { maxWidth: 904, padding: "32px 32px 64px" } satisfies CSSProperties, // 840 of content + 2×32 padding (border-box)
  pageHeader: { display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 } satisfies CSSProperties,
  titleWrap: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  pageTitle: { fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 } satisfies CSSProperties,
  repoName: { color: "var(--accent-text)" } satisfies CSSProperties,
  pageSubtitle: { margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" } satisfies CSSProperties,
  note: { margin: "6px 0 0", fontSize: 12.5, color: "var(--text-muted)" } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 14 } satisfies CSSProperties,
  notice: {
    padding: "14px 16px",
    marginBottom: 16,
    borderRadius: 8,
    border: "1px solid var(--warn)",
    background: "var(--warn-bg)",
    fontSize: 13.5,
    lineHeight: 1.5,
  } satisfies CSSProperties,
  noticeTitle: { fontWeight: 600, marginBottom: 2 } satisfies CSSProperties,
};
