import type { ReactNode } from 'react';

// matches http(s) urls and bare www. domains; only these schemes become links,
// so javascript:/data: URIs can never slip through (no sanitizer needed)
const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
// punctuation that commonly trails a url but isn't part of it
const TRAILING = /[.,;:!?)\]}'"]+$/;

// split a chat string into plain-text and clickable-anchor segments
export function linkify(text: string, linkClass: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  URL_RE.lastIndex = 0;
  for (let m = URL_RE.exec(text); m; m = URL_RE.exec(text)) {
    const raw = m[0];
    const start = m.index;
    if (start > last) out.push(text.slice(last, start));
    // keep trailing punctuation as plain text rather than part of the href
    const trail = raw.match(TRAILING)?.[0] ?? '';
    const url = trail ? raw.slice(0, raw.length - trail.length) : raw;
    const href = url.toLowerCase().startsWith('www.') ? `https://${url}` : url;
    out.push(
      <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {url}
      </a>,
    );
    if (trail) out.push(trail);
    last = start + raw.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
