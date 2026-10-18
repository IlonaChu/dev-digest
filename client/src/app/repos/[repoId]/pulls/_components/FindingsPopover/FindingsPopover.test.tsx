import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrAgentFindings, PrFindingPreview } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/prReview.json";
import { FindingsPopover } from "./FindingsPopover";
import { flattenGroups, popoverPosition, sortPreviews, formatLocation } from "./helpers";

afterEach(cleanup);

const F = (o: Partial<PrFindingPreview>): PrFindingPreview => ({
  id: "f1",
  severity: "CRITICAL",
  category: "security",
  title: "Hardcoded secret",
  file: "src/config.ts",
  start_line: 11,
  end_line: 11,
  confidence: 0.95,
  rationale: "A secret is committed.",
  ...o,
});

const FINDINGS = [
  F({ id: "a", severity: "SUGGESTION", title: "Rename var", confidence: 0.5, start_line: 3, end_line: 5 }),
  F({ id: "b" }),
  F({ id: "c", severity: "WARNING", title: "N+1 query", category: "perf" }),
];

function renderCell(findings: PrFindingPreview[] | null | undefined) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <FindingsPopover findings={findings} />
    </NextIntlClientProvider>,
  );
}

const G = (o: Partial<PrAgentFindings>): PrAgentFindings => ({
  agent_id: "a1",
  agent_name: "Security reviewer",
  run_id: "r1",
  score: 65,
  findings: [],
  ...o,
});

const GROUPS = [
  G({ findings: FINDINGS }),
  G({
    agent_id: "a2",
    agent_name: "Perf reviewer",
    run_id: "r2",
    findings: [F({ id: "d", severity: "WARNING", title: "Unbounded loop" }), F({ id: "e", title: "SQL injection" })],
  }),
];

function renderGroups(groups: PrAgentFindings[] | null | undefined) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <FindingsPopover groups={groups} />
    </NextIntlClientProvider>,
  );
}

describe("FindingsPopover", () => {
  it("shows an em dash for a PR without findings", () => {
    renderCell([]);
    expect(screen.getByText("—")).toBeInTheDocument();
    cleanup();
    renderCell(undefined);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("opens the 'N FINDINGS IN THIS RUN' popover on hover and closes on leave", () => {
    renderCell(FINDINGS);
    expect(screen.queryByTestId("findings-popover")).not.toBeInTheDocument();
    const trigger = screen.getByLabelText("3 findings in the latest run");
    fireEvent.mouseEnter(trigger);
    const pop = screen.getByTestId("findings-popover");
    expect(within(pop).getByText("3 FINDINGS IN THIS RUN")).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByTestId("findings-popover")).not.toBeInTheDocument();
  });

  it("previews are read-only: text only, no buttons", () => {
    renderCell(FINDINGS);
    fireEvent.mouseEnter(screen.getByLabelText("3 findings in the latest run"));
    const pop = screen.getByTestId("findings-popover");
    expect(within(pop).queryAllByRole("button")).toHaveLength(0);
    expect(within(pop).getByText("Hardcoded secret")).toBeInTheDocument();
    expect(within(pop).getAllByText("security").length).toBeGreaterThan(0);
    expect(within(pop).getAllByText("src/config.ts:11").length).toBeGreaterThan(0);
    expect(within(pop).getAllByText("95% confidence").length).toBeGreaterThan(0);
    expect(within(pop).getAllByText("A secret is committed.").length).toBeGreaterThan(0);
  });
});

describe("FindingsPopover — latest run of each agent (PR list)", () => {
  it("sums every agent's findings into the severity counts", () => {
    renderGroups(GROUPS);
    const trigger = screen.getByLabelText("5 findings in the latest run of each agent");
    // CRITICAL: b + e, WARNING: c + d, SUGGESTION: a
    expect(trigger).toHaveTextContent("221");
  });

  it("opens one section per agent, titled with the total and the agent count", () => {
    renderGroups(GROUPS);
    fireEvent.mouseEnter(screen.getByLabelText("5 findings in the latest run of each agent"));
    const pop = screen.getByTestId("findings-popover");
    expect(within(pop).getByText("5 FINDINGS · 2 AGENTS")).toBeInTheDocument();
    const sec = within(pop).getByRole("region", { name: "Security reviewer" });
    expect(within(sec).getByText("Security reviewer · 3")).toBeInTheDocument();
    expect(within(sec).getByText("N+1 query")).toBeInTheDocument();
    expect(within(sec).queryByText("Unbounded loop")).not.toBeInTheDocument();
    const perf = within(pop).getByRole("region", { name: "Perf reviewer" });
    expect(within(perf).getByText("Perf reviewer · 2")).toBeInTheDocument();
    expect(within(perf).getByText("Unbounded loop")).toBeInTheDocument();
    expect(within(pop).queryAllByRole("button")).toHaveLength(0);
  });

  it("labels a missing agent and shows an agent whose latest run found nothing", () => {
    renderGroups([G({ agent_id: null, agent_name: null, findings: [F({})] }), G({ agent_id: "a3", agent_name: "Clean" })]);
    fireEvent.mouseEnter(screen.getByLabelText("1 finding in the latest run of each agent"));
    const pop = screen.getByTestId("findings-popover");
    expect(within(pop).getByText("Unknown agent · 1")).toBeInTheDocument();
    const clean = within(pop).getByRole("region", { name: "Clean" });
    expect(within(clean).getByText("No findings")).toBeInTheDocument();
  });

  it("shows an em dash when no agent has findings", () => {
    renderGroups([G({})]);
    expect(screen.getByText("—")).toBeInTheDocument();
    cleanup();
    renderGroups(undefined);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("helpers", () => {
  it("sorts most severe first and formats line ranges", () => {
    expect(sortPreviews(FINDINGS).map((f) => f.id)).toEqual(["b", "c", "a"]);
    expect(formatLocation(FINDINGS[0]!)).toBe("src/config.ts:3-5");
  });

  it("flattens agent sections in order", () => {
    expect(flattenGroups(GROUPS).map((f) => f.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(flattenGroups([])).toEqual([]);
  });

  it("opens below in the upper half and above in the lower half, clamped to the viewport", () => {
    const vp = { width: 1000, height: 800 };
    expect(popoverPosition({ left: 900, top: 100, bottom: 120 }, vp)).toEqual({ left: 548, top: 126 });
    expect(popoverPosition({ left: 10, top: 700, bottom: 720 }, vp)).toEqual({ left: 12, bottom: 94 });
  });
});
