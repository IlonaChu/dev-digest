import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePullListParams } from "./usePullListParams";

// `lag` simulates Next syncing history.replaceState into useSearchParams late (in a transition).
const h = vi.hoisted(() => ({ lag: null as string | null }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(h.lag ?? window.location.search),
}));

function at(search: string) {
  window.history.replaceState(null, "", `/repos/r1/pulls${search}`);
}

afterEach(() => {
  h.lag = null;
  at("");
});

describe("usePullListParams", () => {
  it("defaults to needs_review / newest / empty query", () => {
    at("");
    const { result } = renderHook(() => usePullListParams());
    expect(result.current).toMatchObject({ status: "needs_review", sort: "newest", query: "" });
  });

  it("falls back to the defaults for unknown status and sort values", () => {
    at("?status=foo&sort=random");
    const { result } = renderHook(() => usePullListParams());
    expect(result.current).toMatchObject({ status: "needs_review", sort: "newest" });
  });

  it("reads valid values from the URL", () => {
    at("?status=all&sort=oldest&q=login");
    const { result } = renderHook(() => usePullListParams());
    expect(result.current).toMatchObject({ status: "all", sort: "oldest", query: "login" });
  });

  it("updates the query draft immediately and mirrors it into ?q, keeping other params", () => {
    at("?status=all");
    const { result } = renderHook(() => usePullListParams());
    act(() => result.current.setQuery("fix"));
    expect(result.current.query).toBe("fix");
    expect(window.location.search).toBe("?status=all&q=fix");
    act(() => result.current.setQuery(""));
    expect(window.location.search).toBe("?status=all");
  });

  it("resets the draft when a navigation clears ?q while the page stays mounted", () => {
    at("?q=foo");
    const { result, rerender } = renderHook(() => usePullListParams());
    expect(result.current.query).toBe("foo");
    act(() => {
      at("");
      rerender();
    });
    expect(result.current.query).toBe("");
  });

  it("keeps a draft the hook itself wrote when the URL catches up", () => {
    at("");
    const { result, rerender } = renderHook(() => usePullListParams());
    act(() => result.current.setQuery("fix"));
    act(() => rerender());
    expect(result.current.query).toBe("fix");
  });

  it("does not let a lagging useSearchParams overwrite newer typing", () => {
    at("");
    const { result, rerender } = renderHook(() => usePullListParams());
    act(() => result.current.setQuery("f"));
    act(() => result.current.setQuery("fi"));
    h.lag = "?q=f"; // Next has only synced the first keystroke
    act(() => rerender());
    expect(result.current.query).toBe("fi");
  });

  it("omits the default sort from the URL but keeps status explicit", () => {
    at("");
    const { result } = renderHook(() => usePullListParams());
    act(() => result.current.setSort("oldest"));
    act(() => result.current.setStatus("all"));
    expect(window.location.search).toBe("?sort=oldest&status=all");
    act(() => result.current.setSort("newest"));
    expect(window.location.search).toBe("?status=all");
  });
});
