/**
 * archive adapter — zip reading for skill import, backed by `fflate`.
 *
 * Implements the `ArchiveReader` port of modules/skills/ports.ts (structural
 * typing, same pattern as adapters/tokenizer).
 *
 * Safety: `listEntries` uses a filter that never returns true, so fflate walks
 * the central directory and inflates NOTHING. `readText` inflates exactly one
 * named entry, and only when its DECLARED size is ≤ `maxBytes`. fflate inflates
 * into a fixed buffer of that declared size and never grows it, so a DEFLATED
 * entry whose header lies comes back cut at the declared size. A STORED entry
 * (compression 0) is sliced by its real compressed size instead, so the result is
 * re-checked against `maxBytes` after reading. Decoding time is bounded by the
 * archive cap the caller enforces on the compressed input.
 */
import { unzipSync, strFromU8 } from 'fflate';

export interface ArchiveEntry {
  path: string;
  size: number;
  isDirectory: boolean;
}

export interface ArchiveReader {
  listEntries(archive: Uint8Array): ArchiveEntry[];
  readText(archive: Uint8Array, path: string, maxBytes: number): string;
}

export class FflateArchiveReader implements ArchiveReader {
  listEntries(archive: Uint8Array): ArchiveEntry[] {
    const entries: ArchiveEntry[] = [];
    unzipSync(archive, {
      filter: (file) => {
        entries.push({
          path: file.name,
          size: file.originalSize,
          isDirectory: file.name.endsWith('/'),
        });
        return false; // never inflate during listing
      },
    });
    return entries;
  }

  readText(archive: Uint8Array, path: string, maxBytes: number): string {
    const files = unzipSync(archive, {
      filter: (file) => file.name === path && file.originalSize <= maxBytes,
    });
    const bytes = files[path];
    if (!bytes) throw new Error(`Entry "${path}" not found or larger than ${maxBytes} bytes`);
    if (bytes.byteLength > maxBytes) throw new Error(`Entry "${path}" is larger than ${maxBytes} bytes`);
    return strFromU8(bytes);
  }
}
