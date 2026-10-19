import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FetchUrlFetcher } from '../src/adapters/http/url-fetcher.js';

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

describe('FetchUrlFetcher', () => {
  it('returns the bytes, the content type and the final URL after a redirect', async () => {
    const f = await new FetchUrlFetcher().fetchBytes(`${base}/redirect`, limits);
    expect(new TextDecoder().decode(f.bytes)).toBe('# Hi');
    expect(f.contentType).toContain('text/markdown');
    expect(f.finalUrl).toBe(`${base}/ok.md`);
  });

  it('rejects a declared size over the cap', async () => {
    await expect(new FetchUrlFetcher().fetchBytes(`${base}/declared-big`, limits)).rejects.toThrow(/larger than 1024/);
  });

  it('cuts a chunked body the moment it passes the cap', async () => {
    await expect(new FetchUrlFetcher().fetchBytes(`${base}/streamed-big`, limits)).rejects.toThrow(/larger than 1024/);
  });

  it('fails on a non-2xx status', async () => {
    await expect(new FetchUrlFetcher().fetchBytes(`${base}/missing.md`, limits)).rejects.toThrow(/HTTP 404/);
  });
});
