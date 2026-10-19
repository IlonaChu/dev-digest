/* AgentsSidebar — the left column of the agent editor: Add Agent ▾, search and the agent
   cards (the open one highlighted). Selecting a card keeps the current tab. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@devdigest/ui";
import { useAgents, useUpdateAgent } from "@/lib/hooks/agents";
import { useAgentSkillCounts } from "@/lib/hooks/skills";
import { AddAgentButton } from "../../../_components/AddAgentButton";
import { AgentCard } from "../../../_components/AgentCard";
import { filterAgents } from "../../../helpers";
import { s } from "./styles";

export function AgentsSidebar({ activeId, tab }: { activeId: string; tab: string }) {
  const t = useTranslations("agents");
  const router = useRouter();
  const { data: agents } = useAgents();
  const update = useUpdateAgent();
  const skillCounts = useAgentSkillCounts((agents ?? []).map((a) => a.id));
  const [search, setSearch] = React.useState("");
  const list = filterAgents(agents ?? [], search);

  return (
    <aside style={s.wrap}>
      <div style={s.head}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{t("editor.listTitle")}</h1>
          <AddAgentButton width={210} />
        </div>
        <div style={s.search}>
          <Icon.Search size={13} style={s.searchIcon} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("list.searchPlaceholder")}
            aria-label={t("list.searchPlaceholder")}
            style={s.searchInput}
          />
        </div>
      </div>
      <div style={s.list}>
        {list.map((a) => (
          <AgentCard
            key={a.id}
            ag={a}
            active={a.id === activeId}
            skillCount={skillCounts[a.id]}
            onClick={() => router.push(`/agents/${a.id}?tab=${tab}`)}
            onToggle={(enabled) => update.mutate({ id: a.id, patch: { enabled } })}
          />
        ))}
        {search && list.length === 0 && <div style={s.empty}>{t("list.noMatch")}</div>}
      </div>
    </aside>
  );
}
