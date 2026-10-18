"use client";

import { useSearchParams } from "next/navigation";
import { DEFAULT_STATUS, PULL_SORTS, type PullSort } from "../constants";

/**
 * PR-list filters live in the URL (?status&q&sort) so they survive reload and can be shared.
 * Writes go through `history.replaceState`, which Next syncs into `useSearchParams` without a
 * server round-trip — `router.replace` would refetch the dynamic route's RSC payload per keystroke.
 */
export function usePullListParams() {
  const search = useSearchParams();
  const rawSort = search.get("sort");
  const sort: PullSort = PULL_SORTS.includes(rawSort as PullSort) ? (rawSort as PullSort) : "newest";

  const set = (key: string, value: string, fallback: string) => {
    const sp = new URLSearchParams(search.toString());
    if (value === fallback) sp.delete(key);
    else sp.set(key, value);
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  return {
    status: search.get("status") ?? DEFAULT_STATUS,
    query: search.get("q") ?? "",
    sort,
    // "all" stays explicit (fallback "") so it sticks over the needs_review default.
    setStatus: (v: string) => set("status", v, ""),
    setQuery: (v: string) => set("q", v, ""),
    setSort: (v: string) => set("sort", v, "newest"),
  };
}
