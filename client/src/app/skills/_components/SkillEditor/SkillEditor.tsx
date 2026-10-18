/* SkillEditor — Config · Preview · Versions for one skill (or just Config for a new one).
   Tab state lives in ?tab= (owned by the page). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Tabs } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import type { SkillTab } from "../../constants";
import { ConfigTab } from "./_components/ConfigTab";
import { PreviewTab } from "./_components/PreviewTab";
import { VersionsTab } from "./_components/VersionsTab";
import { TABS } from "./constants";
import { s } from "./styles";

export function SkillEditor({
  skill,
  tab,
  onTab,
}: {
  skill?: Skill;
  tab: SkillTab;
  onTab: (t: SkillTab) => void;
}) {
  const t = useTranslations("skills");
  const visible = skill ? TABS : TABS.filter((tb) => tb.key === "config");
  const tabs = visible.map((tb) => ({ key: tb.key, label: t(tb.labelKey) }));
  return (
    <div style={s.wrap}>
      <div style={s.tabsBar}>
        <Tabs tabs={tabs} value={tab} onChange={(k) => onTab(k as SkillTab)} pad="0 24px" />
      </div>
      <div style={s.body}>
        {tab === "config" && <ConfigTab key={`${skill?.id ?? "new"}:${skill?.version ?? 0}`} skill={skill} />}
        {tab === "preview" && skill && <PreviewTab skill={skill} />}
        {tab === "versions" && skill && <VersionsTab skill={skill} />}
      </div>
    </div>
  );
}
