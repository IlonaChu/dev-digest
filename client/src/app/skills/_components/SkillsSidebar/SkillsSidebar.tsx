/* SkillsSidebar — the left column of the skill editor: Add Skill ▾, search and the
   skill cards (active one highlighted). Selecting a card keeps the current tab. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, Skeleton } from "@devdigest/ui";
import { useSkills, useUpdateSkill } from "@/lib/hooks/skills";
import { AddSkillButton } from "../AddSkillButton";
import { SkillCard } from "../SkillCard";
import { filterSkills } from "../../helpers";
import { useDeleteSkillAction } from "../../_lib/useDeleteSkillAction";
import { s } from "./styles";

export function SkillsSidebar({ activeId, tab }: { activeId?: string; tab: string }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const { data: skills, isLoading } = useSkills();
  const update = useUpdateSkill();
  const { remove, isPending } = useDeleteSkillAction({ openId: activeId });
  const [search, setSearch] = React.useState("");
  const list = filterSkills(skills ?? [], search);

  return (
    <aside style={s.wrap}>
      <div style={s.head}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{t("editor.listTitle")}</h1>
          <AddSkillButton width={210} />
        </div>
        <div style={s.search}>
          <Icon.Search size={13} style={s.searchIcon} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("editor.listSearch")}
            aria-label={t("editor.listSearch")}
            style={s.searchInput}
          />
        </div>
      </div>
      <div style={s.list}>
        {isLoading && <Skeleton height={110} />}
        {list.map((sk) => (
          <SkillCard
            key={sk.id}
            skill={sk}
            active={sk.id === activeId}
            onClick={() => router.push(`/skills/${sk.id}?tab=${tab}`)}
            onToggle={(enabled) => update.mutate({ id: sk.id, patch: { enabled } })}
            onDelete={() => remove(sk)}
            deleting={isPending}
          />
        ))}
        {!isLoading && list.length === 0 && <div style={s.empty}>{t("editor.listEmpty")}</div>}
      </div>
    </aside>
  );
}
