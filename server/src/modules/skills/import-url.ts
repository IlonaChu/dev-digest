import { ValidationError } from '../../platform/errors.js';
import { MAX_URL_LENGTH } from './constants.js';

/**
 * URL import — pure helpers. The bytes come through the `UrlFetcher` port; here
 * we only decide WHICH url to fetch and WHAT to call the file, so the download
 * can go through the same parser and vetting as an uploaded file.
 */

/** Only http(s). A GitHub file page (`/blob/`) is rewritten to its raw-file URL. */
export function normalizeSkillUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new ValidationError('Enter a URL');
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new ValidationError(`URL is too long (max ${MAX_URL_LENGTH} characters)`);
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ValidationError('Not a valid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ValidationError('Only http(s) URLs can be imported');
  }
  url.hash = '';
  if (url.hostname.toLowerCase() === 'github.com') {
    const m = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
    if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`;
  }
  return url.href;
}

/**
 * File name the parser sees: the URL's last path segment. Without a `.md` /
 * `.zip` extension the content type decides (zip → `.zip`, anything else → `.md`;
 * the parser still rejects binary "markdown").
 */
export function filenameFromUrl(url: string, contentType: string | null): string {
  let last = '';
  try {
    const segment = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    last = decodeURIComponent(segment);
  } catch {
    last = '';
  }
  last = last.slice(0, 120);
  const lower = last.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.zip')) return last;
  const stem = last.replace(/\.[^.]*$/, '') || 'skill';
  const isZip = /zip/i.test(contentType ?? '');
  return `${stem}.${isZip ? 'zip' : 'md'}`;
}
