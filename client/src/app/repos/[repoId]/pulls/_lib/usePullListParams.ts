"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { DEFAULT_STATUS, PULL_SORTS, STATUS_FILTERS, type PullSort } from "../constants";

const STATUS_KEYS = new Set(STATUS_FILTERS.map((f) => f.key));

/**
 * PR-list filters live in the URL (?status&q&sort) so they survive reload and can be shared.
 * Writes go through `history.replaceState`, which Next syncs into `useSearchParams` without a
 * server round-trip — `router.replace` would refetch the dynamic route's RSC payload per keystroke.
 * Next applies that sync in a transition, and a transition cannot drive a controlled text input,
 * so the search box renders a local draft and the URL only mirrors it.
 */
export function usePullListParams() {
  const search = useSearchParams();
  const rawStatus = search.get("status");
  const rawSort = search.get("sort");
  const status = rawStatus && STATUS_KEYS.has(rawStatus) ? rawStatus : DEFAULT_STATUS;
  const sort: PullSort = PULL_SORTS.includes(rawSort as PullSort) ? (rawSort as PullSort) : "newest";
  const [query, setDraft] = React.useState(() => search.get("q") ?? "");
  const urlKey = search.toString();

  // A navigation that only changes the search params (sidebar link, `g p`) keeps this page
  // mounted, so re-read ?q when the URL changes. The live location, not `search`, is the
  // source: it already holds every keystroke this hook wrote, while `search` may still lag.
  React.useEffect(() => {
    const live = new URLSearchParams(window.location.search).get("q") ?? "";
    setDraft((d) => (d === live ? d : live));
  }, [urlKey]);

  // Built from the live location, not the render-time `search`, so a write made while an
  // earlier one is still syncing doesn't drop it.
  const write = (key: string, value: string, fallback: string) => {
    const sp = new URLSearchParams(window.location.search);
    if (value === fallback) sp.delete(key);
    else sp.set(key, value);
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  return {
    status,
    query,
    sort,
    // "all" stays explicit (fallback "") so it sticks over the needs_review default.
    setStatus: (v: string) => write("status", v, ""),
    setQuery: (v: string) => {
      setDraft(v);
      write("q", v, "");
    },
    setSort: (v: string) => write("sort", v, "newest"),
  };
}
