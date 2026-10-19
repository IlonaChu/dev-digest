/* Agent Skills tab — ONE list of every skill. A checked skill is attached to this agent
   and reaches the prompt (when it is also enabled globally and passes vetting); the
   attached skills come first, in prompt order, and can be dragged to reorder. Every change
   is saved at once as the full ordered set. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, ErrorState, Skeleton } from "@devdigest/ui";
import { useAgentSkillLinks, useSetAgentSkills, useSkills } from "@/lib/hooks/skills";
import { skillBlockReason } from "@/lib/skill-policy";
import { SkillRow } from "./_components/SkillRow";
import { attachedSkills, matchesSearch, move, toLinkInputs, unattachedSkills, type AttachedSkill } from "./helpers";
import { s } from "./styles";

export function SkillsTab({ agentId }: { agentId: string }) {
  const t = useTranslations("skills");
  const tAgents = useTranslations("agents");
  const skills = useSkills();
  const links = useAgentSkillLinks(agentId);
  const setSkills = useSetAgentSkills();
  const [search, setSearch] = React.useState("");
  // Index (into the attached list) of the row being dragged / hovered.
  const [dragFrom, setDragFrom] = React.useState<number | null>(null);
  const [dragOver, setDragOver] = React.useState<number | null>(null);
  // The drop reads the source from a ref so it never depends on when the drag-start render landed.
  const dragFromRef = React.useRef<number | null>(null);

  if (skills.isLoading || links.isLoading) return <Skeleton height={200} />;
  if (skills.isError || links.isError) {
    return <ErrorState body={t("agentTab.loadError")} onRetry={() => { void skills.refetch(); void links.refetch(); }} />;
  }

  const all = skills.data ?? [];
  const attached = attachedSkills(links.data ?? [], all);
  const candidates = unattachedSkills(all, attached, search);
  const visible = attached.map((a, index) => ({ ...a, index })).filter((a) => matchesSearch(a.skill, search));
  const inEffect = attached.filter(
    (a) => a.link.enabled && a.skill.enabled && skillBlockReason(a.skill) === null,
  ).length;

  const save = (next: AttachedSkill[]) => setSkills.mutate({ agentId, links: toLinkInputs(next) });
  const attach = (skillId: string) => {
    const skill = all.find((sk) => sk.id === skillId);
    if (!skill) return;
    const link = { agent_id: agentId, skill_id: skillId, order: attached.length, enabled: true };
    save([...attached, { skill, link }]);
  };
  // Checked = attached AND enabled for this agent. Unchecking unlinks; a link that was
  // saved disabled (older data) is switched back on in place.
  const setChecked = (index: number, checked: boolean) =>
    save(
      checked
        ? attached.map((a, i) => (i === index ? { ...a, link: { ...a.link, enabled: true } } : a))
        : attached.filter((_, i) => i !== index),
    );
  const startDrag = (index: number) => {
    dragFromRef.current = index;
    setDragFrom(index);
  };
  const endDrag = () => {
    dragFromRef.current = null;
    setDragFrom(null);
    setDragOver(null);
  };
  // Save only when the order really changes (dropping on itself / nudging past an end is a no-op).
  const reorder = (from: number, to: number) => {
    const next = move(attached, from, to);
    if (next !== attached) save(next);
  };
  const drop = (to: number) => {
    if (dragFromRef.current !== null) reorder(dragFromRef.current, to);
    endDrag();
  };

  const empty = all.length === 0;
  const noMatch = !empty && visible.length === 0 && candidates.length === 0;

  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <h2 style={s.h2}>{tAgents("skills.title")}</h2>
        <Badge color="var(--accent-text)" bg="var(--accent-bg)">
          {tAgents("skills.enabledCount", { linked: inEffect, total: all.length })}
        </Badge>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tAgents("skills.filterPlaceholder")}
          aria-label={tAgents("skills.filterPlaceholder")}
          style={s.filter}
        />
      </div>
      <p style={s.hint}>{tAgents("skills.orderHint")}</p>

      {empty && <div style={s.muted}>{t("agentTab.noneAvailable")}</div>}
      {noMatch && <div style={s.muted}>{t("agentTab.noMatch")}</div>}
      <div style={s.list}>
        {visible.map((a) => (
          <SkillRow
            key={a.skill.id}
            skill={a.skill}
            checked={a.link.enabled}
            onChange={(checked) => setChecked(a.index, checked)}
            drag={{
              dragging: dragFrom === a.index,
              dropTarget: dragFrom !== null && dragOver === a.index && dragFrom !== a.index,
              onDragStart: () => startDrag(a.index),
              onDragOver: () => setDragOver(a.index),
              onDrop: () => drop(a.index),
              onDragEnd: endDrag,
              onNudge: (delta) => reorder(a.index, a.index + delta),
            }}
          />
        ))}
        {candidates.map((sk) => (
          <SkillRow key={sk.id} skill={sk} checked={false} onChange={() => attach(sk.id)} />
        ))}
      </div>
    </div>
  );
}
