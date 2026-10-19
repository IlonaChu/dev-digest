import { describe, it, expect } from "vitest";
import type { SkillImportPreview } from "@devdigest/shared";
import { importDraftState } from "./helpers";

const preview = (over: Partial<SkillImportPreview> = {}): SkillImportPreview => ({
  name: "remote-rubric",
  description: "d",
  type: "rubric",
  body: "b",
  ignored_files: [],
  vetting: { status: "clean", findings: [], llm: null, version: 1, checked_at: "x" },
  name_taken: false,
  ...over,
});

const state = (over: Partial<Parameters<typeof importDraftState>[0]> = {}) =>
  importDraftState({ preview: preview(), hasPayload: true, name: "remote-rubric", confirmed: true, ...over });

describe("importDraftState", () => {
  it("can save a confirmed, untaken name", () => {
    expect(state()).toEqual({ nameBlocked: false, blocked: false, canSave: true });
  });

  it("cannot save before the box is confirmed, without a preview or payload, or with a blank name", () => {
    expect(state({ confirmed: false }).canSave).toBe(false);
    expect(state({ preview: null }).canSave).toBe(false);
    expect(state({ hasPayload: false }).canSave).toBe(false);
    expect(state({ name: "   " }).canSave).toBe(false);
  });

  it("blocks the taken name, also with surrounding whitespace (save sends it trimmed)", () => {
    const taken = preview({ name_taken: true });
    expect(state({ preview: taken })).toMatchObject({ nameBlocked: true, canSave: false });
    expect(state({ preview: taken, name: "remote-rubric " })).toMatchObject({ nameBlocked: true, canSave: false });
    expect(state({ preview: taken, name: "  remote-rubric" })).toMatchObject({ nameBlocked: true, canSave: false });
  });

  it("lets a renamed skill save when the original name is taken", () => {
    expect(state({ preview: preview({ name_taken: true }), name: "remote-rubric-2" })).toMatchObject({
      nameBlocked: false,
      canSave: true,
    });
  });

  it("flags a non-clean vetting result as blocked but still lets it save (saved disabled)", () => {
    const suspicious = preview({ vetting: { status: "suspicious", findings: [], llm: null, version: 1, checked_at: "x" } });
    expect(state({ preview: suspicious })).toMatchObject({ blocked: true, canSave: true });
  });
});
