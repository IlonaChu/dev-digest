import type { CSSProperties } from "react";

/** Co-located styles for RunCostBadge. */
export const s = {
  compact: (unknown: boolean): CSSProperties => ({
    fontSize: 13,
    color: unknown ? "var(--text-muted)" : "var(--text-secondary)",
    whiteSpace: "nowrap",
  }),
  withTokens: {
    fontSize: 11,
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,
} as const;
