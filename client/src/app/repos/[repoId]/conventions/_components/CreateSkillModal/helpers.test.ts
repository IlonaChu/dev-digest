import { describe, expect, it } from "vitest";
import type { ConventionSkillDraft } from "@devdigest/shared";
import { canSubmit, formFromDraft, isDirty } from "./helpers";

const DRAFT: ConventionSkillDraft = {
  name: "repo-conventions",
  description: "3 house conventions extracted from payments-api",
  type: "convention",
  body: "# repo-conventions\n",
  token_estimate: 7,
};

describe("create-skill form", () => {
  it("starts from the draft, enabled", () => {
    expect(formFromDraft(DRAFT)).toEqual({
      name: DRAFT.name,
      description: DRAFT.description,
      type: "convention",
      enabled: true,
      body: DRAFT.body,
    });
  });

  it("is dirty only after an edit", () => {
    const initial = formFromDraft(DRAFT);
    expect(isDirty(initial, initial)).toBe(false);
    expect(isDirty({ ...initial, body: `${initial.body}x` }, initial)).toBe(true);
    expect(isDirty({ ...initial, enabled: false }, initial)).toBe(true);
  });

  it("needs a name and a body", () => {
    const f = formFromDraft(DRAFT);
    expect(canSubmit(f)).toBe(true);
    expect(canSubmit({ ...f, name: "  " })).toBe(false);
    expect(canSubmit({ ...f, body: "" })).toBe(false);
  });
});
