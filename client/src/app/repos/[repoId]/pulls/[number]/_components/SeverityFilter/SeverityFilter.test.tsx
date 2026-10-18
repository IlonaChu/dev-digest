import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Severity } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";
import { SeverityFilter } from "./SeverityFilter";
import { countBySeverity } from "../../../_lib/severity";

afterEach(cleanup);

const COUNTS = { CRITICAL: 3, WARNING: 5, SUGGESTION: 0 };

function renderFilter(active: Severity | null = null, onChange = vi.fn(), counts = COUNTS) {
  render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <SeverityFilter counts={counts} active={active} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return onChange;
}

describe("SeverityFilter", () => {
  it("shows a count pill only for levels that exist", () => {
    renderFilter();
    const pills = screen.getByTestId("severity-counts");
    expect(pills).toHaveTextContent("3 Critical");
    expect(pills).toHaveTextContent("5 Warning");
    expect(pills).not.toHaveTextContent("Suggestion");
  });

  it("renders no pill row for a run without findings", () => {
    renderFilter(null, vi.fn(), { CRITICAL: 0, WARNING: 0, SUGGESTION: 0 });
    expect(screen.queryByTestId("severity-counts")).not.toBeInTheDocument();
  });

  it("selects a level on click", () => {
    const onChange = renderFilter();
    fireEvent.click(screen.getByRole("button", { name: /warning/i }));
    expect(onChange).toHaveBeenCalledWith("WARNING");
  });

  it("clears the filter when the active level is clicked again", () => {
    const onChange = renderFilter("CRITICAL");
    const critical = screen.getByRole("button", { name: /critical/i });
    expect(critical).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(critical);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("disables a level with no findings", () => {
    const onChange = renderFilter();
    const suggestion = screen.getByRole("button", { name: /suggestion/i });
    expect(suggestion).toBeDisabled();
    fireEvent.click(suggestion);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("countBySeverity", () => {
  it("returns zeros for an empty list", () => {
    expect(countBySeverity([])).toEqual({ CRITICAL: 0, WARNING: 0, SUGGESTION: 0 });
  });

  it("counts each level", () => {
    const findings = [
      { severity: "CRITICAL" },
      { severity: "WARNING" },
      { severity: "WARNING" },
      { severity: "SUGGESTION" },
    ] as const;
    expect(countBySeverity(findings)).toEqual({ CRITICAL: 1, WARNING: 2, SUGGESTION: 1 });
  });
});
