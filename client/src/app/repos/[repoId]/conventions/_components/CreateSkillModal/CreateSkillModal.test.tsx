import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ConventionSkillDraft } from "@devdigest/shared";
import conventionsMessages from "../../../../../../../messages/en/conventions.json";
import skillsMessages from "../../../../../../../messages/en/skills.json";
import commonMessages from "../../../../../../../messages/en/common.json";
import { ApiError } from "@/lib/api";
import { ToastProvider } from "@/lib/toast";

const h = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  pending: false,
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, replace: vi.fn() }) }));
// Mirrors useMutation: a rejected call stores its error + variables and re-renders.
vi.mock("@/lib/hooks", async () => {
  const React = await import("react");
  return {
    useCreateConventionSkill: () => {
      const [failed, setFailed] = React.useState<{ error: unknown; variables: { name: string } } | null>(null);
      return {
        mutateAsync: async (variables: { name: string }) => {
          try {
            return await h.mutateAsync(variables);
          } catch (error) {
            setFailed({ error, variables });
            throw error;
          }
        },
        isPending: h.pending,
        error: failed?.error ?? null,
        variables: failed?.variables,
      };
    },
  };
});

import { CreateSkillModal } from "./CreateSkillModal";

const DRAFT: ConventionSkillDraft = {
  name: "repo-conventions",
  description: "3 house conventions extracted from payments-api",
  type: "convention",
  body: "# repo-conventions\n\n## async-await\nAlways use async/await.\n",
  token_estimate: 20,
};
const IDS = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"];

beforeEach(() => {
  h.mutateAsync.mockReset();
  h.mutateAsync.mockResolvedValue({ skill_id: "skill-1" });
  h.pending = false;
  h.push.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderModal(onClose = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={{ conventions: conventionsMessages, skills: skillsMessages, common: commonMessages }}>
      <ToastProvider>
        <CreateSkillModal repoId="r1" repoName="payments-api" draft={DRAFT} conventionIds={IDS} onClose={onClose} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return onClose;
}

describe("CreateSkillModal", () => {
  it("opens with the draft, enabled, and the merged-from banner", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Create skill from conventions")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("repo-conventions");
    expect(screen.getByLabelText("Description")).toHaveValue(DRAFT.description);
    expect(screen.getByText(/3 accepted conventions/)).toBeInTheDocument();
    expect(screen.getByLabelText(/skill/i, { selector: "textarea" })).toHaveValue(DRAFT.body);
    expect(screen.getByText("Saved as v1 · added to Skills Lab")).toBeInTheDocument();
    expect(screen.queryByText("unsaved")).not.toBeInTheDocument();
  });

  it("creates the skill from the EDITED fields, opens it in the editor and offers to attach it to an agent", async () => {
    const onClose = renderModal();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  my-conventions " } });
    fireEvent.change(screen.getByLabelText(/skill/i, { selector: "textarea" }), { target: { value: "# edited" } });
    expect(screen.getByText("unsaved")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Create skill/ }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(h.mutateAsync).toHaveBeenCalledWith({
      name: "my-conventions",
      description: DRAFT.description,
      type: "convention",
      enabled: true,
      body: "# edited",
      convention_ids: IDS,
    });
    expect(h.push).toHaveBeenCalledWith("/skills/skill-1?tab=config");
    expect(await screen.findByText("Skill my-conventions created")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Attach to agent" }));
    expect(h.push).toHaveBeenLastCalledWith("/agents");
  });

  it("blocks Create skill without a name or body", () => {
    renderModal();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " " } });
    expect(screen.getByRole("button", { name: /Create skill/ })).toBeDisabled();
  });

  it("shows a taken name inline after the failed create and stays open", async () => {
    h.mutateAsync.mockRejectedValue(new ApiError("taken", 409, "skill_name_taken"));
    const onClose = renderModal();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Create skill/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("A skill with this name already exists");
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription(/already exists/);
    expect(onClose).not.toHaveBeenCalled();
    expect(h.push).not.toHaveBeenCalled();
  });

  it("drops the taken-name error once the name is changed", async () => {
    h.mutateAsync.mockRejectedValue(new ApiError("taken", 409, "skill_name_taken"));
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /Create skill/ }));
    await screen.findByRole("alert");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "repo-conventions-2" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("closes right away when nothing was edited", () => {
    const confirm = vi.spyOn(window, "confirm");
    const onClose = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks before discarding edits, and keeps the modal when declined", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onClose = renderModal();
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
