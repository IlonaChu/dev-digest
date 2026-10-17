import type { CSSProperties } from "react";

/** Co-located styles for SeverityFilter. */
export const s = {
  bar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  } satisfies CSSProperties,
  button: (active: boolean, disabled: boolean) =>
    ({
      display: "inline-flex",
      padding: 2,
      borderRadius: 7,
      background: "none",
      border: `1px solid ${active ? "var(--accent)" : "transparent"}`,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
    }) satisfies CSSProperties,
  clear: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    color: "var(--text-muted)",
    textDecoration: "underline",
  } satisfies CSSProperties,
} as const;
