import type { CSSProperties } from "react";

/** Co-located styles for SkillWorkspace (list column + editor, like the agent editor). */
export const s = {
  root: { display: "flex", height: "calc(100vh - 52px)" } satisfies CSSProperties,
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 } satisfies CSSProperties,
  header: { display: "flex", alignItems: "center", gap: 12, padding: "16px 28px 0", flexShrink: 0 } satisfies CSSProperties,
  icon: { color: "var(--accent)" } satisfies CSSProperties,
  title: { fontSize: 18, fontWeight: 700 } satisfies CSSProperties,
  spacer: { marginLeft: "auto" } satisfies CSSProperties,
  content: { flex: 1, minHeight: 0, overflow: "auto" } satisfies CSSProperties,
  loading: { flex: 1, padding: 28, display: "flex", flexDirection: "column", gap: 16 } satisfies CSSProperties,
} as const;
