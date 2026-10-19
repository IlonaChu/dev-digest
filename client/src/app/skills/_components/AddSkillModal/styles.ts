import type { CSSProperties } from "react";

/** Co-located styles for AddSkillModal (pill tabs under the title + the tab body). */
export const s = {
  tabs: {
    display: "flex",
    gap: 4,
    marginTop: 14,
    paddingBottom: 12,
    borderBottom: "1px solid var(--border)",
  } satisfies CSSProperties,
  tab: {
    padding: "5px 12px",
    borderRadius: 7,
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: 13.5,
    fontWeight: 600,
    lineHeight: 1.4,
    cursor: "pointer",
  } satisfies CSSProperties,
  tabActive: { background: "var(--accent-bg)", color: "var(--accent-text)" } satisfies CSSProperties,
  body: { padding: "20px 24px 24px" } satisfies CSSProperties,
} as const;
