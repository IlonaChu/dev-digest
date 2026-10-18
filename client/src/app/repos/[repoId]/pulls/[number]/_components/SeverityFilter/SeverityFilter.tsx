/* SeverityFilter — per-run severity summary + filter. A pill row "3 CRITICAL · 5 WARNING"
   (only levels that exist) and three toggle buttons; clicking a level narrows the run's
   findings to it, clicking it again clears the filter. Counts are a plain group-by. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { SeverityBadge } from "@devdigest/ui";
import type { Severity } from "@devdigest/shared";
import { SEVERITY_LEVELS } from "./constants";
import type { SeverityCounts } from "./helpers";
import { s } from "./styles";

export function SeverityFilter({
  counts,
  active,
  onChange,
}: {
  counts: SeverityCounts;
  active: Severity | null;
  onChange: (severity: Severity | null) => void;
}) {
  const t = useTranslations("prReview");
  const present = SEVERITY_LEVELS.filter((level) => counts[level] > 0);

  return (
    <div style={s.wrap}>
      {present.length > 0 && (
        <div data-testid="severity-counts" style={s.pills}>
          {present.map((level, i) => (
            <React.Fragment key={level}>
              {i > 0 && <span style={s.dot}>·</span>}
              <span style={s.pill(level)}>
                {counts[level]} {t(`severityFilter.level.${level}`)}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
      <div role="group" aria-label={t("severityFilter.ariaLabel")} style={s.bar}>
        {SEVERITY_LEVELS.map((level) => {
          const isActive = active === level;
          // An active level stays clickable even at 0 so the filter can always be cleared.
          const disabled = counts[level] === 0 && !isActive;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={isActive}
              disabled={disabled}
              onClick={() => onChange(isActive ? null : level)}
              style={s.button(isActive, disabled)}
            >
              <SeverityBadge severity={level} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
