/* AddSkillButton — "+ Add Skill": opens the Add skill dialog (Create · From file ·
   Import from URL). Owns the dialog so the list page and the editor sidebar behave the same. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@devdigest/ui";
import { AddSkillModal } from "../AddSkillModal";

export function AddSkillButton() {
  const t = useTranslations("skills");
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {open && <AddSkillModal onClose={() => setOpen(false)} />}
      <Button kind="primary" size="sm" icon="Plus" onClick={() => setOpen(true)}>
        {t("page.addSkill")}
      </Button>
    </>
  );
}
