/* hooks/trace.ts — A5 Run Trace. GET /runs/:id/trace returns the ENTIRE
   trace of one run as a single document (config + stats + prompt_assembly +
   tool_calls[] + raw_output + memory_pulled[] + full log). Registered by A2;
   A5 enriches the document it returns. Live events stream via useRunEvents
   (hooks/reviews.ts) — the drawer combines both. */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { RunTrace } from "@devdigest/shared";
import { api } from "../api";

export const traceKeys = {
  detail: (runId: string | null | undefined) => ["run-trace", runId] as const,
};

export const runTraceQuery = (runId: string | null | undefined) =>
  queryOptions({
    queryKey: traceKeys.detail(runId),
    queryFn: () => api.get(`/runs/${runId}/trace`, RunTrace),
    enabled: !!runId,
    retry: false,
  });

export function useRunTrace(runId: string | null | undefined, enabled = true) {
  const query = runTraceQuery(runId);
  return useQuery({ ...query, enabled: query.enabled && enabled });
}
