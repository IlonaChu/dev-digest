import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePullListParams } from "./usePullListParams";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

function at(search: string) {
  window.history.replaceState(null, "", `/repos/r1/pulls${search}`);
}

afterEach(() => at(""));

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
