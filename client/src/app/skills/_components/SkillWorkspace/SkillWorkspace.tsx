/* SkillWorkspace — the skill editor page body: the skills list on the left, the
   header + tabs + editor on the right; a skeleton while the skill loads. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Icon, IconBtn, Skeleton } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { SkillTypeBadge } from "@/components/SkillTypeBadge";
import type { SkillTab } from "../../constants";
import { useDeleteSkillAction } from "../../_lib/useDeleteSkillAction";
import { SkillEditor } from "../SkillEditor";
import { SkillsSidebar } from "../SkillsSidebar";
import { s } from "./styles";

export function SkillWorkspace({
  skill,
  tab,
  onTab,
}: {
  /** Undefined while the skill loads. */
  skill?: Skill;
  tab: SkillTab;
  onTab: (t: SkillTab) => void;
}) {
  const t = useTranslations("skills");
  const { remove } = useDeleteSkillAction({ openId: skill?.id });

  return (
    <div style={s.root}>
      <SkillsSidebar activeId={skill?.id} />
      {!skill ? (
        <div style={s.loading}>
          <Skeleton height={24} width={240} />
          <Skeleton height={200} />
        </div>
      ) : (
        <div style={s.main}>
          <div style={s.header}>
            <Icon.Sparkles size={18} style={s.icon} />
            <h1 className="mono" style={s.title}>
              {skill.name}
            </h1>
            <SkillTypeBadge type={skill.type} />
            <Badge mono icon="GitCommit">
              {t("preview.version", { version: skill.version })}
            </Badge>
            {!skill.enabled && <Badge color="var(--text-muted)">{t("preview.disabled")}</Badge>}
            <div style={s.spacer}>
              <IconBtn icon="Trash" label={t("editor.delete")} danger onClick={() => remove(skill)} />
            </div>
          </div>
          <div style={s.content}>
            <SkillEditor skill={skill} tab={tab} onTab={onTab} />
          </div>
        </div>
      )}
    </div>
  );
}
