import type { CSSProperties } from "react";

/** Co-located styles for the Import from URL tab of AddSkillModal. */
export const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 4 } satisfies CSSProperties,
  error: { fontSize: 13, color: "var(--crit)", marginBottom: 14 } satisfies CSSProperties,
} as const;
