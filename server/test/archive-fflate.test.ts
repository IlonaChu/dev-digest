import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { FflateArchiveReader } from '../src/adapters/archive/fflate.js';

const reader = new FflateArchiveReader();

/** Patch the uncompressed-size field (central directory + local header) of a stored zip entry. */
function lieAboutSize(zip: Uint8Array, declared: number): Uint8Array {
  const out = zip.slice();
  const v = new DataView(out.buffer);
  for (let i = 0; i < out.length - 4; i++) {
    const sig = v.getUint32(i, true);
    if (sig === 0x02014b50) v.setUint32(i + 24, declared, true); // central directory: uncompressed size
    if (sig === 0x04034b50) v.setUint32(i + 22, declared, true); // local header: uncompressed size
  }
  return out;
}

describe('FflateArchiveReader.readText', () => {
  it('reads one entry within the cap', () => {
    const zip = zipSync({ 'SKILL.md': strToU8('hello') });
    expect(reader.readText(zip, 'SKILL.md', 100)).toBe('hello');
  });

  it('rejects an entry whose declared size exceeds the cap', () => {
    const zip = zipSync({ 'SKILL.md': strToU8('x'.repeat(200)) });
    expect(() => reader.readText(zip, 'SKILL.md', 100)).toThrow(/larger than 100 bytes/);
  });

  it('rejects a STORED entry whose declared size lies about its real size', () => {
    const zip = lieAboutSize(zipSync({ 'SKILL.md': [strToU8('x'.repeat(600)), { level: 0 }] }), 10);
    expect(() => reader.readText(zip, 'SKILL.md', 100)).toThrow(/larger than 100 bytes/);
  });
});
