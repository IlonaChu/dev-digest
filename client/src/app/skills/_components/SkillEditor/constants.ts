import type { IconName } from "@devdigest/ui";
import type { SkillTab } from "../../constants";

/** Editor tab descriptor. `labelKey` resolves under the `skills` namespace. */
export interface EditorTab {
  key: SkillTab;
  labelKey: string;
  icon: IconName;
}

/** Editor tabs, in display order. */
export const TABS: readonly EditorTab[] = [
  { key: "config", labelKey: "editor.tabs.config", icon: "Settings" },
  { key: "preview", labelKey: "editor.tabs.preview", icon: "Eye" },
  { key: "versions", labelKey: "editor.tabs.versions", icon: "Clock" },
];
