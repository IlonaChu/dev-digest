import type { CSSProperties } from "react";

/** Co-located styles for one row of the agent's Skills list. */
export const s = {
  row: (dragging: boolean, dropTarget: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 8,
    border: "1px solid " + (dropTarget ? "var(--accent)" : "var(--border)"),
    background: "var(--bg-elevated)",
    opacity: dragging ? 0.45 : 1,
  }),
  grip: (draggable: boolean): CSSProperties => ({
    display: "inline-flex",
    padding: 0,
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: draggable ? "grab" : "default",
    visibility: draggable ? "visible" : "hidden",
  }),
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,
} as const;
