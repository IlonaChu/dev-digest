/* VettingPanel — the safety-check result of an imported skill: status, the hard
   rules that fired (with line + excerpt) and the model's reasons. Used in the
   import preview, the skill preview drawer and the editor's Config tab. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@devdigest/ui";
import type { SkillVetting } from "@devdigest/shared";
import { STATUS_COLOR } from "./constants";
import { s } from "./styles";

export function VettingPanel({
  vetting,
  onRerun,
  rerunning,
  notice,
}: {
  vetting: SkillVetting;
  onRerun?: () => void;
  rerunning?: boolean;
  /** Extra line under the summary, e.g. "the text changed after the last check". */
  notice?: string;
}) {
  const t = useTranslations("skills");
  const tone = STATUS_COLOR[vetting.status];
  return (
    <section style={s.wrap(vetting.status !== "clean")} aria-label={t("vetting.title")}>
      <div style={s.head}>
        <span style={s.title}>{t("vetting.title")}</span>
        <Badge
          color={tone.color}
          bg={tone.bg}
          icon={vetting.status === "clean" ? "CheckCircle" : "AlertTriangle"}
        >
          {t(`vetting.status.${vetting.status}`)}
        </Badge>
        {onRerun && (
          <Button kind="ghost" size="sm" icon="RefreshCw" onClick={onRerun} loading={rerunning}>
            {rerunning ? t("vetting.rerunning") : t("vetting.rerun")}
          </Button>
        )}
      </div>
      <div style={s.summary}>{t(`vetting.summary.${vetting.status}`)}</div>
      {notice && <div style={s.summary}>{notice}</div>}

      {vetting.findings.length > 0 && (
        <>
          <div style={s.sectionLabel}>{t("vetting.rules")}</div>
          <ul style={s.list}>
            {vetting.findings.map((f, i) => (
              <li key={`${f.rule}-${i}`} style={s.finding}>
                <span className="mono" style={s.rule}>
                  {f.rule}
                </span>
                {f.message}
                {f.line != null && <span style={s.line}>{t("vetting.line", { line: f.line })}</span>}
                {f.excerpt && (
                  <code className="mono" style={s.excerpt}>
                    {f.excerpt}
                  </code>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {vetting.llm && vetting.llm.reasons.length > 0 && (
        <>
          <div style={s.sectionLabel}>{t("vetting.llm", { model: vetting.llm.model })}</div>
          <ul style={s.list}>
            {vetting.llm.reasons.map((r, i) => (
              <li key={i} style={s.finding}>
                {r}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
