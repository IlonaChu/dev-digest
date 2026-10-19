/** Editor tab descriptor. `labelKey` resolves under the `agents` namespace. */
export interface EditorTab {
  key: string;
  labelKey: string;
}

/** Editor tabs. Evals/Stats/CI arrive with later lessons. */
export const TABS: readonly EditorTab[] = [
  { key: "config", labelKey: "editor.tabs.config" },
  { key: "skills", labelKey: "editor.tabs.skills" },
];
