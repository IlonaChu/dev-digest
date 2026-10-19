/* /skills — the skills list on the left (search, Add Skill, cards with toggle +
   delete) and a placeholder on the right. Clicking a card opens its editor. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { EmptyState, ErrorState } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { useSkills } from "@/lib/hooks/skills";
import { AddSkillModal } from "../AddSkillModal";
import { SkillsSidebar } from "../SkillsSidebar";
import { s } from "./styles";

export function SkillsListView() {
  const t = useTranslations("skills");
  const { data: skills, isLoading, isError, refetch } = useSkills();
  const [adding, setAdding] = React.useState(false);
  const noSkills = !isLoading && !isError && (skills ?? []).length === 0;

  return (
    <AppShell crumb={[{ label: t("page.crumbLab") }, { label: t("page.crumbSkills") }]}>
      {adding && <AddSkillModal onClose={() => setAdding(false)} />}
      <div style={s.root}>
        <SkillsSidebar />
        <div style={s.main}>
          {isError && <ErrorState body={t("page.loadError")} onRetry={() => refetch()} />}
          {noSkills && (
            <EmptyState
              icon="Sparkles"
              title={t("page.empty.title")}
              body={t("page.empty.body")}
              cta={t("page.empty.cta")}
              onCta={() => setAdding(true)}
            />
          )}
          {!isError && !noSkills && (
            <div style={s.placeholder}>
              <EmptyState title={t("page.placeholder.title")} body={t("page.placeholder.body")} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
