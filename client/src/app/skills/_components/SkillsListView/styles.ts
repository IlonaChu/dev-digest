import type { CSSProperties } from "react";

/** Co-located styles for SkillsListView (list column + placeholder pane, like the editor). */
export const s = {
  root: { display: "flex", height: "calc(100vh - 52px)" } satisfies CSSProperties,
  main: { flex: 1, minWidth: 0, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column" } satisfies CSSProperties,
  placeholder: { flex: 1, display: "grid", placeItems: "center" } satisfies CSSProperties,
} as const;
