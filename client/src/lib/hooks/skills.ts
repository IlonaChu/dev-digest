/* hooks/skills.ts — React Query hooks for the Skills page, Skill Editor, import
   flow and the agent editor's Skills tab. Skills are text only; the server owns
   the vetting policy (409 `skill_blocked` when enabling a non-clean import). */
import { queryOptions, useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { AgentSkillLink, Skill, SkillImportFile, SkillImportPreview, SkillVersion } from "@devdigest/shared";
import type { SkillType } from "@devdigest/shared";
import { api } from "../api";

const AGENT_LINKS_ALL = ["agent-skills"] as const;

export const skillKeys = {
  all: ["skills"] as const,
  detail: (id: string | null | undefined) => ["skill", id] as const,
  versions: (id: string | null | undefined) => ["skill-versions", id] as const,
  /** Prefix of every agent's link list — invalidate it when a skill's links change server-side. */
  agentLinksAll: AGENT_LINKS_ALL,
  agentLinks: (agentId: string | null | undefined) => [...AGENT_LINKS_ALL, agentId] as const,
};

/** Every `useSetAgentSkills` save shares this key + scope, so they run one after another. */
const SET_AGENT_SKILLS_KEY = ["set-agent-skills"] as const;

export const skillsQuery = () =>
  queryOptions({
    queryKey: skillKeys.all,
    queryFn: () => api.get("/skills", z.array(Skill)),
  });

export const skillQuery = (id: string | null | undefined) =>
  queryOptions({
    queryKey: skillKeys.detail(id),
    queryFn: () => api.get(`/skills/${id}`, Skill),
    enabled: !!id,
  });

export const skillVersionsQuery = (id: string | null | undefined) =>
  queryOptions({
    queryKey: skillKeys.versions(id),
    queryFn: () => api.get(`/skills/${id}/versions`, z.array(SkillVersion)),
    enabled: !!id,
  });

export const agentSkillLinksQuery = (agentId: string | null | undefined) =>
  queryOptions({
    queryKey: skillKeys.agentLinks(agentId),
    queryFn: () => api.get(`/agents/${agentId}/skills`, z.array(AgentSkillLink)),
    enabled: !!agentId,
  });

export function useSkills() {
  return useQuery(skillsQuery());
}

export function useSkill(id: string | null | undefined) {
  return useQuery(skillQuery(id));
}

export function useSkillVersions(id: string | null | undefined) {
  return useQuery(skillVersionsQuery(id));
}

export function useAgentSkillLinks(agentId: string | null | undefined) {
  return useQuery(agentSkillLinksQuery(agentId));
}

/** Number of skills attached (and switched on) per agent id; undefined while a count loads.
    Shares the `agentLinks` cache with the agent's Skills tab, so edits there update the cards. */
export function useAgentSkillCounts(agentIds: string[]): Record<string, number | undefined> {
  const results = useQueries({ queries: agentIds.map((id) => agentSkillLinksQuery(id)) });
  return Object.fromEntries(agentIds.map((id, i) => [id, results[i]?.data?.filter((l) => l.enabled).length]));
}

export interface CreateSkillInput {
  name: string;
  description?: string;
  type?: SkillType;
  body: string;
  enabled?: boolean;
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSkillInput) => api.post<Skill>("/skills", input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
      qc.setQueryData(skillKeys.detail(data.id), data);
    },
  });
}

export interface UpdateSkillInput {
  id: string;
  patch: Partial<Pick<Skill, "name" | "description" | "type" | "body" | "enabled">> & {
    version_message?: string;
  };
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateSkillInput) => api.put<Skill>(`/skills/${id}`, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
      qc.invalidateQueries({ queryKey: skillKeys.versions(data.id) });
      qc.setQueryData(skillKeys.detail(data.id), data);
    },
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>(`/skills/${id}`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
      qc.removeQueries({ queryKey: skillKeys.detail(id) });
      qc.removeQueries({ queryKey: skillKeys.versions(id) });
      // The server cascades the skill's agent links; the "N skills" counts read these lists.
      qc.invalidateQueries({ queryKey: skillKeys.agentLinksAll });
    },
  });
}

export function useRestoreSkillVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.post<Skill>(`/skills/${id}/versions/${version}/restore`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
      qc.invalidateQueries({ queryKey: skillKeys.versions(data.id) });
      qc.setQueryData(skillKeys.detail(data.id), data);
    },
  });
}

/** Re-run the safety check of an imported skill (e.g. after the LLM was down). */
export function useRevetSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Skill>(`/skills/${id}/vet`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
      qc.setQueryData(skillKeys.detail(data.id), data);
    },
  });
}

/** An uploaded file, already base64-encoded in the browser (api.ts sends JSON only). */
export interface SkillFilePayload {
  filename: string;
  content_base64: string;
}

/** Step 1 of import: parse + vet, persist NOTHING. Validated against the shared contract. */
export function useImportSkillPreview() {
  return useMutation({
    mutationFn: async (file: SkillFilePayload) =>
      SkillImportPreview.parse(await api.post<unknown>("/skills/import/preview", file)),
  });
}

export interface ImportSkillInput extends SkillFilePayload {
  name?: string;
  description?: string;
  type?: SkillType;
  /** Set when the file came from `useFetchSkillFromUrl`; the server stores it as `imported_url`. */
  source_url?: string;
}

/** Step 2 of import, after the user confirmed the preview. Saved DISABLED. */
export function useImportSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportSkillInput) => api.post<Skill>("/skills/import", input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
      qc.setQueryData(skillKeys.detail(data.id), data);
    },
  });
}

/** URL import, step 0: the server downloads the link (size- and time-capped) and hands back
    the same upload payload, so preview + import run unchanged. Stores nothing. */
export function useFetchSkillFromUrl() {
  return useMutation({
    mutationFn: async (url: string) =>
      SkillImportFile.parse(await api.post<unknown>("/skills/import/fetch", { url })),
  });
}

/** One entry of the ordered set an agent has attached. */
export interface AgentSkillLinkInput {
  skill_id: string;
  enabled: boolean;
}

/** Replace the agent's skills with this ordered set (order = array index).
    Optimistic: the cache shows the new set at once, so the next click or drag builds on it
    instead of on the last server answer. The shared scope sends the POSTs one at a time, so
    the server applies them in click order. */
export function useSetAgentSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: SET_AGENT_SKILLS_KEY,
    scope: { id: SET_AGENT_SKILLS_KEY[0] },
    mutationFn: ({ agentId, links }: { agentId: string; links: AgentSkillLinkInput[] }) =>
      api.post<AgentSkillLink[]>(`/agents/${agentId}/skills`, { links }),
    onMutate: async ({ agentId, links }) => {
      const key = skillKeys.agentLinks(agentId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<AgentSkillLink[]>(key);
      qc.setQueryData<AgentSkillLink[]>(
        key,
        links.map((l, order) => ({ agent_id: agentId, skill_id: l.skill_id, order, enabled: l.enabled })),
      );
      return { previous };
    },
    onError: (_err, { agentId }, ctx) => {
      if (ctx?.previous) qc.setQueryData(skillKeys.agentLinks(agentId), ctx.previous);
    },
    onSettled: (_d, _err, { agentId }) => {
      // agent_count on the skill cards changed
      qc.invalidateQueries({ queryKey: skillKeys.all });
      // Refetch after the LAST queued save only: an earlier refetch could land between two
      // saves and put the older set back on screen.
      if (qc.isMutating({ mutationKey: SET_AGENT_SKILLS_KEY }) === 1) {
        qc.invalidateQueries({ queryKey: skillKeys.agentLinks(agentId) });
      }
    },
  });
}
