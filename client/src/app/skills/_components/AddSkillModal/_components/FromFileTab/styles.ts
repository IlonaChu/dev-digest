import type { CSSProperties } from "react";

/** Co-located styles for the From file tab of AddSkillModal. */
export const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 } satisfies CSSProperties,
  intro: { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 } satisfies CSSProperties,
  drop: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "36px 20px",
    border: "1px dashed var(--border-strong)",
    borderRadius: 10,
    background: "var(--bg-elevated)",
    cursor: "pointer",
    textAlign: "center",
    position: "relative",
  } satisfies CSSProperties,
  dropTitle: { fontSize: 14, fontWeight: 600 } satisfies CSSProperties,
  dropHint: { fontSize: 12, color: "var(--text-muted)" } satisfies CSSProperties,
  /** Invisible but still in the tab order (unlike display:none); the drop zone draws its
      focus ring via `.dd-file-drop` in globals.css. */
  visuallyHiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
    opacity: 0,
  } satisfies CSSProperties,
  error: { fontSize: 13, color: "var(--crit)" } satisfies CSSProperties,
} as const;
