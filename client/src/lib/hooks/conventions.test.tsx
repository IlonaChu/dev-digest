import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ConventionList, ConventionRecord } from "@devdigest/shared";
import { API_BASE } from "../api";
import { conventionKeys, useRejectConvention } from "./conventions";

const REPO = "00000000-0000-4000-8000-0000000000aa";

const rec = (id: string, over: Partial<ConventionRecord> = {}): ConventionRecord => ({
  id,
  repo_id: REPO,
  category: "async",
  rule: `rule ${id}`,
  evidence_path: "src/a.ts",
  evidence_start_line: 1,
  evidence_end_line: 2,
  evidence_snippet: "x",
  confidence: 0.9,
  status: "pending",
  edited: false,
  ...over,
});

const A = rec("00000000-0000-4000-8000-00000000000a");
const B = rec("00000000-0000-4000-8000-00000000000b");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

function setup(response: Response) {
  const fetchMock = vi.fn(() => Promise.resolve(response));
  vi.stubGlobal("fetch", fetchMock);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const list: ConventionList = { items: [A, B], scan: null };
  qc.setQueryData(conventionKeys.list(REPO), list);
  const { result } = renderHook(() => useRejectConvention(REPO), {
    wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
  });
  const cached = () => qc.getQueryData<ConventionList>(conventionKeys.list(REPO))!.items.map((c) => c.id);
  return { fetchMock, result, cached };
}

describe("useRejectConvention", () => {
  it("PATCHes status 'rejected' (no DELETE) and drops the card from the cached list at once", async () => {
    const { fetchMock, result, cached } = setup(json({ ...A, status: "rejected" }));
    result.current.mutate(A.id);
    await waitFor(() => expect(cached()).toEqual([B.id]));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API_BASE}/conventions/${A.id}`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ status: "rejected" });
  });

  it("puts the card back when the server refuses", async () => {
    const { result, cached } = setup(json({ error: { code: "not_found", message: "gone" } }, 404));
    result.current.mutate(A.id);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(cached()).toEqual([A.id, B.id]);
  });
});
