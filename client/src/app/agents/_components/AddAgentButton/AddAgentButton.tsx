/* AddAgentButton — "Add Agent ▾": create from scratch or start from a template. Owns the
   create modal so the agents list page and the editor sidebar behave the same. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Dropdown } from "@devdigest/ui";
import { CreateAgentModal } from "../CreateAgentModal";
import { TEMPLATES } from "./constants";

export function AddAgentButton({ width = 220 }: { width?: number }) {
  const t = useTranslations("agents");
  const [creating, setCreating] = React.useState(false);
  const open = () => setCreating(true);
  return (
    <>
      {creating && <CreateAgentModal onClose={() => setCreating(false)} />}
      <Dropdown
        width={width}
        align="right"
        trigger={
          <Button kind="primary" size="sm" icon="Plus" iconRight="ChevronDown">
            {t("list.addAgent")}
          </Button>
        }
        items={[
          { label: t("list.createFromScratch"), icon: "Edit", onClick: open },
          { divider: true },
          ...TEMPLATES.map((tp) => ({ label: tp, icon: "Cpu" as const, muted: true, onClick: open })),
        ]}
      />
    </>
  );
}
