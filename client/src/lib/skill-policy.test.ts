import { describe, it, expect } from "vitest";
import type { Skill, SkillVetting } from "@devdigest/shared";
import { blockReasonKey, requiresVetting, skillBlockReason } from "./skill-policy";

const vetting = (status: SkillVetting["status"], version = 1): SkillVetting => ({
  status,
  findings: [],
  llm: null,
  version,
  checked_at: "2026-10-19T10:00:00Z",
});

const skill = (over: Partial<Skill>): Pick<Skill, "source" | "version" | "vetting"> => ({
  source: "manual",
  version: 1,
  vetting: null,
  ...over,
});

describe("skillBlockReason", () => {
  it("never blocks a skill written in the product", () => {
    expect(skillBlockReason(skill({ source: "manual" }))).toBeNull();
    expect(skillBlockReason(skill({ source: "extracted" }))).toBeNull();
  });

  it("blocks an imported skill that was never checked", () => {
    expect(skillBlockReason(skill({ source: "imported" }))).toBe("not_checked");
  });

  it("blocks when the check ran against an older version", () => {
    expect(skillBlockReason(skill({ source: "imported", version: 2, vetting: vetting("clean", 1) }))).toBe(
      "stale_check",
    );
  });

  it.each(["suspicious", "malicious", "unverified"] as const)("blocks a %s imported skill", (status) => {
    expect(skillBlockReason(skill({ source: "imported", vetting: vetting(status) }))).toBe(status);
  });

  it("allows a clean imported skill", () => {
    expect(skillBlockReason(skill({ source: "imported", vetting: vetting("clean") }))).toBeNull();
  });

  it("treats imported_url and community as needing a check", () => {
    expect(requiresVetting("imported_url")).toBe(true);
    expect(requiresVetting("community")).toBe(true);
    expect(requiresVetting("manual")).toBe(false);
  });
});

describe("blockReasonKey", () => {
  it("maps each reason to a vetting.* message key", () => {
    expect(blockReasonKey("not_checked")).toBe("notChecked");
    expect(blockReasonKey("stale_check")).toBe("stale");
    expect(blockReasonKey("malicious")).toBe("summary.malicious");
  });
});
