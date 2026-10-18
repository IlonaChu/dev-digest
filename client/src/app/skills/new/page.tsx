/* /skills/new — create a skill (Config only; Preview and Versions need a saved skill). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { SkillWorkspace } from "../_components/SkillWorkspace";

export default function NewSkillPage() {
  const t = useTranslations("skills");
  return (
    <AppShell
      crumb={[
        { label: t("page.crumbLab") },
        { label: t("page.crumbSkills"), href: "/skills" },
        { label: t("editor.newTitle") },
      ]}
    >
      <SkillWorkspace tab="config" onTab={() => {}} />
    </AppShell>
  );
}
