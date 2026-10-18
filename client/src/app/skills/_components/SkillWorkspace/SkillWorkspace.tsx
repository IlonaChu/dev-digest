/* SkillWorkspace — the skill editor page body: the skills list on the left, the
   header + tabs + editor on the right. Shared by /skills/[id] and /skills/new. */
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
  loading,
  tab,
  onTab,
}: {
  /** Undefined for a new, unsaved skill. */
  skill?: Skill;
  loading?: boolean;
  tab: SkillTab;
  onTab: (t: SkillTab) => void;
}) {
  const t = useTranslations("skills");
  const { remove } = useDeleteSkillAction({ openId: skill?.id });
  const onDelete = () => skill && remove(skill);

  return (
    <div style={s.root}>
      <SkillsSidebar activeId={skill?.id} tab={tab} />
      {loading ? (
        <div style={s.loading}>
          <Skeleton height={24} width={240} />
          <Skeleton height={200} />
        </div>
      ) : (
        <div style={s.main}>
          <div style={s.header}>
            <Icon.Sparkles size={18} style={s.icon} />
            <h1 className={skill ? "mono" : undefined} style={s.title}>
              {skill ? skill.name : t("editor.newTitle")}
            </h1>
            {skill && <SkillTypeBadge type={skill.type} />}
            {skill && (
              <Badge mono icon="GitCommit">
                {t("preview.version", { version: skill.version })}
              </Badge>
            )}
            {skill && !skill.enabled && <Badge color="var(--text-muted)">{t("preview.disabled")}</Badge>}
            {skill && (
              <div style={s.spacer}>
                <IconBtn icon="Trash" label={t("editor.delete")} danger onClick={onDelete} />
              </div>
            )}
          </div>
          <div style={s.content}>
            <SkillEditor skill={skill} tab={tab} onTab={onTab} />
          </div>
        </div>
      )}
    </div>
  );
}
