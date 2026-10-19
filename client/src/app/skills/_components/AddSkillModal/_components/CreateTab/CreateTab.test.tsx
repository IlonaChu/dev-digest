import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../messages/en/skills.json";
import commonMessages from "../../../../../../../messages/en/common.json";
import { ToastProvider } from "@/lib/toast";

const h = vi.hoisted(() => ({ createMutate: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, replace: vi.fn() }) }));
vi.mock("@/lib/hooks/skills", () => ({
  useCreateSkill: () => ({ mutate: h.createMutate, isPending: false }),
}));

import { CreateTab } from "./CreateTab";

beforeEach(() => {
  h.createMutate.mockClear();
  h.push.mockClear();
});
afterEach(cleanup);

function renderTab() {
  const onDone = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages, common: commonMessages }}>
      <ToastProvider>
        <CreateTab onDone={onDone} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return onDone;
}

const submit = () => screen.getByRole("button", { name: "Create skill" });
const body = () => screen.getByPlaceholderText("# Rule Describe the rule…");

describe("AddSkillModal · CreateTab", () => {
  it("offers capitalised type labels and keeps Create disabled until name and body are filled", () => {
    renderTab();
    expect(screen.getByRole("option", { name: "Rubric" })).toBeInTheDocument();
    expect(submit()).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "my-skill" } });
    expect(submit()).toBeDisabled();
    fireEvent.change(body(), { target: { value: "# Mine" } });
    expect(submit()).toBeEnabled();
  });

  it("creates the skill enabled, then closes and opens the editor", () => {
    const onDone = renderTab();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  my-skill " } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "test" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "rubric" } });
    fireEvent.change(body(), { target: { value: "# Mine" } });
    fireEvent.click(submit());

    expect(h.createMutate.mock.calls[0]![0]).toEqual({
      name: "my-skill",
      description: "test",
      type: "rubric",
      body: "# Mine",
      enabled: true,
    });
    h.createMutate.mock.calls[0]![1].onSuccess({ id: "created1" });
    expect(onDone).toHaveBeenCalled();
    expect(h.push).toHaveBeenCalledWith("/skills/created1?tab=config");
  });
});
