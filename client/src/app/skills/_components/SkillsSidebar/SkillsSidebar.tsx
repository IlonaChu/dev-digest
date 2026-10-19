/* SkillsSidebar — the left column of /skills and the skill editor: Add Skill
   (opens the Add skill dialog), search and the skill cards (active one
   highlighted). Each card links to its editor on the Config tab. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Icon, Skeleton } from "@devdigest/ui";
import { useSkills, useUpdateSkill } from "@/lib/hooks/skills";
import { AddSkillButton } from "../AddSkillButton";
import { SkillCard } from "../SkillCard";
import { filterSkills } from "../../helpers";
import { useDeleteSkillAction } from "../../_lib/useDeleteSkillAction";
import { s } from "./styles";

export function SkillsSidebar({ activeId }: { activeId?: string }) {
  const t = useTranslations("skills");
  const { data: skills, isLoading, isError, refetch } = useSkills();
  const update = useUpdateSkill();
  const { remove, isPending } = useDeleteSkillAction({ openId: activeId });
  const [search, setSearch] = React.useState("");
  const list = filterSkills(skills ?? [], search);
  // "No match" is about the search; with no skills at all the page shows its own empty state.
  const noMatch = !isLoading && !isError && search.trim() !== "" && list.length === 0;

  return (
    <aside style={s.wrap}>
      <div style={s.head}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{t("editor.listTitle")}</h1>
          <AddSkillButton />
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
        {isLoading && (
          <>
            <Skeleton height={110} />
            <Skeleton height={110} />
            <Skeleton height={110} />
          </>
        )}
        {list.map((sk) => (
          <SkillCard
            key={sk.id}
            skill={sk}
            active={sk.id === activeId}
            href={`/skills/${sk.id}?tab=config`}
            onToggle={(enabled) => update.mutate({ id: sk.id, patch: { enabled } })}
            onDelete={() => remove(sk)}
            deleting={isPending}
          />
        ))}
        {noMatch && <div style={s.empty}>{t("editor.listEmpty")}</div>}
        {isError && (
          <div style={s.error} role="alert">
            {t("page.loadError")}
            <Button kind="ghost" size="sm" icon="RefreshCw" onClick={() => refetch()}>
              {t("editor.retry")}
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
