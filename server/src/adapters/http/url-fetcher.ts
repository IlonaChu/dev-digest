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
 *
 * SSRF: the URL comes from the user, and the API answers with the body, so it
 * must not become a proxy into the machine or its network. Before every hop the
 * host is resolved and refused if ANY of its addresses is loopback, private,
 * link-local (cloud metadata), CGNAT, multicast or otherwise non-public;
 * redirects are followed by hand (max `MAX_REDIRECTS`) so each `Location` is
 * checked the same way. Known limit: the check and the connection resolve the
 * name separately, so a DNS-rebinding host can still race it.
 */
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

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

export interface FetchUrlFetcherOptions {
  /** Skip the non-public address check. Only for tests against a loopback server. */
  allowPrivateHosts?: boolean;
  /** Resolve a hostname to its IP addresses (default: `dns.lookup`, every family). */
  resolve?: (hostname: string) => Promise<string[]>;
}

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Address ranges a skill URL may never reach. IPv4-mapped IPv6 is matched by its IPv4 range. */
const NON_PUBLIC = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, broadcast
] as const) {
  NON_PUBLIC.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  NON_PUBLIC.addSubnet(net, prefix, 'ipv6');
}

/** True when `address` (an IP literal) is outside the public internet. */
export function isNonPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true; // not an IP at all — refuse rather than guess
  return NON_PUBLIC.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

async function resolveAll(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((r) => r.address);
}

export class FetchUrlFetcher implements UrlFetcher {
  private readonly allowPrivateHosts: boolean;
  private readonly resolve: (hostname: string) => Promise<string[]>;

  constructor(options: FetchUrlFetcherOptions = {}) {
    this.allowPrivateHosts = options.allowPrivateHosts ?? false;
    this.resolve = options.resolve ?? resolveAll;
  }

  async fetchBytes(url: string, { maxBytes, timeoutMs }: { maxBytes: number; timeoutMs: number }) {
    const signal = AbortSignal.timeout(timeoutMs);
    let current = url;
    for (let hop = 0; ; hop++) {
      await this.assertPublic(current);
      const res = await fetch(current, {
        signal,
        redirect: 'manual',
        headers: {
          accept: 'text/markdown, text/plain, application/zip;q=0.9, */*;q=0.5',
          'user-agent': 'devdigest-skill-import',
        },
      });

      if (REDIRECT_STATUSES.has(res.status)) {
        const location = res.headers.get('location');
        await res.body?.cancel();
        if (!location) throw new Error(`HTTP ${res.status}`);
        if (hop >= MAX_REDIRECTS) throw new Error('too many redirects');
        current = new URL(location, current).toString();
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const declared = Number(res.headers.get('content-length') ?? Number.NaN);
      if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge(maxBytes);

      const bytes = await readCapped(res, maxBytes);
      return { bytes, contentType: res.headers.get('content-type'), finalUrl: current };
    }
  }

  /** Refuse non-http(s) hops and hosts that resolve to a non-public address. */
  private async assertPublic(url: string): Promise<void> {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`unsupported protocol ${parsed.protocol}`);
    }
    if (this.allowPrivateHosts) return;
    // URL keeps IPv6 literals in brackets: `http://[::1]/` → hostname `[::1]`.
    const host = parsed.hostname.replace(/^\[(.*)\]$/, '$1');
    let addresses: string[];
    try {
      addresses = await this.resolve(host);
    } catch {
      throw new Error(`could not resolve ${host}`);
    }
    if (addresses.length === 0 || addresses.some(isNonPublicAddress)) {
      throw new Error(`${host} is not a public address`);
    }
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
