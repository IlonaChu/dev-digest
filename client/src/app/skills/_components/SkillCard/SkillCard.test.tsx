import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Skill } from "@devdigest/shared";
import messages from "../../../../../messages/en/skills.json";
import { SkillCard } from "./SkillCard";

afterEach(cleanup);

const SKILL: Skill = {
  id: "s1",
  name: "pr-quality-rubric",
  description: "Rubric for evaluating overall PR quality",
  type: "rubric",
  source: "manual",
  body: "# Rubric",
  enabled: true,
  version: 5,
  vetting: null,
  agent_count: 3,
};

const IMPORTED: Skill = {
  ...SKILL,
  id: "s2",
  name: "phantom-api-gate",
  source: "imported",
  enabled: false,
  version: 1,
  vetting: { status: "malicious", findings: [], llm: null, version: 1, checked_at: "2026-10-19T10:00:00Z" },
};

function renderCard(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SkillCard", () => {
  it("shows name, type, source, description and the agent count", () => {
    renderCard(<SkillCard skill={SKILL} />);
    expect(screen.getByText("pr-quality-rubric")).toBeInTheDocument();
    expect(screen.getByText("rubric")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("Rubric for evaluating overall PR quality")).toBeInTheDocument();
    expect(screen.getByText("3 agents")).toBeInTheDocument();
  });

  it("uses the singular for one agent", () => {
    renderCard(<SkillCard skill={{ ...SKILL, agent_count: 1 }} />);
    expect(screen.getByText("1 agent")).toBeInTheDocument();
  });

  it("calls onDelete from the trash button without opening the card", () => {
    const onDelete = vi.fn();
    const onClick = vi.fn();
    renderCard(<SkillCard skill={SKILL} onDelete={onDelete} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete skill" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("has no trash button unless onDelete is given", () => {
    renderCard(<SkillCard skill={SKILL} />);
    expect(screen.queryByRole("button", { name: "Delete skill" })).not.toBeInTheDocument();
  });

  it("reports the new value when the switch is clicked, without opening the card", () => {
    const onToggle = vi.fn();
    const onClick = vi.fn();
    renderCard(<SkillCard skill={SKILL} onToggle={onToggle} onClick={onClick} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps a blocked imported skill off: the switch does nothing and a badge says why", () => {
    const onToggle = vi.fn();
    renderCard(<SkillCard skill={IMPORTED} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText("malicious")).toBeInTheDocument();
    expect(screen.getByText("Imported")).toBeInTheDocument();
  });

  it("lets an imported skill that passed the check be switched on", () => {
    const onToggle = vi.fn();
    const clean: Skill = {
      ...IMPORTED,
      vetting: { status: "clean", findings: [], llm: null, version: 1, checked_at: "2026-10-19T10:00:00Z" },
    };
    renderCard(<SkillCard skill={clean} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
