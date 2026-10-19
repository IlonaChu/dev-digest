import { describe, expect, it } from "vitest";
import { acceptedConventions } from "./helpers";
import { convention } from "./fixtures";

describe("conventions helpers", () => {
  it("keeps only accepted conventions", () => {
    const items = [convention({ id: "a", status: "accepted" }), convention({ id: "b", status: "rejected" }), convention({ id: "c" })];
    expect(acceptedConventions(items).map((c) => c.id)).toEqual(["a"]);
  });
});
