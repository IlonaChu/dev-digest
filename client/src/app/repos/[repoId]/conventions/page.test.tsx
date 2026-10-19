import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ConventionList, ConventionSkillDraft } from "@devdigest/shared";
import messages from "../../../../../messages/en/conventions.json";
import skillsMessages from "../../../../../messages/en/skills.json";
import commonMessages from "../../../../../messages/en/common.json";
import { ApiError } from "@/lib/api";
import { ToastProvider } from "@/lib/toast";
import { convention } from "./fixtures";

const REPO = "00000000-0000-4000-8000-0000000000aa";

const h = vi.hoisted(() => ({
  list: { data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as Record<string, unknown>,
  extractMutate: vi.fn(),
  extract: { isPending: false, isError: false, error: null } as Record<string, unknown>,
  updateMutate: vi.fn(),
  rejectMutate: vi.fn(),
  setAllMutate: vi.fn(),
  draftMutate: vi.fn(),
  notFound: false,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ repoId: "00000000-0000-4000-8000-0000000000aa" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/repos/x/conventions",
}));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/repo-not-found", () => ({ RepoNotFound: () => <div>repo not found</div> }));
vi.mock("@/lib/repo-context", () => ({
  useActiveRepo: () => ({ activeRepo: { id: "r", name: "payments-api", full_name: "acme/payments-api" } }),
  useRepoNotFound: () => h.notFound,
}));
vi.mock("@/lib/hooks", () => ({
  useConventions: () => h.list,
  useExtractConventions: () => ({ mutate: h.extractMutate, ...h.extract }),
  useUpdateConvention: () => ({ mutate: h.updateMutate }),
  useRejectConvention: () => ({ mutate: h.rejectMutate }),
  useSetAllConventions: () => ({ mutate: h.setAllMutate, isPending: false }),
  useConventionSkillDraft: () => ({ mutate: h.draftMutate, isPending: false }),
  useCreateConventionSkill: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

import ConventionsPage from "./page";

const A = convention({ id: "00000000-0000-4000-8000-00000000000a", rule: "Always use async/await", status: "accepted" });
const B = convention({ id: "00000000-0000-4000-8000-00000000000b", rule: "Redis goes through the singleton", confidence: 0.78 });

function list(items = [A, B], scan: ConventionList["scan"] = { id: "s1", sample_count: 84, found: 5, dropped: 2, model: "m", created_at: new Date().toISOString() }) {
  h.list = { data: { items, scan }, isLoading: false, isError: false, error: null, refetch: vi.fn() };
}

beforeEach(() => {
  h.list = { data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() };
  h.extract = { isPending: false, isError: false, error: null };
  h.notFound = false;
  for (const m of [h.extractMutate, h.updateMutate, h.rejectMutate, h.setAllMutate, h.draftMutate]) m.mockReset();
});
afterEach(cleanup);

function renderPage() {
  render(
    <NextIntlClientProvider locale="en" messages={{ conventions: messages, skills: skillsMessages, common: commonMessages }}>
      <ToastProvider>
        <ConventionsPage />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
}

describe("Conventions page", () => {
  it("before the first scan offers Run Scan (header and empty state), never ReScan", () => {
    list([], null);
    renderPage();
    expect(screen.getByText("No conventions extracted yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ReScan/ })).not.toBeInTheDocument();
    const runs = screen.getAllByRole("button", { name: "Run Scan" });
    expect(runs).toHaveLength(2);
    fireEvent.click(runs[0]!);
    fireEvent.click(runs[1]!);
    expect(h.extractMutate).toHaveBeenCalledTimes(2);
  });

  it("explains an empty result after a scan", () => {
    list([]);
    renderPage();
    expect(screen.getByText("No convention passed the evidence check")).toBeInTheDocument();
  });

  it("renders the heading, the scan summary, the dropped note and every card", () => {
    list();
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Conventions in payments-api");
    expect(screen.getByText(/Detected from 84 sample files · last scan/)).toBeInTheDocument();
    expect(screen.getByText(/2 proposals were dropped/)).toBeInTheDocument();
    expect(screen.getByText("Always use async/await")).toBeInTheDocument();
    expect(screen.getByText("Redis goes through the singleton")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 accepted")).toBeInTheDocument();
  });

  it("rejects through the reject mutation and accepts through the update mutation", () => {
    list();
    renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: /Reject/ })[0]!);
    expect(h.rejectMutate).toHaveBeenCalledWith(A.id);
    expect(h.updateMutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Accept$/ }));
    expect(h.updateMutate).toHaveBeenLastCalledWith({ id: B.id, patch: { status: "accepted" } });
  });

  it("deselects all, then offers select all", () => {
    list();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Deselect all/ }));
    expect(h.setAllMutate).toHaveBeenCalledWith("pending");
    cleanup();
    list([{ ...A, status: "pending" }, B]);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Select all/ }));
    expect(h.setAllMutate).toHaveBeenLastCalledWith("accepted");
  });

  it("prepares a draft from the accepted conventions only and opens the modal with it", () => {
    list();
    const draft: ConventionSkillDraft = { name: "repo-conventions", description: "d", type: "convention", body: "# b\n", token_estimate: 2 };
    h.draftMutate.mockImplementation((_ids: string[], opts: { onSuccess: (d: ConventionSkillDraft) => void }) => opts.onSuccess(draft));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Create skill/ }));
    expect(h.draftMutate.mock.calls[0]![0]).toEqual([A.id]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("repo-conventions");
  });

  it("keeps the ids the draft was built from, even if the accepted set changes while it loads", () => {
    list();
    const draft: ConventionSkillDraft = { name: "repo-conventions", description: "d", type: "convention", body: "# b\n", token_estimate: 2 };
    let resolve: (d: ConventionSkillDraft) => void = () => {};
    h.draftMutate.mockImplementation((_ids: string[], opts: { onSuccess: (d: ConventionSkillDraft) => void }) => {
      resolve = opts.onSuccess;
    });
    const ui = (
      <NextIntlClientProvider locale="en" messages={{ conventions: messages, skills: skillsMessages, common: commonMessages }}>
        <ToastProvider>
          <ConventionsPage />
        </ToastProvider>
      </NextIntlClientProvider>
    );
    const { rerender } = render(ui);
    fireEvent.click(screen.getByRole("button", { name: /Create skill/ }));
    // B gets accepted while the draft request is still in flight.
    list([A, { ...B, status: "accepted" }]);
    rerender(ui);
    act(() => resolve(draft));
    expect(screen.getByRole("note")).toHaveTextContent("Merged from 1 accepted convention");
  });

  it("after a scan offers only ReScan in the header", () => {
    list();
    renderPage();
    expect(screen.queryByRole("button", { name: "Run Scan" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ReScan" }));
    expect(h.extractMutate).toHaveBeenCalledTimes(1);
  });

  it("shows no scan button while the list is loading", () => {
    h.list = { data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() };
    renderPage();
    expect(screen.queryByRole("button", { name: /Run Scan|ReScan/ })).not.toBeInTheDocument();
  });

  it("explains a repo that is not ready to scan", () => {
    list([], null);
    h.extract = { isPending: false, isError: true, error: new ApiError("No indexed source files to analyse yet.", 409, "repo_not_ready") };
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("The repository is not ready to scan");
    expect(screen.getByRole("alert")).toHaveTextContent("No indexed source files to analyse yet.");
  });

  it("shows a load error with retry", () => {
    h.list = { data: undefined, isLoading: false, isError: true, error: new ApiError("boom", 500), refetch: vi.fn() };
    renderPage();
    expect(screen.getByText("Could not load conventions.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(h.list.refetch).toHaveBeenCalled();
  });

  it("shows the friendly state for an unknown repo", () => {
    h.notFound = true;
    renderPage();
    expect(screen.getByText("repo not found")).toBeInTheDocument();
  });
});
