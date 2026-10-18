/**
 * RunHistory — the badge must reflect the review OUTCOME, not the run lifecycle.
 * Regression guard for the "green ✓ done on a run that found 5 blockers" bug:
 * a settled run is colored/labelled by its denormalized blocker/finding counts,
 * and shows the review score ring.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { RunSummary, PrFindingPreview } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";
import { RunHistory } from "./RunHistory";

afterEach(cleanup);

function run(o: Partial<RunSummary>): RunSummary {
  return {
    run_id: "run-1",
    agent_id: "a1",
    agent_name: "Security Reviewer",
    provider: "openrouter",
    model: "deepseek/deepseek-v4-flash",
    status: "done",
    error: null,
    duration_ms: 1000,
    tokens_in: 100,
    tokens_out: 50,
    cost_usd: null,
    findings_count: 0,
    grounding: "0/0 passed",
    ran_at: "2026-06-11T18:44:34.000Z",
    score: null,
    blockers: null,
    ...o,
  };
}

function finding(id: string, severity: PrFindingPreview["severity"]): PrFindingPreview {
  return {
    id,
    severity,
    category: "security",
    title: `Finding ${id}`,
    file: "src/a.ts",
    start_line: 1,
    end_line: 1,
    confidence: 0.9,
    rationale: "Because.",
  };
}

function renderRuns(runs: RunSummary[], findingsByRun?: Record<string, PrFindingPreview[]>) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <RunHistory runs={runs} findingsByRun={findingsByRun} onOpenTrace={() => {}} />
    </NextIntlClientProvider>,
  );
}

describe("RunHistory — outcome badge", () => {
  it("a done run WITH blockers reads 'rejected' (never green 'done') + shows the score ring", () => {
    renderRuns([run({ status: "done", findings_count: 5, blockers: 5, score: 0 })]);
    expect(screen.getByText("rejected")).toBeInTheDocument();
    expect(screen.queryByText("done")).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument(); // CircularScore renders the number
    expect(screen.getByText(/5 blockers/)).toBeInTheDocument();
  });

  it("a clean done run reads 'approved'", () => {
    renderRuns([run({ status: "done", findings_count: 0, blockers: 0, score: 95 })]);
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
  });

  it("a done run with non-blocking findings reads 'reviewed'", () => {
    renderRuns([run({ status: "done", findings_count: 3, blockers: 0, score: 72 })]);
    expect(screen.getByText("reviewed")).toBeInTheDocument();
    expect(screen.queryByText(/blockers/)).not.toBeInTheDocument();
  });

  it("a failed run reads 'error'", () => {
    renderRuns([run({ status: "failed", error: "boom", score: null, blockers: null })]);
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("a running run reads 'running'", () => {
    renderRuns([run({ status: "running", score: null, blockers: null })]);
    expect(screen.getByText("running")).toBeInTheDocument();
  });
});

describe("RunHistory — run cost", () => {
  it("a done run shows tokens (in+out) and cost", () => {
    renderRuns([run({ status: "done", tokens_in: 9000, tokens_out: 119, cost_usd: 0.0013 })]);
    expect(screen.getByText("9 119 tok · $0.0013")).toBeInTheDocument();
  });

  it("a done run with unknown cost shows an em dash, never $0.00", () => {
    renderRuns([run({ status: "done", cost_usd: null })]);
    expect(screen.getByText("150 tok · —")).toBeInTheDocument();
    expect(screen.queryByText(/\$0\.00/)).not.toBeInTheDocument();
  });

  it("a failed run shows no cost line", () => {
    renderRuns([run({ status: "failed", error: "429 quota", cost_usd: null })]);
    expect(screen.queryByText(/tok/)).not.toBeInTheDocument();
  });
});

describe("RunHistory — severity icons", () => {
  const FINDINGS = [finding("f1", "CRITICAL"), finding("f2", "CRITICAL"), finding("f3", "WARNING")];

  it("a done run with loaded findings shows per-severity counts instead of the count text", () => {
    renderRuns([run({ status: "done", findings_count: 3, blockers: 2, score: 38 })], { "run-1": FINDINGS });
    const counts = screen.getByLabelText("3 findings in this run");
    expect(counts).toHaveTextContent("2");
    expect(counts).toHaveTextContent("1");
    expect(screen.getByText(/2 blockers/)).toBeInTheDocument();
    expect(screen.queryByText(/finding\(s\)/)).not.toBeInTheDocument();
  });

  it("a done run without loaded findings keeps the count text", () => {
    renderRuns([run({ status: "done", findings_count: 3, blockers: 0, score: 72 })], { other: FINDINGS });
    expect(screen.getByText("3 finding(s)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/in this run/)).not.toBeInTheDocument();
  });
});
