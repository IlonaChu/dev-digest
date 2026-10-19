import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { Skill, SkillVersion } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/skills.json";
import commonMessages from "../../../../../../../messages/en/common.json";
import { API_BASE } from "@/lib/api";
import { ToastProvider } from "@/lib/toast";
import { VersionsTab } from "./VersionsTab";

const SKILL: Skill = {
  id: "s1",
  name: "pr-quality-rubric",
  description: "Rubric",
  type: "rubric",
  source: "manual",
  body: "# Rubric\nnew rule",
  enabled: true,
  version: 2,
  vetting: null,
};

const version = (v: number, body: string, message: string | null = null): SkillVersion => ({
  skill_id: "s1",
  version: v,
  body,
  description: "Rubric",
  message,
  created_at: "2026-10-19T10:00:00Z",
});

const VERSIONS = [version(1, "# Rubric\nold rule", "first"), version(2, "# Rubric\nnew rule", "tightened")];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "POST") return Promise.resolve(json({ ...SKILL, version: 3, body: "# Rubric\nold rule" }));
    if (url.endsWith("/skills/s1/versions")) return Promise.resolve(json(VERSIONS));
    return Promise.resolve(json({ error: { code: "not_found", message: url } }, 404));
  });
  vi.stubGlobal("fetch", fetchMock);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={{ skills: messages, common: commonMessages }}>
        <ToastProvider>
          <VersionsTab skill={SKILL} />
        </ToastProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  const posts = () => fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST");
  return { fetchMock, posts };
}

const row = async (label: string) => (await screen.findByText(label)).parentElement!.parentElement!;

describe("skill VersionsTab", () => {
  it("lists versions newest first; the current one has no Restore", async () => {
    setup();
    const current = await row("v2");
    const older = await row("v1");
    expect(within(current).getByText("Current")).toBeInTheDocument();
    expect(within(current).queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
    expect(within(older).getByRole("button", { name: "Restore" })).toBeInTheDocument();
    expect(screen.getAllByText(/^v\d$/).map((n) => n.textContent)).toEqual(["v2", "v1"]);
  });

  it("unfolds an older version's diff against the current text and folds it again", async () => {
    setup();
    const older = await row("v1");
    fireEvent.click(within(older).getByRole("button", { name: "Diff" }));
    const del = within(older).getByText("old rule").closest("[data-kind]");
    const add = within(older).getByText("new rule").closest("[data-kind]");
    expect(del).toHaveAttribute("data-kind", "del");
    expect(add).toHaveAttribute("data-kind", "add");
    fireEvent.click(within(older).getByRole("button", { name: "Hide" }));
    expect(within(older).queryByText("old rule")).not.toBeInTheDocument();
  });

  it("restores after the confirm: POSTs the restore and shows a toast", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { posts } = setup();
    fireEvent.click(within(await row("v1")).getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]![0]).toBe(`${API_BASE}/skills/s1/versions/1/restore`);
    expect(await screen.findByText("Restored v1 as a new version")).toBeInTheDocument();
  });

  it("sends nothing when the confirm is cancelled", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { posts } = setup();
    fireEvent.click(within(await row("v1")).getByRole("button", { name: "Restore" }));
    expect(confirm).toHaveBeenCalledWith("Restore v1? This saves a new version with that text.");
    expect(posts()).toHaveLength(0);
  });
});
