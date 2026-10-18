/** Largest file the import accepts (client pre-check; the server enforces its own limits). */
export const MAX_IMPORT_BYTES = 1024 * 1024;

/** Extensions the import accepts. */
export const ACCEPTED_EXTENSIONS = [".md", ".zip"] as const;

export const MODAL_WIDTH = 760;
