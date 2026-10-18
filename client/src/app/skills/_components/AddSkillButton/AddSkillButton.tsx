/* AddSkillButton — "Add Skill ▾": create from scratch or import from a file.
   Owns the import modal so the list page and the editor sidebar behave the same. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Dropdown } from "@devdigest/ui";
import { ImportSkillModal } from "../ImportSkillModal";

export function AddSkillButton({ width = 220 }: { width?: number }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const [importing, setImporting] = React.useState(false);
  return (
    <>
      {importing && <ImportSkillModal onClose={() => setImporting(false)} />}
      <Dropdown
        width={width}
        align="right"
        trigger={
          <Button kind="primary" size="sm" icon="Plus" iconRight="ChevronDown">
            {t("page.addSkill")}
          </Button>
        }
        items={[
          { label: t("page.menu.create"), icon: "Edit", onClick: () => router.push("/skills/new") },
          { label: t("page.menu.import"), icon: "Upload", onClick: () => setImporting(true) },
        ]}
      />
    </>
  );
}
