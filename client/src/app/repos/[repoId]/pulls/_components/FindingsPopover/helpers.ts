import type { PrAgentFindings, PrFindingPreview } from "@devdigest/shared";
import { POPOVER_GAP, POPOVER_WIDTH, VIEWPORT_MARGIN } from "./constants";

/** Every finding of every agent section, in section order — the cell's counts and aria-label. */
export function flattenGroups(groups: readonly Pick<PrAgentFindings, "findings">[]): PrFindingPreview[] {
  return groups.flatMap((g) => g.findings);
}

const SEVERITY_RANK: Record<PrFindingPreview["severity"], number> = {
  CRITICAL: 0,
  WARNING: 1,
  SUGGESTION: 2,
};

/** Most severe first, then most confident first; does not mutate the input. */
export function sortPreviews(findings: readonly PrFindingPreview[]): PrFindingPreview[] {
  return [...findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.confidence - a.confidence,
  );
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function formatLocation(f: Pick<PrFindingPreview, "file" | "start_line" | "end_line">): string {
  return f.end_line > f.start_line ? `${f.file}:${f.start_line}-${f.end_line}` : `${f.file}:${f.start_line}`;
}

export interface PopoverPosition {
  left: number;
  top?: number;
  bottom?: number;
}

/**
 * Fixed-position coordinates for the popover (the table card clips overflow, so it
 * cannot be absolutely positioned inside it). Opens below the trigger, or above it
 * when the trigger sits in the lower half of the viewport.
 */
export function popoverPosition(
  rect: Pick<DOMRect, "left" | "top" | "bottom">,
  viewport: { width: number; height: number },
): PopoverPosition {
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rect.left, viewport.width - POPOVER_WIDTH - VIEWPORT_MARGIN),
  );
  return rect.bottom > viewport.height / 2
    ? { left, bottom: viewport.height - rect.top - POPOVER_GAP }
    : { left, top: rect.bottom + POPOVER_GAP };
}
