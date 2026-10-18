/* hooks/agents.ts — React Query hooks for the A2 Agents tab + Agent Editor. */
"use client";

import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Agent } from "@devdigest/shared";
import type { ModelInfo, Provider, ReviewStrategy } from "@devdigest/shared";
import { api } from "../api";

export const agentKeys = {
  all: ["agents"] as const,
  detail: (id: string | null | undefined) => ["agent", id] as const,
  providerModelsAll: ["provider-models"] as const,
  providerModels: (provider: Provider | null | undefined) => ["provider-models", provider] as const,
};

export const agentsQuery = () =>
  queryOptions({
    queryKey: agentKeys.all,
    queryFn: () => api.get("/agents", z.array(Agent)),
  });

export const agentQuery = (id: string | null | undefined) =>
  queryOptions({
    queryKey: agentKeys.detail(id),
    queryFn: () => api.get(`/agents/${id}`, Agent),
    enabled: !!id,
  });

export function useAgents() {
  return useQuery(agentsQuery());
}

export function useAgent(id: string | null | undefined) {
  return useQuery(agentQuery(id));
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  provider: Provider;
  model: string;
  system_prompt: string;
  output_schema?: unknown;
  strategy?: ReviewStrategy;
  enabled?: boolean;
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAgentInput) => api.post<Agent>("/agents", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

export interface UpdateAgentInput {
  id: string;
  patch: Partial<
    Pick<
      Agent,
      | "name"
      | "description"
      | "provider"
      | "model"
      | "system_prompt"
      | "output_schema"
      | "strategy"
      | "ci_fail_on"
      | "repo_intel"
      | "enabled"
    >
  >;
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateAgentInput) => api.put<Agent>(`/agents/${id}`, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: agentKeys.all });
      qc.setQueryData(agentKeys.detail(data.id), data);
    },
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>(`/agents/${id}`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: agentKeys.all });
      qc.removeQueries({ queryKey: agentKeys.detail(id) });
    },
  });
}

/** Dynamic model list for a provider (editor model picker). */
export function useProviderModels(provider: Provider | null | undefined) {
  return useQuery({
    queryKey: agentKeys.providerModels(provider),
    queryFn: () => api.get<ModelInfo[]>(`/providers/${provider}/models`),
    enabled: !!provider,
    staleTime: 5 * 60_000,
  });
}
