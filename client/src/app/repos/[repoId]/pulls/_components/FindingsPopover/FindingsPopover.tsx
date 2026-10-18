/* FindingsPopover — FINDINGS cell of a PR list row (and of each PR-timeline run row): severity
   icons with counts; hovering them opens a read-only preview. A PR list row passes `groups` (the
   latest run of each agent) → icons sum all agents and the popover has one section per agent;
   a timeline row passes the flat `findings` of one run → "N FINDINGS IN THIS RUN". Counts are a
   plain group-by on the findings already loaded — no model call. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, SEV, SeverityBadge } from "@devdigest/ui";
import type { PrAgentFindings, PrFindingPreview } from "@devdigest/shared";
import { countBySeverity, SEVERITY_LEVELS } from "../../_lib/severity";
import { flattenGroups, formatConfidence, formatLocation, popoverPosition, sortPreviews } from "./helpers";
import type { PopoverPosition } from "./helpers";
import { s } from "./styles";

export function FindingsPopover({
  findings,
  groups,
  ariaLabel,
}: {
  /** Findings of ONE run (timeline row). Ignored when `groups` is given. */
  findings?: readonly PrFindingPreview[] | null;
  /** Latest run of each agent (PR list row): one popover section per agent. */
  groups?: readonly PrAgentFindings[] | null;
  /** Overrides the default aria-label (e.g. timeline rows: "N findings in this run"). */
  ariaLabel?: string;
}) {
  const t = useTranslations("prReview");
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = React.useState<PopoverPosition | null>(null);

  const list = groups ? flattenGroups(groups) : (findings ?? []);
  if (list.length === 0) return <span style={s.none}>—</span>;

  const counts = countBySeverity(list);
  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos(popoverPosition(rect, { width: window.innerWidth, height: window.innerHeight }));
  };
  const close = () => setPos(null);
  const defaultLabel = groups
    ? t("list.findings.agentsAriaLabel", { count: list.length })
    : t("list.findings.ariaLabel", { count: list.length });

  return (
    <span
      ref={triggerRef}
      style={s.trigger}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
      tabIndex={0}
      aria-label={ariaLabel ?? defaultLabel}
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
            {groups ? (
              <>
                <div style={s.title}>
                  {t("list.findings.popoverTitleAgents", { count: list.length, agents: groups.length })}
                </div>
                {groups.map((g) => {
                  const agent = g.agent_name ?? t("list.findings.unknownAgent");
                  return (
                    <section key={g.agent_id ?? "no-agent"} aria-label={agent}>
                      <div style={s.sectionHead}>
                        {t("list.findings.section", { agent, count: g.findings.length })}
                      </div>
                      {g.findings.length === 0 ? (
                        <div style={s.sectionEmpty}>{t("list.findings.noFindings")}</div>
                      ) : (
                        sortPreviews(g.findings).map((f) => <PreviewItem key={f.id} f={f} />)
                      )}
                    </section>
                  );
                })}
              </>
            ) : (
              <>
                <div style={s.title}>{t("list.findings.popoverTitle", { count: list.length })}</div>
                {sortPreviews(list).map((f) => (
                  <PreviewItem key={f.id} f={f} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

/** One read-only finding entry: severity, title, category, location, confidence, rationale. */
function PreviewItem({ f }: { f: PrFindingPreview }) {
  const t = useTranslations("prReview");
  return (
    <div style={s.item}>
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
  );
}
