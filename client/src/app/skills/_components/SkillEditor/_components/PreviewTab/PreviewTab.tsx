/* Skill Preview tab — the body rendered as Markdown, plus the EXACT block the agent
   sees (formatSkillBlock is the same function the server uses to build the prompt). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Markdown } from "@devdigest/ui";
import { formatSkillBlock } from "@devdigest/shared";
import type { Skill } from "@devdigest/shared";
import { s } from "./styles";

export function PreviewTab({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  if (!skill.body.trim()) return <div style={s.empty}>{t("previewTab.empty")}</div>;
  return (
    <div style={s.wrap}>
      <section>
        <div style={s.label}>{t("previewTab.rendered")}</div>
        <div style={s.rendered}>
          <Markdown>{skill.body}</Markdown>
        </div>
      </section>
      <section>
        <div style={s.label}>{t("previewTab.injected")}</div>
        <div style={s.hint}>{t("previewTab.injectedHint")}</div>
        <pre className="mono" style={s.injected} data-testid="injected-block">
          {formatSkillBlock(skill)}
        </pre>
      </section>
    </div>
  );
}
