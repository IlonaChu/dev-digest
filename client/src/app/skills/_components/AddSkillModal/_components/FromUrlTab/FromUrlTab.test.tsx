import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { SkillImportFile, SkillImportPreview, SkillVetting } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/skills.json";
import commonMessages from "../../../../../../../messages/en/common.json";
import { ToastProvider } from "@/lib/toast";

const h = vi.hoisted(() => ({
  fetched: null as unknown,
  fetchError: null as Error | null,
  fetchMutate: vi.fn(),
  preview: null as unknown,
  previewMutate: vi.fn(),
  importAsync: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, replace: vi.fn() }) }));
vi.mock("@/lib/hooks/skills", () => ({
  useFetchSkillFromUrl: () => ({
    mutate: (url: string, opts: { onSuccess: (f: unknown) => void }) => {
      h.fetchMutate(url);
      if (h.fetched) opts.onSuccess(h.fetched);
    },
    isPending: false,
    isError: h.fetchError !== null,
    error: h.fetchError,
  }),
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

import { FromUrlTab } from "./FromUrlTab";

const RAW = "https://raw.githubusercontent.com/acme/skills/main/SKILL.md";
const FETCHED: SkillImportFile = { filename: "SKILL.md", content_base64: "IyBSZW1vdGU=", source_url: RAW };
const CLEAN: SkillVetting = { status: "clean", findings: [], llm: null, version: 1, checked_at: "2026-10-19T10:00:00Z" };
const PREVIEW: SkillImportPreview = {
  name: "remote-rubric",
  description: "Flag retries without a cap",
  type: "rubric",
  body: "# Remote",
  ignored_files: [],
  vetting: CLEAN,
  name_taken: false,
};

beforeEach(() => {
  h.fetched = FETCHED;
  h.fetchError = null;
  h.preview = PREVIEW;
  h.fetchMutate.mockClear();
  h.previewMutate.mockClear();
  h.importAsync.mockReset();
  h.importAsync.mockResolvedValue({ id: "new2", name: "remote-rubric" });
  h.push.mockClear();
});
afterEach(cleanup);

function renderTab() {
  const onDone = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages, common: commonMessages }}>
      <ToastProvider>
        <FromUrlTab onDone={onDone} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return onDone;
}

const urlInput = () => screen.getByLabelText("URL");
const fetchButton = () => screen.getByRole("button", { name: "Fetch" });
const saveButton = () => screen.getByRole("button", { name: "Save (disabled by default)" });

async function fetchSkill(url = "https://github.com/acme/skills/blob/main/SKILL.md") {
  fireEvent.change(urlInput(), { target: { value: `  ${url} ` } });
  fireEvent.click(fetchButton());
  await screen.findByText("Someone else's instructions");
}

describe("AddSkillModal · FromUrlTab", () => {
  it("keeps Fetch disabled until a URL is typed", () => {
    renderTab();
    expect(fetchButton()).toBeDisabled();
    fireEvent.change(urlInput(), { target: { value: "https://x.io/SKILL.md" } });
    expect(fetchButton()).toBeEnabled();
  });

  it("asks the server to download the link, previews the result and shows where it came from", async () => {
    renderTab();
    await fetchSkill();
    expect(h.fetchMutate).toHaveBeenCalledWith("https://github.com/acme/skills/blob/main/SKILL.md");
    expect(h.previewMutate).toHaveBeenCalledWith({ filename: "SKILL.md", content_base64: "IyBSZW1vdGU=" });
    expect(screen.getByText(RAW)).toBeInTheDocument();
    expect(screen.getByDisplayValue("remote-rubric")).toBeInTheDocument();
  });

  it("saves with the source URL so the skill is stored as imported_url", async () => {
    const onDone = renderTab();
    await fetchSkill();
    expect(saveButton()).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(saveButton());

    await waitFor(() => expect(h.importAsync).toHaveBeenCalled());
    expect(h.importAsync).toHaveBeenCalledWith({
      filename: "SKILL.md",
      content_base64: "IyBSZW1vdGU=",
      name: "remote-rubric",
      description: "Flag retries without a cap",
      type: "rubric",
      source_url: RAW,
    });
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/skills/new2?tab=config"));
    expect(onDone).toHaveBeenCalled();
  });

  it("'Use another URL' returns to the form with the URL kept", async () => {
    renderTab();
    await fetchSkill();
    fireEvent.click(screen.getByRole("button", { name: "Use another URL" }));
    // type="url" sanitises the value (surrounding whitespace is stripped), so the trimmed link remains
    expect(urlInput()).toHaveValue("https://github.com/acme/skills/blob/main/SKILL.md");
  });

  it("shows the server's reason when the download fails", () => {
    h.fetched = null;
    h.fetchError = new Error("Could not fetch the skill file (HTTP 404)");
    renderTab();
    expect(screen.getByText(/Could not fetch the file: Could not fetch the skill file \(HTTP 404\)/)).toBeInTheDocument();
  });
});
