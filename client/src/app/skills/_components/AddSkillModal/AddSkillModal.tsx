/* AddSkillModal — one dialog for every way to add a skill: write one (Create),
   upload a .md / .zip (From file) or fetch it from a public link (Import from URL).
   Imports go through the preview + safety check and are saved DISABLED. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@devdigest/ui";
import { CreateTab } from "./_components/CreateTab";
import { FromFileTab } from "./_components/FromFileTab";
import { FromUrlTab } from "./_components/FromUrlTab";
import { ADD_SKILL_TABS, ADD_SKILL_TAB_LABEL, MODAL_WIDTH, type AddSkillTab } from "./constants";
import { s } from "./styles";

export function AddSkillModal({ onClose, initialTab = "create" }: { onClose: () => void; initialTab?: AddSkillTab }) {
  const t = useTranslations("skills");
  const [tab, setTab] = React.useState<AddSkillTab>(initialTab);

  const tabs = (
    <div role="tablist" aria-label={t("add.title")} style={s.tabs}>
      {ADD_SKILL_TABS.map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() => setTab(key)}
          style={tab === key ? { ...s.tab, ...s.tabActive } : s.tab}
        >
          {t(ADD_SKILL_TAB_LABEL[key])}
        </button>
      ))}
    </div>
  );

  return (
    <Modal width={MODAL_WIDTH} title={t("add.title")} onClose={onClose} tabs={tabs}>
      <div role="tabpanel" style={s.body}>
        {tab === "create" && <CreateTab onDone={onClose} />}
        {tab === "file" && <FromFileTab onDone={onClose} />}
        {tab === "url" && <FromUrlTab onDone={onClose} />}
      </div>
    </Modal>
  );
}
