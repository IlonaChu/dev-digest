import { describe, it, expect, afterEach, vi } from "vitest";
import { z } from "zod";
import { api, apiFetch, ApiError, API_BASE } from "./api";

const Item = z.object({ id: z.string(), count: z.number() });

function mockFetch(response: Response | Error) {
  const fn = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("returns the schema-parsed body for a matching response", async () => {
    const fetchMock = mockFetch(json({ id: "a", count: 2, extra: true }));
    await expect(api.get("/items/a", Item)).resolves.toEqual({ id: "a", count: 2 });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/items/a`, expect.anything());
  });

  it("throws ApiError 502 invalid_response with Zod issues when the shape drifts", async () => {
    mockFetch(json({ id: "a", count: "2" }));
    const err = await api.get("/items/a", Item).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 502, code: "invalid_response" });
    expect((err as ApiError).details).toEqual([expect.objectContaining({ path: ["count"] })]);
  });

  it("passes the body through unvalidated when no schema is given", async () => {
    mockFetch(json({ anything: 1 }));
    await expect(api.get("/raw")).resolves.toEqual({ anything: 1 });
  });

  it("maps the API error envelope onto ApiError", async () => {
    mockFetch(json({ error: { code: "not_found", message: "PR missing", details: { id: 1 } } }, 404));
    await expect(api.get("/pulls/1", Item)).rejects.toMatchObject({
      status: 404,
      code: "not_found",
      message: "PR missing",
      details: { id: 1 },
    });
  });

  it("turns a network failure into ApiError status 0", async () => {
    mockFetch(new TypeError("fetch failed"));
    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 0, code: "network_error" });
  });

  it("sends a JSON content-type only when there is a body", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 204 }));
    await api.post("/repos/1/refresh");
    await api.post("/repos", { url: "x" });
    const headers = fetchMock.mock.calls.map((c) => (c as unknown as [string, RequestInit])[1].headers);
    expect(headers[0]).toEqual({});
    expect(headers[1]).toEqual({ "content-type": "application/json" });
  });
});
