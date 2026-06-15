// stable id for "the same video", tolerant of timestamps / tracking params so
// two people on the same video still match even with slightly different urls.
const VOLATILE = new Set([
  't',
  'start',
  'time_continue',
  'feature',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'si',
]);

export function contentKey(href: string): string {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtube.com') {
      const v = u.searchParams.get('v');
      if (v) return `yt:${v}`;
    }
    if (host === 'youtu.be') return `yt:${u.pathname.slice(1)}`;
    const q = [...u.searchParams.entries()]
      .filter(([k]) => !VOLATILE.has(k))
      .sort()
      .map(([k, val]) => `${k}=${val}`)
      .join('&');
    return `${host}${u.pathname}${q ? '?' + q : ''}`;
  } catch {
    return href;
  }
}
