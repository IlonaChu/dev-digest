/* FindingsPopover — FINDINGS cell of a PR list row (and of each PR-timeline run row): severity
   icons with counts; hovering them opens a read-only "N FINDINGS IN THIS RUN" preview of that
   run's findings. Counts are a plain group-by on the findings already loaded — no model call. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, SEV, SeverityBadge } from "@devdigest/ui";
import type { PrFindingPreview } from "@devdigest/shared";
import { countBySeverity, SEVERITY_LEVELS } from "../../[number]/_components/SeverityFilter";
import { formatConfidence, formatLocation, popoverPosition, sortPreviews } from "./helpers";
import type { PopoverPosition } from "./helpers";
import { s } from "./styles";

export function FindingsPopover({
  findings,
  ariaLabel,
}: {
  findings: readonly PrFindingPreview[] | null | undefined;
  /** Overrides the default "N findings in the latest run" (e.g. timeline rows of older runs). */
  ariaLabel?: string;
}) {
  const t = useTranslations("prReview");
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = React.useState<PopoverPosition | null>(null);

  const list = findings ?? [];
  if (list.length === 0) return <span style={s.none}>—</span>;

  const counts = countBySeverity(list);
  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos(popoverPosition(rect, { width: window.innerWidth, height: window.innerHeight }));
  };
  const close = () => setPos(null);

  return (
    <span
      ref={triggerRef}
      style={s.trigger}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
      tabIndex={0}
      aria-label={ariaLabel ?? t("list.findings.ariaLabel", { count: list.length })}
    >
      {SEVERITY_LEVELS.filter((level) => counts[level] > 0).map((level) => (
        <span key={level} style={s.count(SEV[level].c)}>
          {React.createElement(Icon[SEV[level].icon], { size: 13 })}
          <span className="tnum">{counts[level]}</span>
        </span>
      ))}
      {pos && (
        <div
          role="tooltip"
          data-testid="findings-popover"
          style={s.panelWrap(pos)}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={s.panel}>
            <div style={s.title}>{t("list.findings.popoverTitle", { count: list.length })}</div>
            {sortPreviews(list).map((f) => (
              <div key={f.id} style={s.item}>
                <div style={s.itemHead}>
                  <SeverityBadge severity={f.severity} compact />
                  <span style={s.itemTitle}>{f.title}</span>
                </div>
                <div style={s.meta}>
                  <span>{f.category}</span>
                  <span className="mono">{formatLocation(f)}</span>
                  <span className="tnum">{t("list.findings.confidence", { value: formatConfidence(f.confidence) })}</span>
                </div>
                <p style={s.rationale}>{f.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
