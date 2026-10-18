/* RunCostBadge — cost (and optionally tokens) of one agent run.
   compact    → "$0.014"                (PR list COST column)
   withTokens → "9 119 tok · $0.0013"   (Agent runs timeline)
   Unknown cost renders "—", never "$0.00". Pure display: no extra model calls. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { formatCost, formatTokenCount } from "@/lib/cost";
import { s } from "./styles";

export type RunCostBadgeProps =
  | { variant: "compact"; costUsd: number | null | undefined }
  | {
      variant: "withTokens";
      costUsd: number | null | undefined;
      tokens: number | null | undefined;
    };

export function RunCostBadge(props: RunCostBadgeProps) {
  const t = useTranslations("prReview");
  const { costUsd } = props;
  const unknown = costUsd == null;
  const cost = formatCost(costUsd);
  // Exact value in the tooltip so rounding never hides data.
  const title = unknown ? t("cost.noData") : t("cost.exact", { value: costUsd.toFixed(6) });

  if (props.variant === "withTokens") {
    const tokens =
      props.tokens != null ? t("cost.tokens", { count: formatTokenCount(props.tokens) }) : null;
    return (
      <span className="tnum" style={s.withTokens} title={title}>
        {tokens ? `${tokens} · ${cost}` : cost}
      </span>
    );
  }
  return (
    <span className="tnum" style={s.compact(unknown)} title={title}>
      {cost}
    </span>
  );
}
