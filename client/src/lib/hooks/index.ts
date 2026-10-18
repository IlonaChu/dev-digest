/* hooks/ public API — React Query hooks, query options and key factories over
   the F1/feature APIs. Import from "@/lib/hooks" or from a domain file directly
   (e.g. "@/lib/hooks/reviews"). Named re-exports only, so the surface is deliberate.
   The domain files carry no "use client": hooks only run inside client components anyway,
   and a directive would turn the key factories / queryOptions into client references that
   a Server Component could not call for prefetching. */
export {
  settingsKeys,
  settingsQuery,
  secretsStatusQuery,
  useSettings,
  useUpdateSettings,
  useTestConnection,
  useSecretsStatus,
  repoKeys,
  reposQuery,
  useRepos,
  useAddRepo,
  useRefreshRepo,
  useDeleteRepo,
  pullKeys,
  pullsQuery,
  pullDetailQuery,
  usePulls,
  usePullDetail,
  contextKeys,
  useContextFiles,
  useReindexContext,
} from "./core";
export {
  agentKeys,
  agentsQuery,
  agentQuery,
  useAgents,
  useAgent,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
  useProviderModels,
  type CreateAgentInput,
  type UpdateAgentInput,
} from "./agents";
export {
  reviewKeys,
  prActiveRunsQuery,
  prRunsQuery,
  prReviewsQuery,
  usePrActiveRuns,
  usePrRuns,
  usePrReviews,
  useRunLifecycle,
  useDeleteRun,
  useCancelRun,
  useDeleteReview,
  usePrComments,
  useCreatePrComment,
  useRunReview,
  useFindingAction,
  useRunEvents,
  type ActiveRun,
  type CreateCommentInput,
  type RunReviewInput,
} from "./reviews";
export { traceKeys, runTraceQuery, useRunTrace } from "./trace";
export {
  repoIntelKeys,
  useRepoIntelStatus,
  useResyncRepoIntel,
  type RepoIntelState,
} from "./repo-intel";
