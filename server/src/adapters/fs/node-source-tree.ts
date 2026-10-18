import { readdir, stat } from 'node:fs/promises';
import { readFileInsideRoot } from './safe-read.js';

type EntryKind = 'file' | 'dir' | 'symlink' | 'other';

/** `SourceTree` port (modules/repo-intel/ports.ts) over node:fs. */
export class NodeSourceTree {
  async list(dir: string): Promise<{ name: string; kind: EntryKind }[] | null> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      return entries.map((e) => ({
        name: e.name,
        kind: e.isSymbolicLink() ? 'symlink' : e.isDirectory() ? 'dir' : e.isFile() ? 'file' : 'other',
      }));
    } catch {
      return null;
    }
  }

  async size(path: string): Promise<number | null> {
    try {
      return (await stat(path)).size;
    } catch {
      return null;
    }
  }

  read(root: string, relPath: string): Promise<string> {
    return readFileInsideRoot(root, relPath);
  }
}
