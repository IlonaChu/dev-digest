/* SkillCard — name + type, description, "Source · vN", "N agents" and the global
   enabled switch. With `href` the whole card is a link (the name's link is stretched
   over the card; the switch and trash sit above it), so it opens from the keyboard and
   in a new tab. An imported skill that did not pass the safety check cannot be switched
   on: the switch is disabled and a badge says why (the server enforces it too). */
"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Icon, Toggle } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { SkillTypeBadge } from "@/components/SkillTypeBadge";
import { blockReasonKey, skillBlockReason } from "@/lib/skill-policy";
import { s } from "./styles";

export function SkillCard({
  skill,
  active,
  href,
  onToggle,
  onDelete,
  deleting,
}: {
  skill: Skill;
  active?: boolean;
  /** Where the card leads (the skill's editor). */
  href?: string;
  onToggle?: (enabled: boolean) => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const t = useTranslations("skills");
  const reasonId = React.useId();
  const reason = skillBlockReason(skill);
  const blocked = reason !== null && !skill.enabled;
  return (
    <div className={href ? "dd-skill-card" : undefined} style={s.card(!!active, skill.enabled, !!href)}>
      <div style={s.headerRow}>
        <span className="mono" style={s.name}>
          {href ? (
            <Link href={href} aria-current={active ? "page" : undefined} style={s.nameLink}>
              {skill.name}
              <span aria-hidden style={s.stretch} />
            </Link>
          ) : (
            skill.name
          )}
        </span>
        <SkillTypeBadge type={skill.type} />
        {onToggle && (
          <div style={s.toggle}>
            <Toggle
              on={skill.enabled}
              onChange={onToggle}
              size={14}
              disabled={blocked}
              title={blocked ? t("card.blockedToggle") : undefined}
              aria-label={t("card.toggle", { name: skill.name })}
              aria-describedby={blocked ? reasonId : undefined}
            />
          </div>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            title={t("card.delete")}
            aria-label={t("card.delete")}
            style={s.deleteBtn(!!deleting)}
          >
            <Icon.Trash size={14} />
          </button>
        )}
      </div>
      <div style={{ ...s.description, ...s.aboveLink }} title={skill.description || undefined}>
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
          <span id={reasonId} title={t(`vetting.${blockReasonKey(reason)}`)} style={s.aboveLink}>
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
