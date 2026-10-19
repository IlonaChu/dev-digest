/* SkillCard — name + type, description, "Source · vN", "N agents" and the global
   enabled switch. An imported skill that did not pass the safety check cannot be
   switched on: the switch is inert and a badge says why (the server enforces it too). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Icon, Toggle } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { SkillTypeBadge } from "@/components/SkillTypeBadge";
import { blockReasonKey, skillBlockReason } from "@/lib/skill-policy";
import { s } from "./styles";

const noop = () => {};

export function SkillCard({
  skill,
  active,
  onClick,
  onToggle,
  onDelete,
  deleting,
}: {
  skill: Skill;
  active?: boolean;
  onClick?: () => void;
  onToggle?: (enabled: boolean) => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const t = useTranslations("skills");
  const reason = skillBlockReason(skill);
  const blocked = reason !== null && !skill.enabled;
  return (
    <div onClick={onClick} style={s.card(!!active, skill.enabled)}>
      <div style={s.headerRow}>
        <span className="mono" style={s.name} title={skill.name}>
          {skill.name}
        </span>
        <SkillTypeBadge type={skill.type} />
        {onToggle && (
          <div onClick={(e) => e.stopPropagation()} style={s.toggle}>
            <span
              style={blocked ? s.toggleBlocked : undefined}
              title={blocked ? t("card.blockedToggle") : undefined}
              aria-disabled={blocked || undefined}
            >
              <Toggle on={skill.enabled} onChange={blocked ? noop : onToggle} size={14} />
            </span>
          </div>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
            title={t("card.delete")}
            aria-label={t("card.delete")}
            style={s.deleteBtn(!!deleting)}
          >
            <Icon.Trash size={14} />
          </button>
        )}
      </div>
      <div style={s.description} title={skill.description || undefined}>
        {skill.description || t("card.noDescription")}
      </div>
      <div style={s.meta}>{t("card.meta", { source: t(`source.${skill.source}`), version: skill.version })}</div>
      <div style={s.footerRow}>
        {skill.agent_count != null && (
          <Badge icon="Cpu" color="var(--text-secondary)" bg="var(--bg-hover)">
            {t("card.agents", { count: skill.agent_count })}
          </Badge>
        )}
        {reason && (
          <span title={t(`vetting.${blockReasonKey(reason)}`)}>
            <Badge color="var(--warn)" bg="var(--warn-bg)" icon="AlertTriangle">
              {reason === "not_checked" || reason === "stale_check"
                ? t("vetting.status.unverified")
                : t(`vetting.status.${reason}`)}
            </Badge>
          </span>
        )}
      </div>
    </div>
  );
}
