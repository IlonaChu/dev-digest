/* SeverityFilter — "3 CRITICAL · 5 WARNING · 2 SUGGESTION" counters; clicking a
   level narrows every run's findings to it, clicking it again clears the filter. */
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

  return (
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
            <SeverityBadge severity={level} count={counts[level]} />
          </button>
        );
      })}
      {active && (
        <button type="button" onClick={() => onChange(null)} style={s.clear}>
          {t("severityFilter.clear")}
        </button>
      )}
    </div>
  );
}
