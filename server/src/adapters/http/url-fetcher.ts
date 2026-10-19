/**
 * http adapter — downloads one public URL for a skill import, backed by the
 * global `fetch` (Node ≥ 22 / undici). No SDK.
 *
 * Implements the `UrlFetcher` port of modules/skills/ports.ts (structural
 * typing, same pattern as adapters/archive).
 *
 * Safety: the body is read as a stream and the download is cancelled the moment
 * it passes `maxBytes` (a `content-length` header is only a hint), the whole
 * request is cut after `timeoutMs`, and nothing touches the disk. The caller
 * (skills service) has already restricted the URL to http(s).
 */

/** Same shape as `FetchedFile` in modules/skills/ports.ts. */
export interface FetchedFile {
  bytes: Uint8Array;
  contentType: string | null;
  finalUrl: string;
}

/** Same shape as `UrlFetcher` in modules/skills/ports.ts. */
export interface UrlFetcher {
  fetchBytes(url: string, limits: { maxBytes: number; timeoutMs: number }): Promise<FetchedFile>;
}

export class FetchUrlFetcher implements UrlFetcher {
  async fetchBytes(url: string, { maxBytes, timeoutMs }: { maxBytes: number; timeoutMs: number }) {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      headers: {
        accept: 'text/markdown, text/plain, application/zip;q=0.9, */*;q=0.5',
        'user-agent': 'devdigest-skill-import',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const declared = Number(res.headers.get('content-length') ?? Number.NaN);
    if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge(maxBytes);

    const bytes = await readCapped(res, maxBytes);
    return { bytes, contentType: res.headers.get('content-type'), finalUrl: res.url || url };
  }
}

function tooLarge(maxBytes: number): Error {
  return new Error(`the file is larger than ${maxBytes} bytes`);
}

/** Collect the body, aborting as soon as more than `maxBytes` arrived. */
async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw tooLarge(maxBytes);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
