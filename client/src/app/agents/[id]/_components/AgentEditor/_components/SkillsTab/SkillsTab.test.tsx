import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { AgentSkillLink, Skill } from "@devdigest/shared";
import skillsMessages from "../../../../../../../../messages/en/skills.json";
import agentsMessages from "../../../../../../../../messages/en/agents.json";

const h = vi.hoisted(() => ({
  mutate: vi.fn(),
  skills: [] as Skill[],
  links: [] as AgentSkillLink[],
}));

vi.mock("@/lib/hooks/skills", () => ({
  useSkills: () => ({ data: h.skills, isLoading: false, isError: false, refetch: vi.fn() }),
  useAgentSkillLinks: () => ({ data: h.links, isLoading: false, isError: false, refetch: vi.fn() }),
  useSetAgentSkills: () => ({ mutate: h.mutate, isPending: false }),
}));

import { SkillsTab } from "./SkillsTab";

const skill = (id: string, name: string, over: Partial<Skill> = {}): Skill => ({
  id,
  name,
  description: "",
  type: "rubric",
  source: "manual",
  body: "b",
  enabled: true,
  version: 1,
  vetting: null,
  ...over,
});

const link = (skill_id: string, order: number, enabled = true): AgentSkillLink => ({
  agent_id: "ag1",
  skill_id,
  order,
  enabled,
});

beforeEach(() => {
  h.mutate.mockClear();
  h.skills = [skill("a", "untested-branches"), skill("b", "edge-case-checklist"), skill("c", "mock-discipline")];
  h.links = [link("a", 0), link("b", 1)];
});
afterEach(cleanup);

function renderTab() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: skillsMessages, agents: agentsMessages }}>
      <SkillsTab agentId="ag1" />
    </NextIntlClientProvider>,
  );
}

const row = (name: string) => screen.getByTestId(`skill-row-${name}`);
const checkbox = (name: string) => within(row(name)).getByRole("checkbox");
const rowNames = () => screen.getAllByTestId(/^skill-row-/).map((r) => r.getAttribute("data-testid")!.replace("skill-row-", ""));

describe("agent SkillsTab", () => {
  it("lists every skill: attached first in order, then the rest, with the count pill", () => {
    renderTab();
    expect(screen.getByText("2 of 3 enabled")).toBeInTheDocument();
    expect(rowNames()).toEqual(["untested-branches", "edge-case-checklist", "mock-discipline"]);
    expect(checkbox("untested-branches")).toBeChecked();
    expect(checkbox("edge-case-checklist")).toBeChecked();
    expect(checkbox("mock-discipline")).not.toBeChecked();
  });

  it("shows the drag hint", () => {
    renderTab();
    expect(screen.getByText(/Drag to reorder\./)).toBeInTheDocument();
  });

  it("attaches an unchecked skill at the end, enabled", () => {
    renderTab();
    fireEvent.click(checkbox("mock-discipline"));
    expect(h.mutate).toHaveBeenCalledWith({
      agentId: "ag1",
      links: [
        { skill_id: "a", enabled: true },
        { skill_id: "b", enabled: true },
        { skill_id: "c", enabled: true },
      ],
    });
  });

  it("unlinks a skill when its checkbox is cleared", () => {
    renderTab();
    fireEvent.click(checkbox("untested-branches"));
    expect(h.mutate).toHaveBeenCalledWith({ agentId: "ag1", links: [{ skill_id: "b", enabled: true }] });
  });

  it("switches a link that was saved disabled back on, in place", () => {
    h.links = [link("a", 0, false), link("b", 1)];
    renderTab();
    expect(checkbox("untested-branches")).not.toBeChecked();
    fireEvent.click(checkbox("untested-branches"));
    expect(h.mutate).toHaveBeenCalledWith({
      agentId: "ag1",
      links: [
        { skill_id: "a", enabled: true },
        { skill_id: "b", enabled: true },
      ],
    });
  });

  it("reorders by dragging a row onto another and saves the full set", () => {
    renderTab();
    fireEvent.dragStart(row("untested-branches"));
    fireEvent.dragOver(row("edge-case-checklist"));
    fireEvent.drop(row("edge-case-checklist"));
    expect(h.mutate).toHaveBeenCalledWith({
      agentId: "ag1",
      links: [
        { skill_id: "b", enabled: true },
        { skill_id: "a", enabled: true },
      ],
    });
  });

  it("cannot drag a row that is not attached", () => {
    renderTab();
    expect(row("mock-discipline")).toHaveAttribute("draggable", "false");
    expect(row("untested-branches")).toHaveAttribute("draggable", "true");
  });

  it("reorders with Alt+ArrowUp / Alt+ArrowDown on the grip", () => {
    renderTab();
    const grip = within(row("edge-case-checklist")).getByLabelText("Drag to reorder (Alt+↑/↓)");
    fireEvent.keyDown(grip, { key: "ArrowUp", altKey: true });
    expect(h.mutate).toHaveBeenCalledWith({
      agentId: "ag1",
      links: [
        { skill_id: "b", enabled: true },
        { skill_id: "a", enabled: true },
      ],
    });
    h.mutate.mockClear();
    fireEvent.keyDown(grip, { key: "ArrowUp" });
    expect(h.mutate).not.toHaveBeenCalled();
  });

  it("does nothing when nudging the first skill up", () => {
    renderTab();
    const grip = within(row("untested-branches")).getByLabelText("Drag to reorder (Alt+↑/↓)");
    fireEvent.keyDown(grip, { key: "ArrowUp", altKey: true });
    expect(h.mutate).not.toHaveBeenCalled();
  });

  it("does not save when a row is dropped on itself", () => {
    renderTab();
    fireEvent.dragStart(row("untested-branches"));
    fireEvent.drop(row("untested-branches"));
    expect(h.mutate).not.toHaveBeenCalled();
  });

  it("filters the list by name", () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Filter skills…"), { target: { value: "mock" } });
    expect(rowNames()).toEqual(["mock-discipline"]);
    fireEvent.change(screen.getByLabelText("Filter skills…"), { target: { value: "zzz" } });
    expect(screen.getByText("No skills match the filter.")).toBeInTheDocument();
  });

  it("flags a globally disabled skill and does not count it as enabled", () => {
    h.skills = [skill("a", "untested-branches", { enabled: false }), skill("b", "edge-case-checklist")];
    renderTab();
    expect(within(row("untested-branches")).getByText("disabled globally")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 enabled")).toBeInTheDocument();
  });

  it("flags a blocked imported skill, counts it out, and cannot be switched on", () => {
    h.skills = [
      skill("a", "untested-branches", {
        source: "imported",
        vetting: { status: "suspicious", findings: [], llm: null, version: 1, checked_at: "x" },
      }),
      skill("b", "edge-case-checklist"),
    ];
    h.links = [link("b", 0)];
    renderTab();
    expect(within(row("untested-branches")).getByText("blocked")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 enabled")).toBeInTheDocument();
    expect(checkbox("untested-branches")).toBeDisabled();
  });

  it("ignores a link whose skill was deleted", () => {
    h.links = [link("a", 0), link("gone", 1)];
    renderTab();
    expect(rowNames()).toHaveLength(3);
    expect(screen.getByText("1 of 3 enabled")).toBeInTheDocument();
  });
});
