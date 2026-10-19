/** Constants for the conventions module. */

/** How many ranked source files go to the model (plus the config files). */
export const SAMPLE_FILE_COUNT = 12;

/** Per-file read caps — a clone is untrusted input and the prompt has a budget. */
export const MAX_SAMPLE_LINES = 220;
export const MAX_SAMPLE_BYTES = 12_000;
export const MAX_CONFIG_BYTES = 4_000;
/** Total characters of file content put into one prompt. */
export const MAX_PROMPT_CHARS = 90_000;

/** Config files looked up in the clone root (exact names or a prefix + extension). */
export const CONFIG_FILE_NAMES = new Set([
  'tsconfig.json',
  '.editorconfig',
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yaml',
  '.eslintrc.yml',
]);
export const CONFIG_FILE_PREFIXES = ['eslint.config.', 'prettier.config.', 'tsconfig.'];

/** Evidence limits. */
export const MAX_EVIDENCE_LINES = 40;
export const MIN_CONFIDENCE = 0.5;
/** Lines of the cited range kept as the stored/displayed snippet. */
export const MAX_SNIPPET_LINES = 12;

/** Skill draft. */
export const MAX_SKILL_DESCRIPTION_LENGTH = 500;
/** Default name of the merged skill; the user may rename it in the modal (names are unique per workspace). */
export const DEFAULT_SKILL_NAME = 'repo-conventions';
