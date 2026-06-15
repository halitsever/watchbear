const SERVER_KEY = 'wb_serverUrl';

// build-time default; stays the active server until the user overrides it.
export const DEFAULT_SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://localhost:3000';

export async function getServerUrl(): Promise<string> {
  const data = await chrome.storage.local.get(SERVER_KEY);
  const url = data[SERVER_KEY];
  return typeof url === 'string' && url ? url : DEFAULT_SERVER_URL;
}

export async function setServerUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [SERVER_KEY]: url });
}

export async function resetServerUrl(): Promise<void> {
  await chrome.storage.local.remove(SERVER_KEY);
}

// assume https when no scheme is typed, then validate. returns the bare origin
// (no path / trailing slash) or null if it isn't a usable http(s) url.
export function normalizeServerUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // only assume https when no scheme is typed; a non-http(s) scheme is rejected
  // rather than silently rewritten (e.g. ftp:// must not become https://ftp).
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.origin;
  } catch {
    return null;
  }
}

export { SERVER_KEY };
