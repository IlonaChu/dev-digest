import { describe, it, expect, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AgentSkillLink } from "@devdigest/shared";
import { skillKeys, useDeleteSkill, useSetAgentSkills } from "./skills";

const AGENT = "ag1";
const link = (skill_id: string, order: number): AgentSkillLink => ({ agent_id: AGENT, skill_id, order, enabled: true });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

/** A fetch whose POSTs stay open until `release()` answers them, in arrival order. */
function deferredFetch() {
  const pending: { body: unknown; answer: (r: Response) => void }[] = [];
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method !== "POST") return Promise.resolve(json([]));
    return new Promise<Response>((answer) => {
      const body = JSON.parse(init.body as string) as { links: { skill_id: string }[] };
      pending.push({ body, answer });
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  const release = (status = 200) => {
    const next = pending.shift()!;
    const links = (next.body as { links: { skill_id: string }[] }).links.map((l, i) => link(l.skill_id, i));
    next.answer(status === 200 ? json(links) : json({ error: { code: "boom", message: "boom" } }, status));
  };
  return { fetchMock, pending, release };
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  qc.setQueryData(skillKeys.agentLinks(AGENT), [link("a", 0), link("b", 1)]);
  const { result } = renderHook(() => useSetAgentSkills(), {
    wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
  });
  const cached = () => qc.getQueryData<AgentSkillLink[]>(skillKeys.agentLinks(AGENT))!.map((l) => l.skill_id);
  return { qc, result, cached };
}

describe("useSetAgentSkills", () => {
  it("shows the new ordered set in the cache before the server answers", async () => {
    const { release } = deferredFetch();
    const { result, cached } = setup();
    act(() => result.current.mutate({ agentId: AGENT, links: [{ skill_id: "b", enabled: true }, { skill_id: "a", enabled: true }] }));
    await waitFor(() => expect(cached()).toEqual(["b", "a"]));
    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("sends a second save only after the first one is answered", async () => {
    const { pending, release } = deferredFetch();
    const { result, cached } = setup();
    act(() => result.current.mutate({ agentId: AGENT, links: [{ skill_id: "a", enabled: true }, { skill_id: "b", enabled: true }, { skill_id: "c", enabled: true }] }));
    await waitFor(() => expect(pending).toHaveLength(1));
    act(() => result.current.mutate({ agentId: AGENT, links: [{ skill_id: "a", enabled: true }, { skill_id: "b", enabled: true }, { skill_id: "c", enabled: true }, { skill_id: "d", enabled: true }] }));
    await waitFor(() => expect(cached()).toEqual(["a", "b", "c", "d"]));
    expect(pending).toHaveLength(1);
    release();
    await waitFor(() => expect(pending).toHaveLength(1));
    expect(pending[0]!.body).toEqual({
      links: ["a", "b", "c", "d"].map((skill_id) => ({ skill_id, enabled: true })),
    });
    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cached()).toEqual(["a", "b", "c", "d"]);
  });

  it("puts the previous set back when the server refuses", async () => {
    const { release } = deferredFetch();
    const { result, cached } = setup();
    act(() => result.current.mutate({ agentId: AGENT, links: [{ skill_id: "a", enabled: true }] }));
    await waitFor(() => expect(cached()).toEqual(["a"]));
    release(500);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(cached()).toEqual(["a", "b"]);
  });

  it("keeps the queued save's set when an earlier save fails", async () => {
    const { pending, release } = deferredFetch();
    const { result, cached } = setup();
    act(() => result.current.mutate({ agentId: AGENT, links: [{ skill_id: "a", enabled: true }, { skill_id: "b", enabled: true }, { skill_id: "c", enabled: true }] }));
    await waitFor(() => expect(pending).toHaveLength(1));
    act(() => result.current.mutate({ agentId: AGENT, links: [{ skill_id: "a", enabled: true }, { skill_id: "b", enabled: true }, { skill_id: "c", enabled: true }, { skill_id: "d", enabled: true }] }));
    await waitFor(() => expect(cached()).toEqual(["a", "b", "c", "d"]));
    release(500);
    await waitFor(() => expect(pending).toHaveLength(1));
    expect(cached()).toEqual(["a", "b", "c", "d"]);
    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteSkill", () => {
  it("invalidates every agent's link list (the server cascades the links)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ ok: true }))));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(skillKeys.agentLinks("ag1"), [link("a", 0)]);
    qc.setQueryData(skillKeys.agentLinks("ag2"), [link("a", 0)]);
    const { result } = renderHook(() => useDeleteSkill(), {
      wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
    });
    act(() => result.current.mutate("a"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(qc.getQueryState(skillKeys.agentLinks("ag1"))!.isInvalidated).toBe(true);
    expect(qc.getQueryState(skillKeys.agentLinks("ag2"))!.isInvalidated).toBe(true);
  });
});
