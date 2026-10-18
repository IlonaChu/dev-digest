import type { SkillTab } from "../../constants";

/** Editor tab descriptor. `labelKey` resolves under the `skills` namespace. */
export interface EditorTab {
  key: SkillTab;
  labelKey: string;
}

/** Tabs of a saved skill. A new skill only offers `config` (nothing to preview or version yet). */
export const TABS: readonly EditorTab[] = [
  { key: "config", labelKey: "editor.tabs.config" },
  { key: "preview", labelKey: "editor.tabs.preview" },
  { key: "versions", labelKey: "editor.tabs.versions" },
];
