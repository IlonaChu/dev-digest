import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en/prReview.json";
import { RunCostBadge, type RunCostBadgeProps } from "./RunCostBadge";

afterEach(cleanup);

function renderBadge(props: RunCostBadgeProps) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <RunCostBadge {...props} />
    </NextIntlClientProvider>,
  );
}

describe("RunCostBadge", () => {
  it("compact renders the cost only", () => {
    renderBadge({ variant: "compact", costUsd: 0.014 });
    expect(screen.getByText("$0.014")).toBeInTheDocument();
  });

  it("compact with unknown cost renders an em dash, not $0.00", () => {
    renderBadge({ variant: "compact", costUsd: null });
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });

  it("compact with a real zero renders $0.00", () => {
    renderBadge({ variant: "compact", costUsd: 0 });
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("withTokens renders tokens and cost", () => {
    renderBadge({ variant: "withTokens", tokens: 9119, costUsd: 0.0013 });
    expect(screen.getByText("9 119 tok · $0.0013")).toBeInTheDocument();
  });

  it("withTokens keeps the token count when cost is unknown", () => {
    renderBadge({ variant: "withTokens", tokens: 9119, costUsd: null });
    expect(screen.getByText("9 119 tok · —")).toBeInTheDocument();
  });

  it("exposes the exact value in the tooltip so rounding hides nothing", () => {
    renderBadge({ variant: "compact", costUsd: 0.001342 });
    expect(screen.getByTitle("Run cost: $0.001342")).toBeInTheDocument();
  });
});
