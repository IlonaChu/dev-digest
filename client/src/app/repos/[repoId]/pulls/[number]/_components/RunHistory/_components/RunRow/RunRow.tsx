"use client";

import { useTranslations } from "next-intl";
import { Badge, Icon, CircularScore } from "@devdigest/ui";
import type { RunSummary, PrFindingPreview } from "@devdigest/shared";
import { RunCostBadge } from "@/components/RunCostBadge";
import { FindingsPopover } from "../../../../../_components/FindingsPopover";
import { outcomeOf } from "../../helpers";
import { s } from "../../styles";

/** One agent run in the PR timeline: outcome badge, score, findings, cost and actions. */
export function RunRow({
  run,
  findings,
  onOpenTrace,
  onGoToReview,
  onDelete,
}: {
  run: RunSummary;
  /** Loaded findings of this run; empty → falls back to the count text. */
  findings: readonly PrFindingPreview[];
  onOpenTrace: (runId: string) => void;
  onGoToReview?: (runId: string) => void;
  onDelete?: (runId: string) => void;
}) {
  const t = useTranslations("prReview");
  const o = outcomeOf(run);
  const settled = run.status === "done";
  const blockers = run.blockers ?? 0;

  return (
    <div style={s.runRow}>
      <Badge color={o.color} bg={o.bg} icon={o.icon}>
        {t(`runStatus.${o.key}`)}
      </Badge>
      {settled && run.score != null && <CircularScore score={run.score} size={30} stroke={3} />}
      <div style={s.runBody}>
        <div style={s.runTitle}>
          <button
            type="button"
            onClick={() => onGoToReview?.(run.run_id)}
            title={t("timeline.goToReview")}
            style={s.agentButton(Boolean(onGoToReview))}
          >
            {run.agent_name ?? "Agent"}
          </button>{" "}
          <span className="mono" style={s.model}>
            {run.provider}/{run.model}
          </span>
        </div>
        {run.status === "failed" && run.error && (
          <div style={s.runError} title={run.error}>
            {run.error}
          </div>
        )}
        {settled && (
          <div style={s.runFindings}>
            {findings.length > 0 ? (
              <FindingsPopover
                findings={findings}
                ariaLabel={t("timeline.findingsAriaLabel", { count: findings.length })}
              />
            ) : (
              t("runStatus.findings", { count: run.findings_count ?? 0 })
            )}
            {blockers > 0 ? t("runStatus.blockers", { count: blockers }) : ""}
          </div>
        )}
      </div>
      <div style={s.runMeta}>
        {run.ran_at && <span>{new Date(run.ran_at).toLocaleTimeString()}</span>}
        {settled && (
          <RunCostBadge
            variant="withTokens"
            tokens={(run.tokens_in ?? 0) + (run.tokens_out ?? 0)}
            costUsd={run.cost_usd}
          />
        )}
      </div>
      <button
        type="button"
        title={t("timeline.openTrace")}
        aria-label={t("timeline.openTrace")}
        onClick={() => onOpenTrace(run.run_id)}
        style={s.iconBtn}
      >
        <Icon.FileText size={13} />
      </button>
      {onDelete && run.status !== "running" && (
        <button
          type="button"
          aria-label={t("timeline.deleteRun")}
          title={t("timeline.deleteRun")}
          onClick={() => onDelete(run.run_id)}
          style={s.deleteBtn}
        >
          <Icon.Trash size={13} />
        </button>
      )}
    </div>
  );
}
