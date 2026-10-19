import type { CSSProperties } from "react";

/** Co-located styles for SkillCard. */
export const s = {
  card: (active: boolean, enabled: boolean): CSSProperties => ({
    padding: "12px 12px 10px",
    borderRadius: 8,
    cursor: "pointer",
    border: "1px solid " + (active ? "var(--border-strong)" : "var(--border)"),
    background: active ? "var(--bg-hover)" : "var(--bg-elevated)",
    opacity: enabled ? 1 : 0.6,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  }),
  headerRow: { display: "flex", alignItems: "center", gap: 8 } satisfies CSSProperties,
  name: {
    fontSize: 14,
    fontWeight: 600,
    flex: 1,
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  } satisfies CSSProperties,
  toggle: { display: "inline-flex", flexShrink: 0 } satisfies CSSProperties,
  deleteBtn: (pending: boolean): CSSProperties => ({
    background: "none",
    border: "none",
    padding: 4,
    display: "inline-flex",
    flexShrink: 0,
    color: "var(--text-muted)",
    cursor: pending ? "not-allowed" : "pointer",
    opacity: pending ? 0.5 : 1,
  }),
  toggleBlocked: { opacity: 0.4, display: "inline-flex" } satisfies CSSProperties,
  description: {
    fontSize: 13,
    color: "var(--text-muted)",
    lineHeight: 1.4,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  } satisfies CSSProperties,
  meta: { fontSize: 12, color: "var(--text-muted)" } satisfies CSSProperties,
  footerRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 } satisfies CSSProperties,
} as const;
