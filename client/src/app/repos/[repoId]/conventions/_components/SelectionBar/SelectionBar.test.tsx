import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../messages/en/conventions.json";
import { SelectionBar } from "./SelectionBar";

afterEach(cleanup);

function renderBar(props: Partial<React.ComponentProps<typeof SelectionBar>> = {}) {
  const onToggleAll = vi.fn();
  const onCreate = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={{ conventions: messages }}>
      <SelectionBar accepted={3} total={3} busy={false} creating={false} onToggleAll={onToggleAll} onCreate={onCreate} {...props} />
    </NextIntlClientProvider>,
  );
  return { onToggleAll, onCreate };
}

describe("SelectionBar", () => {
  it("shows the accepted count and deselects all", () => {
    const { onToggleAll } = renderBar();
    expect(screen.getByText("3 of 3 accepted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Deselect all/ }));
    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });

  it("offers Select all and hides Create skill while nothing is accepted", () => {
    renderBar({ accepted: 0, total: 2 });
    expect(screen.getByText("0 of 2 accepted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select all/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create skill/ })).not.toBeInTheDocument();
  });

  it("creates the skill when something is accepted", () => {
    const { onCreate } = renderBar({ accepted: 1, total: 3 });
    fireEvent.click(screen.getByRole("button", { name: /Create skill/ }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
