/** Tabs of the Add skill dialog, in display order. */
export const ADD_SKILL_TABS = ["create", "file", "url"] as const;
export type AddSkillTab = (typeof ADD_SKILL_TABS)[number];

/** Tab → label key under the `skills` namespace. */
export const ADD_SKILL_TAB_LABEL: Record<AddSkillTab, string> = {
  create: "add.tabs.create",
  file: "add.tabs.file",
  url: "add.tabs.url",
};

export const MODAL_WIDTH = 560;
