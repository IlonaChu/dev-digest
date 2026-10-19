/* hooks/conventions.ts — React Query hooks for the Conventions page: the extracted
   candidates of a repo, accept / reject / edit, and merging the accepted ones into a skill.
   The server verifies every candidate's evidence against the clone; the client only decides. */
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ConventionList,
  ConventionRecord,
  ConventionSkillDraft,
  ConventionSkillResult,
} from "@devdigest/shared";
import type { ConventionStatus, SkillType } from "@devdigest/shared";
import { api } from "../api";
import { skillKeys } from "./skills";

export const conventionKeys = {
  list: (repoId: string | null | undefined) => ["conventions", repoId] as const,
};

export const conventionsQuery = (repoId: string | null | undefined) =>
  queryOptions({
    queryKey: conventionKeys.list(repoId),
    queryFn: () => api.get(`/repos/${repoId}/conventions`, ConventionList),
    enabled: !!repoId,
  });

export function useConventions(repoId: string | null | undefined) {
  return useQuery(conventionsQuery(repoId));
}

/** Run the extractor (sample → model → evidence check → store). Returns the fresh list. */
export function useExtractConventions(repoId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      ConventionList.parse(await api.post<unknown>(`/repos/${repoId}/conventions/extract`)),
    onSuccess: (data) => qc.setQueryData(conventionKeys.list(repoId), data),
  });
}

export interface UpdateConventionInput {
  id: string;
  patch: { status?: ConventionStatus; rule?: string };
}

/** Accept / un-accept / edit one candidate (Reject has its own hook). Optimistic; rolled back when the server refuses. */
export function useUpdateConvention(repoId: string | null | undefined) {
  const qc = useQueryClient();
  const key = conventionKeys.list(repoId);
  return useMutation({
    mutationFn: async ({ id, patch }: UpdateConventionInput) =>
      ConventionRecord.parse(await api.patch<unknown>(`/conventions/${id}`, patch)),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ConventionList>(key);
      if (previous) {
        qc.setQueryData<ConventionList>(key, {
          ...previous,
          items: previous.items.map((c) =>
            c.id === id
              ? { ...c, ...patch, edited: patch.rule !== undefined ? true : c.edited }
              : c,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSuccess: (record) => {
      const current = qc.getQueryData<ConventionList>(key);
      if (current) {
        qc.setQueryData<ConventionList>(key, {
          ...current,
          items: current.items.map((c) => (c.id === record.id ? record : c)),
        });
      }
    },
  });
}

/** Reject one candidate: stored as `rejected` (so a re-scan keeps it rejected), which the list
    no longer returns, so the card disappears at once. Optimistic; rolled back on error. */
export function useRejectConvention(repoId: string | null | undefined) {
  const qc = useQueryClient();
  const key = conventionKeys.list(repoId);
  return useMutation({
    mutationFn: async (id: string) =>
      ConventionRecord.parse(await api.patch<unknown>(`/conventions/${id}`, { status: "rejected" })),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ConventionList>(key);
      if (previous) {
        qc.setQueryData<ConventionList>(key, {
          ...previous,
          items: previous.items.filter((c) => c.id !== id),
        });
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Select all / deselect all: moves every NOT-rejected candidate to this status. */
export function useSetAllConventions(repoId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: "pending" | "accepted") =>
      ConventionList.parse(
        await api.patch<unknown>(`/repos/${repoId}/conventions/status`, { status }),
      ),
    onSuccess: (data) => qc.setQueryData(conventionKeys.list(repoId), data),
  });
}

/** Server-built markdown draft of the skill for these candidates (nothing is stored). */
export function useConventionSkillDraft(repoId: string | null | undefined) {
  return useMutation({
    mutationFn: async (ids: string[]) =>
      ConventionSkillDraft.parse(
        await api.post<unknown>(`/repos/${repoId}/conventions/skill-draft`, { ids }),
      ),
  });
}

export interface CreateConventionSkillInput {
  name: string;
  description?: string;
  type?: SkillType;
  enabled?: boolean;
  body: string;
  convention_ids: string[];
}

/** Save the (user-edited) draft as an `extracted` skill. Linking to an agent is a separate step. */
export function useCreateConventionSkill(repoId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateConventionSkillInput) =>
      ConventionSkillResult.parse(
        await api.post<unknown>(`/repos/${repoId}/conventions/skill`, input),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: skillKeys.all }),
  });
}
