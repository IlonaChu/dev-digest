/* hooks/core.ts — typed React Query hooks over the F1 API (contracts):
   settings, secrets, repos, pulls, and project context. Each domain exports a
   key factory + queryOptions (usable outside components: prefetch, invalidation)
   and thin hooks on top. */
import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { PrDetail, PrMeta, Repo, SecretsStatus, Settings } from "@devdigest/shared";
import { api } from "../api";
import type {
  SettingsUpdate,
  ConnTestProvider,
  ConnTestResult,
  SpecFile,
  IndexStatus,
} from "../types";
import { agentKeys } from "./agents";

// ---- Settings (F1: GET/PUT /settings, POST /settings/test-connection) ----
export const settingsKeys = {
  all: ["settings"] as const,
  secretsStatus: ["secrets-status"] as const,
};

export const settingsQuery = () =>
  queryOptions({
    queryKey: settingsKeys.all,
    queryFn: () => api.get("/settings", Settings),
  });

export const secretsStatusQuery = () =>
  queryOptions({
    queryKey: settingsKeys.secretsStatus,
    queryFn: () => api.get("/settings/secrets-status", SecretsStatus),
    staleTime: 30_000,
  });

export function useSettings() {
  return useQuery(settingsQuery());
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsUpdate) => api.put<Settings>("/settings", patch),
    onSuccess: (data) => qc.setQueryData(settingsKeys.all, data),
  });
}

export function useTestConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnTestProvider | { provider: ConnTestProvider; key?: string }) => {
      const body = typeof input === "string" ? { provider: input } : input;
      return api.post<ConnTestResult>("/settings/test-connection", body);
    },
    // Saving/validating a provider key can change which models resolve — drop the
    // cached (possibly empty) model lists so the agent picker refetches, and
    // refresh the "Configured / Not set" key-status badges.
    onSuccess: (res) => {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: agentKeys.providerModelsAll });
        qc.invalidateQueries({ queryKey: settingsKeys.secretsStatus });
      }
    },
  });
}

/** Which provider keys are configured (booleans only — never the values). */
export function useSecretsStatus() {
  return useQuery(secretsStatusQuery());
}

// ---- Repos (F1: GET/POST /repos, refresh, delete) ----
export const repoKeys = {
  all: ["repos"] as const,
};

export const reposQuery = () =>
  queryOptions({
    queryKey: repoKeys.all,
    queryFn: () => api.get("/repos", z.array(Repo)),
  });

export function useRepos() {
  return useQuery(reposQuery());
}

export function useAddRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.post<Repo>("/repos", { url }),
    onSuccess: () => qc.invalidateQueries({ queryKey: repoKeys.all }),
  });
}

export function useRefreshRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repoId: string) => api.post<Repo>(`/repos/${repoId}/refresh`),
    onSuccess: (_d, repoId) => {
      qc.invalidateQueries({ queryKey: repoKeys.all });
      qc.invalidateQueries({ queryKey: pullKeys.list(repoId) });
    },
  });
}

export function useDeleteRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repoId: string) => api.del<{ deleted: string }>(`/repos/${repoId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: repoKeys.all }),
  });
}

// ---- Pull requests (F1: GET /repos/:id/pulls, GET /pulls/:id) ----
export const pullKeys = {
  list: (repoId: string | null | undefined) => ["pulls", repoId] as const,
  detail: (prId: string | number | null | undefined) => ["pull", prId] as const,
};

export const pullsQuery = (repoId: string | null | undefined) =>
  queryOptions({
    queryKey: pullKeys.list(repoId),
    queryFn: () => api.get(`/repos/${repoId}/pulls`, z.array(PrMeta)),
    enabled: !!repoId,
  });

export const pullDetailQuery = (prId: string | number | null | undefined) =>
  queryOptions({
    queryKey: pullKeys.detail(prId),
    queryFn: () => api.get(`/pulls/${prId}`, PrDetail),
    enabled: prId != null,
  });

export function usePulls(repoId: string | null | undefined) {
  return useQuery({
    ...pullsQuery(repoId),
    // Auto-refresh PR statuses: re-sync from GitHub every 60s while the page is
    // open, and whenever the window regains focus.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function usePullDetail(prId: string | number | null | undefined) {
  return useQuery(pullDetailQuery(prId));
}

// ---- Project Context (A3 contract; safe to call once API exposes it) ----
export const contextKeys = {
  list: (repoId: string | null | undefined) => ["context", repoId] as const,
};

export function useContextFiles(repoId: string | null | undefined) {
  return useQuery({
    queryKey: contextKeys.list(repoId),
    queryFn: () => api.get<SpecFile[]>(`/repos/${repoId}/context`),
    enabled: !!repoId,
  });
}

export function useReindexContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repoId: string) => api.post<IndexStatus>(`/repos/${repoId}/context/reindex`),
    onSuccess: (_d, repoId) => qc.invalidateQueries({ queryKey: contextKeys.list(repoId) }),
  });
}
