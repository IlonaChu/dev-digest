import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrMeta } from "@/lib/types";
import messages from "../../../../../../../messages/en/prReview.json";
import { PRRow } from "./PRRow";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);

function pr(o: Partial<PrMeta>): PrMeta {
  return {
    id: "p1",
    number: 482,
    title: "Add rate limiting to public API endpoints",
    author: "marisa.koch",
    branch: "feat/rl",
    base: "main",
    head_sha: "abc",
    additions: 247,
    deletions: 38,
    files_count: 9,
    status: "needs_review",
    opened_at: null,
    updated_at: null,
    score: 61,
    cost_usd: 0.014,
    findings_by_agent: [],
    ...o,
  };
}

function renderRow(p: PrMeta) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <PRRow pr={p} repoId="r1" />
    </NextIntlClientProvider>,
  );
}

describe("PRRow — COST cell", () => {
  it("shows the PR's summed run cost", () => {
    renderRow(pr({ cost_usd: 0.014 }));
    expect(screen.getByText("$0.014")).toBeInTheDocument();
  });

  it("a never-reviewed PR (no cost) shows an em dash", () => {
    renderRow(pr({ score: null, cost_usd: null }));
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("PRRow — FINDINGS cell", () => {
  const f = (id: string, severity: "CRITICAL" | "WARNING") => ({
    id,
    severity,
    category: "bug" as const,
    title: id,
    file: "a.ts",
    start_line: 1,
    end_line: 1,
    confidence: 0.9,
    rationale: "r",
  });
  const agent = (id: string, findings: ReturnType<typeof f>[]) => ({
    agent_id: id,
    agent_name: id,
    run_id: `run-${id}`,
    score: 65,
    findings,
  });

  it("sums the latest run of each agent into the severity counts", () => {
    renderRow(
      pr({
        findings_by_agent: [
          agent("Sec", [f("x", "CRITICAL"), f("z", "WARNING")]),
          agent("Perf", [f("y", "CRITICAL")]),
        ],
      }),
    );
    expect(screen.getByLabelText("3 findings in the latest run of each agent")).toHaveTextContent("21");
  });

  it("shows a dash when no agent has findings", () => {
    renderRow(pr({ findings_by_agent: [agent("Sec", [])] }));
    expect(screen.queryByLabelText(/findings in the latest run/)).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("PR list columns", () => {
  it("puts FINDINGS before STATUS, as in the design mock", async () => {
    const { COLUMN_KEYS } = await import("../../constants");
    expect(COLUMN_KEYS.indexOf("findings")).toBeLessThan(COLUMN_KEYS.indexOf("status"));
    expect(COLUMN_KEYS.indexOf("findings")).toBeGreaterThan(COLUMN_KEYS.indexOf("score"));
  });
});
