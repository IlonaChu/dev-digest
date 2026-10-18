import { extractCrons, extractEndpoints } from '../codeindex/extract.js';
import {
  langForFile,
  parseImports,
  parseInvocationHeads,
  parseReferences,
  parseSymbols,
  type ParsedImport,
  type ParsedInvocationHead,
  type ParsedReference,
  type ParsedSymbol,
} from './index.js';

/** `CodeParser` port (modules/repo-intel/ports.ts): ast-grep for AST, regex for route/cron facts. */
export class AstGrepCodeParser {
  supports(file: string): boolean {
    return langForFile(file) !== null;
  }

  parseSymbols(file: string, source: string): ParsedSymbol[] {
    return parseSymbols(file, source);
  }

  parseReferences(file: string, source: string): ParsedReference[] {
    return parseReferences(file, source);
  }

  parseImports(file: string, source: string): ParsedImport[] {
    return parseImports(file, source);
  }

  parseInvocationHeads(file: string, source: string): ParsedInvocationHead[] {
    return parseInvocationHeads(file, source);
  }

  extractEndpoints(source: string): string[] {
    return extractEndpoints(source);
  }

  extractCrons(source: string): string[] {
    return extractCrons(source);
  }
}
