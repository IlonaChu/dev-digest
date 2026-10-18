/**
 * Ports the skills module owns. Implemented in `src/adapters/` and handed over
 * by the Container, so the module never imports an archive library.
 */

/** One entry of an archive's central directory (nothing is decompressed). */
export interface ArchiveEntry {
  /** Normalised, forward-slash path as stored in the archive. */
  path: string;
  /** Uncompressed size in bytes as DECLARED by the archive. */
  size: number;
  isDirectory: boolean;
}

/**
 * Read-only access to a zip archive. Deliberately has no "extract" operation:
 * the only way to get bytes out is `readText` of ONE named entry, size-capped.
 * Imported archives can carry scripts; nothing here can write them to disk or
 * run them.
 */
export interface ArchiveReader {
  /** Entries listed from the central directory only — no entry is inflated. */
  listEntries(archive: Uint8Array): ArchiveEntry[];
  /** UTF-8 text of one entry. Throws if the real size exceeds `maxBytes`. */
  readText(archive: Uint8Array, path: string, maxBytes: number): string;
}
