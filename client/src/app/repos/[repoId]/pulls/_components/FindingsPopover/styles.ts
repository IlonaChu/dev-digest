import type { CSSProperties } from "react";
import { POPOVER_GAP, POPOVER_WIDTH } from "./constants";
import type { PopoverPosition } from "./helpers";

/** Co-located styles for FindingsPopover. */
export const s = {
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  } satisfies CSSProperties,
  // Bare icon + number with a dotted underline (design mock) — no pill background.
  count: (color: string): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 12,
    fontWeight: 600,
    color,
    // Dots are a background, not `text-decoration`: a text underline never paints under the SVG
    // icon and under one digit shrinks to 1–2 dots. 1px dot every 3px, in the severity color.
    backgroundImage: "linear-gradient(to right, currentColor 1px, transparent 1px)",
    backgroundSize: "3px 1px",
    backgroundRepeat: "repeat-x",
    backgroundPosition: "left bottom",
    paddingBottom: 3,
  }),
  none: { color: "var(--text-muted)" } satisfies CSSProperties,
  // Padding (not margin) bridges the gap to the trigger so the hover never drops.
  panelWrap: (pos: PopoverPosition): CSSProperties => ({
    position: "fixed",
    zIndex: 50,
    width: POPOVER_WIDTH,
    maxWidth: "calc(100vw - 24px)",
    padding: pos.top != null ? `${POPOVER_GAP}px 0 0` : `0 0 ${POPOVER_GAP}px`,
    ...pos,
  }),
  panel: {
    maxHeight: "60vh",
    overflowY: "auto",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--bg-elevated)",
    boxShadow: "0 8px 28px rgba(0,0,0,.28)",
    cursor: "default",
  } satisfies CSSProperties,
  title: {
    padding: "10px 14px",
    borderBottom: "1px solid var(--border)",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  } satisfies CSSProperties,
  // Per-agent section header (PR list): agent name · count, on a recessed band.
  sectionHead: {
    padding: "7px 14px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-surface)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  sectionEmpty: {
    padding: "8px 14px",
    borderBottom: "1px solid var(--border)",
    fontSize: 12,
    color: "var(--text-muted)",
  } satisfies CSSProperties,
  item: {
    padding: "10px 14px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  } satisfies CSSProperties,
  itemHead: { display: "flex", alignItems: "center", gap: 8 } satisfies CSSProperties,
  itemTitle: { fontSize: 13, fontWeight: 600, minWidth: 0 } satisfies CSSProperties,
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11.5,
    color: "var(--text-muted)",
    flexWrap: "wrap",
  } satisfies CSSProperties,
  rationale: {
    margin: 0,
    fontSize: 12.5,
    lineHeight: 1.45,
    color: "var(--text-secondary)",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  } satisfies CSSProperties,
} as const;
