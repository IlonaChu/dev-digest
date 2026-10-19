/** Constants for the skills module. */

/** Version recorded for a newly created skill. */
export const INITIAL_SKILL_VERSION = 1;

/** Import limits — an archive is untrusted input. */
export const MAX_ARCHIVE_BYTES = 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 500;
export const MAX_SKILL_MD_BYTES = 256 * 1024;

/** Import routes carry the file as base64 JSON (1 MiB zip ≈ 1.4 MiB encoded). */
export const IMPORT_BODY_LIMIT = 2 * 1024 * 1024;

/** URL import: one download, cut after this long; the size cap is MAX_ARCHIVE_BYTES. */
export const FETCH_TIMEOUT_MS = 15_000;
export const MAX_URL_LENGTH = 2048;

export const MAX_SKILL_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 500;

/** Extensions (and folders) that mark an archive entry as runnable code. */
export const EXECUTABLE_EXTENSIONS = new Set([
  'sh', 'bash', 'zsh', 'py', 'js', 'mjs', 'cjs', 'ts', 'rb', 'pl', 'ps1',
  'exe', 'bat', 'cmd', 'dll', 'so', 'dylib', 'jar',
]);
export const EXECUTABLE_DIRS = new Set(['scripts', 'bin']);

/** Archive noise that is neither the skill nor worth listing. */
export const ARCHIVE_NOISE = [/^__MACOSX\//, /(^|\/)\.DS_Store$/];

/** Vetting: LLM classifier input cap; longer skills stay `unverified`. */
export const VETTING_LLM_MAX_CHARS = 100_000;
export const VETTING_CACHE_TTL_MS = 15 * 60 * 1000;
