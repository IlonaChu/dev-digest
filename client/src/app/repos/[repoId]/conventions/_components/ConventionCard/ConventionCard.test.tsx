import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../messages/en/conventions.json";
import { convention } from "../../fixtures";
import { ConventionCard } from "./ConventionCard";

afterEach(cleanup);

function renderCard(over: Parameters<typeof convention>[0] = {}) {
  const onStatus = vi.fn();
  const onReject = vi.fn();
  const onEditRule = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={{ conventions: messages }}>
      <ConventionCard item={convention(over)} onStatus={onStatus} onReject={onReject} onEditRule={onEditRule} />
    </NextIntlClientProvider>,
  );
  return { onStatus, onReject, onEditRule };
}

describe("ConventionCard", () => {
  it("shows the rule, the verified location and snippet, and the confidence", () => {
    renderCard({ status: "accepted" });
    expect(screen.getByText("Always use async/await instead of .then() chains")).toBeInTheDocument();
    expect(screen.getByText("src/api/users.ts:23-31")).toBeInTheDocument();
    expect(screen.getByText("const user = await db.users.find(id);")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Accepted/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("has Accept, Reject and Edit as text buttons", () => {
    renderCard();
    for (const name of ["Accept", "Reject", "Edit"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name}$`) })).toBeVisible();
    }
  });

  it("un-accepts, and rejects through onReject (not a status change)", () => {
    const { onStatus, onReject } = renderCard({ status: "accepted" });
    fireEvent.click(screen.getByRole("button", { name: /Accepted/ }));
    expect(onStatus).toHaveBeenLastCalledWith("pending");
    fireEvent.click(screen.getByRole("button", { name: /Reject/ }));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledTimes(1);
  });

  it("accepts an undecided card (the default)", () => {
    const { onStatus } = renderCard();
    expect(screen.getByRole("button", { name: /^Accept$/ })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: /^Accept$/ }));
    expect(onStatus).toHaveBeenLastCalledWith("accepted");
  });

  it("edits the rule text and saves the trimmed value", () => {
    const { onEditRule } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }));
    const input = screen.getByLabelText("Rule text");
    expect(input).toHaveValue("Always use async/await instead of .then() chains");
    fireEvent.change(input, { target: { value: "  Prefer await  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onEditRule).toHaveBeenCalledWith("Prefer await");
    expect(screen.queryByLabelText("Rule text")).not.toBeInTheDocument();
  });

  it("does not save an unchanged or empty rule, and Cancel discards", () => {
    const { onEditRule } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }));
    fireEvent.change(screen.getByLabelText("Rule text"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onEditRule).not.toHaveBeenCalled();
    expect(screen.getByText("Always use async/await instead of .then() chains")).toBeInTheDocument();
  });

  it("saves with Cmd/Ctrl+Enter and cancels with Escape", () => {
    const { onEditRule } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }));
    const area = screen.getByLabelText("Rule text");
    expect(area.tagName).toBe("TEXTAREA");
    fireEvent.change(area, { target: { value: "Prefer await" } });
    fireEvent.keyDown(area, { key: "Enter" });
    expect(onEditRule).not.toHaveBeenCalled();
    fireEvent.keyDown(area, { key: "Enter", metaKey: true });
    expect(onEditRule).toHaveBeenCalledWith("Prefer await");

    fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }));
    fireEvent.keyDown(screen.getByLabelText("Rule text"), { key: "Escape" });
    expect(screen.queryByLabelText("Rule text")).not.toBeInTheDocument();
    expect(onEditRule).toHaveBeenCalledTimes(1);
  });

  it("marks an edited rule", () => {
    renderCard({ edited: true });
    expect(screen.getByText("edited")).toBeInTheDocument();
  });

  it("copies the file location", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Copy file location" }));
    expect(writeText).toHaveBeenCalledWith("src/api/users.ts:23-31");
    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument());
  });
});
