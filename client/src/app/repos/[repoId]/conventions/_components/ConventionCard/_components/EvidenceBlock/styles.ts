import type { CSSProperties } from "react";

export const s = {
  box: {
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--bg-base)",
    overflow: "hidden",
  } satisfies CSSProperties,
  head: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 8px 7px 14px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-surface)",
  } satisfies CSSProperties,
  location: { flex: 1, fontSize: 12.5, color: "var(--text-secondary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } satisfies CSSProperties,
  code: {
    margin: 0,
    padding: "12px 14px",
    fontSize: 12.5,
    lineHeight: 1.6,
    overflowX: "auto",
    whiteSpace: "pre",
  } satisfies CSSProperties,
};
