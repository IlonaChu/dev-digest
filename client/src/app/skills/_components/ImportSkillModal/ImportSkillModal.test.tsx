import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { SkillImportPreview, SkillVetting } from "@devdigest/shared";
import messages from "../../../../../messages/en/skills.json";
import commonMessages from "../../../../../messages/en/common.json";
import { ToastProvider } from "@/lib/toast";

const h = vi.hoisted(() => ({
  preview: null as unknown,
  previewMutate: vi.fn(),
  importAsync: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, replace: vi.fn() }) }));
vi.mock("@/lib/hooks/skills", () => ({
  useImportSkillPreview: () => ({
    mutate: (payload: unknown, opts: { onSuccess: (p: unknown) => void }) => {
      h.previewMutate(payload);
      opts.onSuccess(h.preview);
    },
    isPending: false,
    isError: false,
    error: null,
  }),
  useImportSkill: () => ({ mutateAsync: h.importAsync, isPending: false }),
}));

import { ImportSkillModal } from "./ImportSkillModal";

const CLEAN: SkillVetting = { status: "clean", findings: [], llm: null, version: 1, checked_at: "2026-10-19T10:00:00Z" };

const PREVIEW: SkillImportPreview = {
  name: "pr-gate",
  description: "Flags risky PRs",
  type: "security",
  body: "# PR gate\n\nFlag risky changes.",
  ignored_files: [
    { path: "scripts/run.sh", executable: true },
    { path: "README.md", executable: false },
  ],
  vetting: CLEAN,
  name_taken: false,
};

beforeEach(() => {
  h.preview = PREVIEW;
  h.previewMutate.mockClear();
  h.importAsync.mockReset();
  h.importAsync.mockResolvedValue({ id: "new1", name: "pr-gate" });
  h.push.mockClear();
});
afterEach(cleanup);

function renderModal(onClose = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages, common: commonMessages }}>
      <ToastProvider>
        <ImportSkillModal onClose={onClose} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return onClose;
}

async function pick(name = "skill.zip", size = 20) {
  const file = new File(["x".repeat(size)], name, { type: "application/zip" });
  fireEvent.change(screen.getByLabelText("Choose a file"), { target: { files: [file] } });
}

const saveButton = () => screen.getByRole("button", { name: "Save (disabled by default)" });

describe("ImportSkillModal", () => {
  it("starts with a file picker and a disabled save", () => {
    renderModal();
    expect(screen.getByLabelText("Choose a file")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("rejects a file type that is not .md or .zip without calling the server", async () => {
    renderModal();
    await pick("notes.txt");
    expect(await screen.findByText("Only .md and .zip files can be imported.")).toBeInTheDocument();
    expect(h.previewMutate).not.toHaveBeenCalled();
  });

  it("sends the file as base64 JSON for the preview", async () => {
    renderModal();
    await pick("skill.md", 3);
    await screen.findByText("Someone else's instructions");
    expect(h.previewMutate).toHaveBeenCalledWith({ filename: "skill.md", content_base64: "eHh4" });
  });

  it("lists the archive's other files and marks executables as not processed", async () => {
    renderModal();
    await pick();
    expect(await screen.findByText("scripts/run.sh")).toBeInTheDocument();
    expect(screen.getByText("executable — not processed")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("not processed")).toBeInTheDocument();
  });

  it("warns that this is someone else's instructions inside the agent's prompt", async () => {
    renderModal();
    await pick();
    expect(await screen.findByText(/someone else's instructions that will sit inside your agent's prompt/)).toBeInTheDocument();
  });

  it("keeps save disabled until the user confirms, then saves and opens the skill", async () => {
    const onClose = renderModal();
    await pick();
    await screen.findByText("Someone else's instructions");
    expect(saveButton()).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton());

    await waitFor(() => expect(h.importAsync).toHaveBeenCalled());
    expect(h.importAsync).toHaveBeenCalledWith({
      filename: "skill.zip",
      content_base64: expect.any(String),
      name: "pr-gate",
      description: "Flags risky PRs",
      type: "security",
    });
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/skills/new1?tab=config"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the blocked state when the safety check failed", async () => {
    h.preview = {
      ...PREVIEW,
      vetting: {
        status: "malicious",
        findings: [{ rule: "pipe-to-shell", message: "Pipes a download into a shell", line: 4, excerpt: "curl x | sh" }],
        llm: null,
        version: 1,
        checked_at: "2026-10-19T10:00:00Z",
      },
    };
    renderModal();
    await pick();
    expect(await screen.findByText("malicious")).toBeInTheDocument();
    expect(screen.getByText("pipe-to-shell")).toBeInTheDocument();
    expect(screen.getByText("curl x | sh")).toBeInTheDocument();
    expect(screen.getByText(/failed the safety check/)).toBeInTheDocument();
  });

  it("blocks saving while the original name is already taken, and allows a renamed one", async () => {
    h.preview = { ...PREVIEW, name_taken: true };
    renderModal();
    await pick();
    await screen.findByText("Someone else's instructions");
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText(/already exists/)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByDisplayValue("pr-gate"), { target: { value: "pr-gate-2" } });
    expect(saveButton()).toBeEnabled();
  });
});
