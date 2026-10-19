import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Skill } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/skills.json";
import commonMessages from "../../../../../../../messages/en/common.json";
import { ToastProvider } from "@/lib/toast";

const h = vi.hoisted(() => ({
  updateMutate: vi.fn(),
  revetMutate: vi.fn(),
}));

vi.mock("@/lib/hooks/skills", () => ({
  useUpdateSkill: () => ({ mutate: h.updateMutate, isPending: false, isSuccess: false, data: undefined }),
  useRevetSkill: () => ({ mutate: h.revetMutate, isPending: false }),
}));

import { ConfigTab } from "./ConfigTab";

const SKILL: Skill = {
  id: "s1",
  name: "pr-quality-rubric",
  description: "Rubric for PR quality",
  type: "rubric",
  source: "manual",
  body: "# Rubric\n\nCheck things.",
  enabled: true,
  version: 5,
  vetting: null,
};

beforeEach(() => {
  h.updateMutate.mockClear();
  h.revetMutate.mockClear();
});
afterEach(cleanup);

function renderTab(skill: Skill) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages, common: commonMessages }}>
      <ToastProvider>
        <ConfigTab skill={skill} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
}

const body = () => screen.getByLabelText("Skill body (Markdown)");
const save = () => screen.getByRole("button", { name: "Save skill" });

describe("skill ConfigTab", () => {
  it("explains that the description is the skill's interface and should be a directive", () => {
    renderTab(SKILL);
    expect(screen.getByText(/Write it as a directive/)).toBeInTheDocument();
  });

  it("starts clean: save disabled, no unsaved badge, no change note", () => {
    renderTab(SKILL);
    expect(save()).toBeDisabled();
    expect(screen.queryByText("unsaved")).not.toBeInTheDocument();
    expect(screen.queryByText("Change note")).not.toBeInTheDocument();
  });

  it("shows the change note only once the body is edited", () => {
    renderTab(SKILL);
    fireEvent.change(body(), { target: { value: "# Rubric\n\nCheck more things." } });
    expect(screen.getByText("unsaved")).toBeInTheDocument();
    expect(screen.getByText("Change note")).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it("shows the change note when only the description is edited", () => {
    renderTab(SKILL);
    fireEvent.change(screen.getByDisplayValue("Rubric for PR quality"), { target: { value: "Use when reviewing tests." } });
    expect(screen.getByText("Change note")).toBeInTheDocument();
  });

  it("does not offer a change note for a rename (it does not create a version)", () => {
    renderTab(SKILL);
    fireEvent.change(screen.getByDisplayValue("pr-quality-rubric"), { target: { value: "pr-rubric" } });
    expect(screen.queryByText("Change note")).not.toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it("saves only the changed fields plus the change note", () => {
    renderTab(SKILL);
    fireEvent.change(body(), { target: { value: "new body" } });
    fireEvent.change(screen.getByPlaceholderText("Tightened the scope rule"), { target: { value: "Tightened scope" } });
    fireEvent.click(save());
    expect(h.updateMutate).toHaveBeenCalledTimes(1);
    expect(h.updateMutate.mock.calls[0]![0]).toEqual({
      id: "s1",
      patch: { body: "new body", version_message: "Tightened scope" },
    });
  });

  it("omits the version message when the note is blank", () => {
    renderTab(SKILL);
    fireEvent.change(body(), { target: { value: "new body" } });
    fireEvent.click(save());
    expect(h.updateMutate.mock.calls[0]![0]).toEqual({ id: "s1", patch: { body: "new body" } });
  });

  it("saves the enabled switch on its own, without touching the Save button", () => {
    renderTab(SKILL);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("switch"));
    expect(h.updateMutate).toHaveBeenCalledTimes(1);
    expect(h.updateMutate.mock.calls[0]![0]).toEqual({ id: "s1", patch: { enabled: false } });
    expect(save()).toBeDisabled();
    expect(screen.queryByText("unsaved")).not.toBeInTheDocument();
  });

  it("shows the saved enabled state, so a flip from the list card is reflected here", () => {
    const { rerender } = renderTab(SKILL);
    rerender(
      <NextIntlClientProvider locale="en" messages={{ skills: messages, common: commonMessages }}>
        <ToastProvider>
          <ConfigTab skill={{ ...SKILL, enabled: false }} />
        </ToastProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(save()).toBeDisabled();
  });

  it("locks the switch and explains why for an imported skill that failed the check", () => {
    renderTab({
      ...SKILL,
      source: "imported",
      enabled: false,
      version: 1,
      vetting: { status: "malicious", findings: [], llm: null, version: 1, checked_at: "2026-10-19T10:00:00Z" },
    });
    fireEvent.click(screen.getByRole("switch"));
    expect(h.updateMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/Cannot be enabled/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Re-run check" }));
    expect(h.revetMutate).toHaveBeenCalled();
  });
});
