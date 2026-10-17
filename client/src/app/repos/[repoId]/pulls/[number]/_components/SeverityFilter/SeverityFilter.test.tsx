import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Severity } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";
import { SeverityFilter } from "./SeverityFilter";
import { countBySeverity, parseSeverity } from "./helpers";

afterEach(cleanup);

const COUNTS = { CRITICAL: 3, WARNING: 5, SUGGESTION: 0 };

function renderFilter(active: Severity | null = null, onChange = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <SeverityFilter counts={COUNTS} active={active} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return onChange;
}

describe("SeverityFilter", () => {
  it("shows a count for each level", () => {
    renderFilter();
    expect(screen.getByRole("button", { name: /critical 3/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /warning 5/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /suggestion 0/i })).toBeInTheDocument();
  });

  it("selects a level on click", () => {
    const onChange = renderFilter();
    fireEvent.click(screen.getByRole("button", { name: /warning 5/i }));
    expect(onChange).toHaveBeenCalledWith("WARNING");
  });

  it("clears the filter when the active level is clicked again", () => {
    const onChange = renderFilter("CRITICAL");
    const critical = screen.getByRole("button", { name: /critical 3/i });
    expect(critical).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(critical);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("disables a level with no findings", () => {
    const onChange = renderFilter();
    const suggestion = screen.getByRole("button", { name: /suggestion 0/i });
    expect(suggestion).toBeDisabled();
    fireEvent.click(suggestion);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("offers a clear button only while a filter is active", () => {
    const onChange = renderFilter("WARNING");
    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(onChange).toHaveBeenCalledWith(null);
    cleanup();
    renderFilter();
    expect(screen.queryByRole("button", { name: "Clear filter" })).not.toBeInTheDocument();
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

describe("parseSeverity", () => {
  it("accepts known levels", () => {
    expect(parseSeverity("CRITICAL")).toBe("CRITICAL");
  });

  it("treats unknown, lowercase and missing values as no filter", () => {
    expect(parseSeverity("bogus")).toBeNull();
    expect(parseSeverity("critical")).toBeNull();
    expect(parseSeverity(null)).toBeNull();
  });
});
