"use client";

import type { RunSummary, PrCommit, PrFindingPreview } from "@devdigest/shared";
import { buildTimeline } from "./helpers";
import { s } from "./styles";
import { CommitRow } from "./_components/CommitRow";
import { RunRow } from "./_components/RunRow";

/**
 * PR timeline — every agent run interleaved with the PR's commits, newest-first
 * and DB-backed so it survives reload. Showing commits between runs makes it
 * clear which commit each review ran against. Failed runs show their error
 * inline; the logs icon opens the run's trace.
 */
export function RunHistory({
  runs,
  commits = [],
  onOpenTrace,
  findingsByRun = {},
  onGoToReview,
  onDelete,
}: {
  runs: RunSummary[];
  commits?: PrCommit[];
  /** Loaded findings per run_id — drives the severity icons; a run without an entry falls back to the count text. */
  findingsByRun?: Record<string, readonly PrFindingPreview[]>;
  /** Open the trace + log drawer for a run (the logs icon). */
  onOpenTrace: (runId: string) => void;
  /** Jump to this run's inline review accordion below (clicking the agent name). */
  onGoToReview?: (runId: string) => void;
  onDelete?: (runId: string) => void;
}) {
  if (runs.length === 0 && commits.length === 0) return null;

  return (
    <div style={s.list}>
      {buildTimeline(runs, commits).map((item) =>
        item.kind === "commit" ? (
          <CommitRow key={`commit:${item.commit.sha}`} commit={item.commit} />
        ) : (
          <RunRow
            key={`run:${item.run.run_id}`}
            run={item.run}
            findings={findingsByRun[item.run.run_id] ?? []}
            onOpenTrace={onOpenTrace}
            onGoToReview={onGoToReview}
            onDelete={onDelete}
          />
        ),
      )}
    </div>
  );
}
