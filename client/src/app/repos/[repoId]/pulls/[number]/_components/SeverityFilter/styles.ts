import type { CSSProperties } from "react";
import type { Severity } from "@devdigest/shared";

const PILL_COLOR: Record<Severity, string> = {
  CRITICAL: "var(--crit)",
  WARNING: "var(--warn)",
  SUGGESTION: "var(--sugg)",
};

/** Co-located styles for SeverityFilter. */
export const s = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 14,
  } satisfies CSSProperties,
  pills: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  pill: (level: Severity) => ({ color: PILL_COLOR[level] }) satisfies CSSProperties,
  dot: { color: "var(--text-muted)" } satisfies CSSProperties,
  bar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
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
} as const;
