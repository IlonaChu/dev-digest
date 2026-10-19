import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Skill } from "@devdigest/shared";
import messages from "../../../../../messages/en/skills.json";

const h = vi.hoisted(() => ({
  skills: undefined as Skill[] | undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/hooks/skills", () => ({
  useSkills: () => ({ data: h.skills, isLoading: h.isLoading, isError: h.isError, refetch: h.refetch }),
  useUpdateSkill: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSkill: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { SkillsSidebar } from "./SkillsSidebar";

const skill = (id: string, name: string): Skill => ({
  id,
  name,
  description: "",
  type: "rubric",
  source: "manual",
  body: "b",
  enabled: true,
  version: 1,
  vetting: null,
});

beforeEach(() => {
  h.skills = [skill("s1", "untested-branches"), skill("s2", "mock-discipline")];
  h.isLoading = false;
  h.isError = false;
  h.refetch.mockClear();
});
afterEach(cleanup);

function renderSidebar(activeId?: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      <SkillsSidebar activeId={activeId} />
    </NextIntlClientProvider>,
  );
}

describe("SkillsSidebar", () => {
  it("links every card to its editor's Config tab and marks the open one", () => {
    renderSidebar("s2");
    expect(screen.getByRole("link", { name: "untested-branches" })).toHaveAttribute("href", "/skills/s1?tab=config");
    expect(screen.getByRole("link", { name: "mock-discipline" })).toHaveAttribute("aria-current", "page");
  });

  it("says 'No skills match.' only when a search finds nothing", () => {
    h.skills = [];
    renderSidebar();
    expect(screen.queryByText("No skills match.")).not.toBeInTheDocument();
    cleanup();
    h.skills = [skill("s1", "untested-branches")];
    renderSidebar();
    fireEvent.change(screen.getByLabelText("Search skills…"), { target: { value: "zzz" } });
    expect(screen.getByText("No skills match.")).toBeInTheDocument();
  });

  it("shows a load error with Retry instead of the no-match text", () => {
    h.skills = undefined;
    h.isError = true;
    renderSidebar();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load skills.");
    expect(screen.queryByText("No skills match.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(h.refetch).toHaveBeenCalled();
  });
});
