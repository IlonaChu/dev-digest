/* One skill in the agent's Skills list: grip handle · checkbox · name · type badge.
   Checked = attached to the agent. Only attached rows can be dragged; the grip also
   reorders with Alt+↑/↓ so the list stays usable without a mouse. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Checkbox, Icon } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { SkillTypeBadge } from "@/components/SkillTypeBadge";
import { skillBlockReason } from "@/lib/skill-policy";
import { s } from "./styles";

export interface DragHandlers {
  dragging: boolean;
  dropTarget: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  /** Called with -1 (up) / +1 (down) from Alt+arrow on the grip. */
  onNudge: (delta: -1 | 1) => void;
}

export function SkillRow({
  skill,
  checked,
  onChange,
  drag,
}: {
  skill: Skill;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Present only for attached rows. */
  drag?: DragHandlers;
}) {
  const t = useTranslations("skills");
  const blocked = skillBlockReason(skill) !== null;

  return (
    <div
      style={s.row(!!drag?.dragging, !!drag?.dropTarget)}
      data-testid={`skill-row-${skill.name}`}
      draggable={!!drag}
      onDragStart={(e) => {
        if (!drag) return;
        e.dataTransfer?.setData("text/plain", skill.id);
        drag.onDragStart();
      }}
      onDragOver={(e) => {
        if (!drag) return;
        e.preventDefault();
        drag.onDragOver();
      }}
      onDrop={(e) => {
        if (!drag) return;
        e.preventDefault();
        drag.onDrop();
      }}
      onDragEnd={drag?.onDragEnd}
    >
      <button
        type="button"
        style={s.grip(!!drag)}
        aria-label={t("agentTab.drag")}
        title={t("agentTab.drag")}
        tabIndex={drag ? 0 : -1}
        aria-hidden={drag ? undefined : true}
        onKeyDown={(e) => {
          if (!drag || !e.altKey) return;
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            drag.onNudge(e.key === "ArrowUp" ? -1 : 1);
          }
        }}
      >
        <Icon.GripVertical size={16} />
      </button>
      <Checkbox
        checked={checked}
        onChange={onChange}
        ariaLabel={skill.name}
        disabled={blocked && !checked}
      />
      <span className="mono" style={s.name}>
        {skill.name}
      </span>
      {!skill.enabled && <Badge color="var(--warn)" bg="var(--warn-bg)">{t("agentTab.disabledGlobally")}</Badge>}
      {blocked && (
        <Badge color="var(--crit)" bg="var(--crit-bg)" icon="AlertTriangle">
          {t("agentTab.blocked")}
        </Badge>
      )}
      <SkillTypeBadge type={skill.type} />
    </div>
  );
}
