import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../messages/en/skills.json";
import commonMessages from "../../../../../messages/en/common.json";
import { ToastProvider } from "@/lib/toast";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/hooks/skills", () => ({
  useCreateSkill: () => ({ mutate: vi.fn(), isPending: false }),
  useImportSkillPreview: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useImportSkill: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFetchSkillFromUrl: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

import { AddSkillModal } from "./AddSkillModal";

afterEach(cleanup);

function renderModal(props: Partial<React.ComponentProps<typeof AddSkillModal>> = {}) {
  const onClose = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages, common: commonMessages }}>
      <ToastProvider>
        <AddSkillModal onClose={onClose} {...props} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return onClose;
}

const tab = (name: string) => screen.getByRole("tab", { name });

describe("AddSkillModal", () => {
  it("opens on Create with the three tabs and the Create form", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toHaveTextContent("Add skill");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Create", "From file", "Import from URL"]);
    expect(tab("Create")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByText("Body (Markdown)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create skill" })).toBeInTheDocument();
  });

  it("switches between the file picker and the URL form", () => {
    renderModal();
    fireEvent.click(tab("From file"));
    expect(tab("From file")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Choose a file")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create skill" })).not.toBeInTheDocument();

    fireEvent.click(tab("Import from URL"));
    expect(screen.getByLabelText("URL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fetch" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Choose a file")).not.toBeInTheDocument();
  });

  it("can open on a given tab and closes from the X", () => {
    const onClose = renderModal({ initialTab: "url" });
    expect(tab("Import from URL")).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
