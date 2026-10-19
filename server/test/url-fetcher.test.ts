import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FetchUrlFetcher, isNonPublicAddress } from '../src/adapters/http/url-fetcher.js';

/** Loopback server only — hermetic, no outside network. */
let server: Server;
let base = '';

beforeAll(async () => {
  server = createServer((req, res) => {
    res.on('error', () => {});
    req.socket.on('error', () => {});
    switch (req.url) {
      case '/ok.md':
        res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
        res.end('# Hi');
        return;
      case '/redirect':
        res.writeHead(302, { location: '/ok.md' });
        res.end();
        return;
      case '/to-internal':
        res.writeHead(302, { location: 'http://internal.test/secret' });
        res.end();
        return;
      case '/loop':
        res.writeHead(302, { location: '/loop' });
        res.end();
        return;
      case '/declared-big':
        res.writeHead(200, { 'content-type': 'text/plain', 'content-length': '4000' });
        res.end('x'.repeat(4000));
        return;
      case '/streamed-big': {
        res.writeHead(200, { 'content-type': 'text/plain' }); // chunked, no content-length
        let n = 0;
        const tick = () => {
          if (res.destroyed) return;
          if (n++ < 6) {
            res.write('y'.repeat(500));
            setImmediate(tick);
          } else {
            res.end();
          }
        };
        tick();
        return;
      }
      default:
        res.writeHead(404);
        res.end('nope');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const limits = { maxBytes: 1024, timeoutMs: 5000 };
/** The test server is on loopback, which the default fetcher refuses by design. */
const loopbackFetcher = () => new FetchUrlFetcher({ allowPrivateHosts: true });

describe('FetchUrlFetcher', () => {
  it('returns the bytes, the content type and the final URL after a redirect', async () => {
    const f = await loopbackFetcher().fetchBytes(`${base}/redirect`, limits);
    expect(new TextDecoder().decode(f.bytes)).toBe('# Hi');
    expect(f.contentType).toContain('text/markdown');
    expect(f.finalUrl).toBe(`${base}/ok.md`);
  });

  it('rejects a declared size over the cap', async () => {
    await expect(loopbackFetcher().fetchBytes(`${base}/declared-big`, limits)).rejects.toThrow(/larger than 1024/);
  });

  it('cuts a chunked body the moment it passes the cap', async () => {
    await expect(loopbackFetcher().fetchBytes(`${base}/streamed-big`, limits)).rejects.toThrow(/larger than 1024/);
  });

  it('fails on a non-2xx status', async () => {
    await expect(loopbackFetcher().fetchBytes(`${base}/missing.md`, limits)).rejects.toThrow(/HTTP 404/);
  });

  it('stops a redirect loop', async () => {
    await expect(loopbackFetcher().fetchBytes(`${base}/loop`, limits)).rejects.toThrow(/too many redirects/);
  });
});

describe('FetchUrlFetcher — SSRF guard', () => {
  it('refuses a loopback URL by default, before any request is made', async () => {
    await expect(new FetchUrlFetcher().fetchBytes(`${base}/ok.md`, limits)).rejects.toThrow(
      /127\.0\.0\.1 is not a public address/,
    );
  });

  it('refuses a host whose name resolves to a private address', async () => {
    const f = new FetchUrlFetcher({ resolve: async () => ['93.184.216.34', '10.0.0.5'] });
    await expect(f.fetchBytes('https://skills.example/a.md', limits)).rejects.toThrow(/not a public address/);
  });

  it('checks every redirect hop: a public link that redirects inward is refused', async () => {
    // The loopback server stands in for a public host; its redirect target resolves to a private address.
    const resolve = async (host: string) => (host === '127.0.0.1' ? ['93.184.216.34'] : ['10.1.2.3']);
    await expect(new FetchUrlFetcher({ resolve }).fetchBytes(`${base}/to-internal`, limits)).rejects.toThrow(
      /internal\.test is not a public address/,
    );
  });

  it('classifies addresses', () => {
    for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.5.4', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:a9fe:a9fe']) {
      expect(isNonPublicAddress(ip), ip).toBe(true);
    }
    for (const ip of ['93.184.216.34', '8.8.8.8', '2606:4700::1111']) {
      expect(isNonPublicAddress(ip), ip).toBe(false);
    }
  });
});
