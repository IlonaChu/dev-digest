/* SkillPreviewDrawer — read-only side preview of one skill (rendered body, meta,
   safety status). Editing happens in the editor, opened from the footer. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Drawer, Markdown } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { SkillTypeBadge } from "@/components/SkillTypeBadge";
import { VettingPanel } from "@/components/VettingPanel";
import { s } from "./styles";

export function SkillPreviewDrawer({
  skill,
  onClose,
  onOpenEditor,
}: {
  skill: Skill;
  onClose: () => void;
  onOpenEditor: () => void;
}) {
  const t = useTranslations("skills");
  return (
    <Drawer
      width={640}
      onClose={onClose}
      title={
        <span style={s.titleRow}>
          <span className="mono">{skill.name}</span>
          <SkillTypeBadge type={skill.type} />
        </span>
      }
      subtitle={skill.description || t("card.noDescription")}
      footer={
        <div style={s.footer}>
          <Button kind="ghost" onClick={onClose}>
            {t("preview.close")}
          </Button>
          <Button kind="primary" icon="Edit" onClick={onOpenEditor}>
            {t("preview.openEditor")}
          </Button>
        </div>
      }
    >
      <div style={s.meta}>
        <Badge
          color={skill.enabled ? "var(--ok)" : "var(--text-muted)"}
          bg={skill.enabled ? "var(--ok-bg)" : "var(--bg-hover)"}
          dot
        >
          {skill.enabled ? t("preview.enabled") : t("preview.disabled")}
        </Badge>
        <Badge mono>{t("preview.version", { version: skill.version })}</Badge>
        <span style={s.metaText}>{t(`source.${skill.source}`)}</span>
        {skill.agent_count != null && <span style={s.metaText}>{t("preview.agents", { count: skill.agent_count })}</span>}
      </div>
      {skill.vetting && (
        <div style={s.vetting}>
          <VettingPanel vetting={skill.vetting} />
        </div>
      )}
      <div style={s.body}>
        <Markdown>{skill.body}</Markdown>
      </div>
    </Drawer>
  );
}
