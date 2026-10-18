/* /skills — the grid of skills. A card toggles a skill on/off; clicking it opens a
   read-only preview drawer, from which the editor opens. "Add Skill ▾" creates or imports. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState, ErrorState, Icon, Skeleton } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { useSkills, useUpdateSkill } from "@/lib/hooks/skills";
import { AddSkillButton } from "../AddSkillButton";
import { SkillCard } from "../SkillCard";
import { SkillPreviewDrawer } from "./_components/SkillPreviewDrawer";
import { filterSkills } from "../../helpers";
import { useDeleteSkillAction } from "../../_lib/useDeleteSkillAction";
import { s } from "./styles";

export function SkillsListView() {
  const t = useTranslations("skills");
  const router = useRouter();
  const { data: skills, isLoading, isError, refetch } = useSkills();
  const update = useUpdateSkill();
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { remove, isPending } = useDeleteSkillAction({
    onDeleted: (id) => setSelectedId((cur) => (cur === id ? null : cur)),
  });

  const list = filterSkills(skills ?? [], search);
  const selected = (skills ?? []).find((sk) => sk.id === selectedId) ?? null;

  return (
    <AppShell crumb={[{ label: t("page.crumbLab") }, { label: t("page.crumbSkills") }]}>
      {selected && (
        <SkillPreviewDrawer
          skill={selected}
          onClose={() => setSelectedId(null)}
          onOpenEditor={() => router.push(`/skills/${selected.id}?tab=config`)}
        />
      )}
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.headerText}>
            <h1 style={s.h1}>{t("page.heading")}</h1>
            <p style={s.subtitle}>{t("page.subtitle")}</p>
          </div>
          <div style={s.search}>
            <Icon.Search size={13} style={s.searchIcon} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("page.searchPlaceholder")}
              aria-label={t("page.searchPlaceholder")}
              style={s.searchInput}
            />
          </div>
          <AddSkillButton />
        </div>

        {isLoading && (
          <div style={s.grid}>
            <Skeleton height={130} />
            <Skeleton height={130} />
            <Skeleton height={130} />
          </div>
        )}
        {isError && <ErrorState body={t("page.loadError")} onRetry={() => refetch()} />}
        {!isLoading && !isError && list.length === 0 && !search && (
          <EmptyState
            icon="Sparkles"
            title={t("page.empty.title")}
            body={t("page.empty.body")}
            cta={t("page.empty.cta")}
            onCta={() => router.push("/skills/new")}
          />
        )}
        {list.length > 0 && (
          <div style={s.grid}>
            {list.map((sk) => (
              <SkillCard
                key={sk.id}
                skill={sk}
                onClick={() => setSelectedId(sk.id)}
                onToggle={(enabled) => update.mutate({ id: sk.id, patch: { enabled } })}
                onDelete={() => remove(sk)}
                deleting={isPending}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
