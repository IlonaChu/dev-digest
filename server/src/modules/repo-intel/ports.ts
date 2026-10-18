/**
 * Ports owned by repo-intel. The indexer and the facade reach the clone on disk,
 * the AST parser and the token counter only through these; the implementations
 * live in src/adapters/ and are picked in platform/container.ts.
 */

export interface ParsedSymbol {
  name: string;
  kind: string;
  /** 1-based line of the declaration. */
  line: number;
  /** 1-based line of the closing token of the declaration body. */
  endLine: number;
  exported: boolean;
  /** Declaration head trimmed to MAX_SIGNATURE_CHARS; null for kinds without one. */
  signature: string | null;
}

export interface ParsedReference {
  toSymbol: string;
  line: number;
}

export interface ParsedImport {
  name: string;
  source: string;
  isType: boolean;
}

export interface ParsedInvocationHead {
  name: string;
  line: number;
  kind: 'call' | 'new' | 'jsx';
}

/** Source-code parsing (AST + regex facts). Synchronous and side-effect free. */
export interface CodeParser {
  /** True when the file's language is parseable (SUPPORTED_EXT). */
  supports(file: string): boolean;
  parseSymbols(file: string, source: string): ParsedSymbol[];
  parseReferences(file: string, source: string): ParsedReference[];
  parseImports(file: string, source: string): ParsedImport[];
  parseInvocationHeads(file: string, source: string): ParsedInvocationHead[];
  /** "METHOD /path" route declarations found in the source. */
  extractEndpoints(source: string): string[];
  extractCrons(source: string): string[];
}

export interface SourceEntry {
  name: string;
  kind: 'file' | 'dir' | 'symlink' | 'other';
}

/** Read-only access to a cloned repository on disk. A clone is untrusted input. */
export interface SourceTree {
  /** Entries of `dir`, or null when it can't be read. */
  list(dir: string): Promise<SourceEntry[] | null>;
  /** Size in bytes, or null when the file can't be stat'ed. */
  size(path: string): Promise<number | null>;
  /** Read `relPath` under `root`; rejects paths/symlinks that escape `root`. */
  read(root: string, relPath: string): Promise<string>;
}

export interface Tokenizer {
  count(text: string): number;
}
