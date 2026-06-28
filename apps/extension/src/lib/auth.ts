import { BEARS, getIdentity, setIdentityName } from './identity';

const AUTH_KEY = 'wb_auth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// always the official service, never the user-configured room server: sending the
// google id_token to an arbitrary host would leak the profile and allow token replay
const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'https://watchbear-server.deepfeld.com';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  plan: string;
}

interface StoredAuth {
  token: string;
  user: AuthUser;
}

export function isGoogleLoginConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID;
}

export async function getAuth(): Promise<StoredAuth | null> {
  const data = await chrome.storage.local.get(AUTH_KEY);
  const stored = data[AUTH_KEY] as StoredAuth | undefined;
  if (!stored?.token || !stored.user) return null;
  if (isTokenExpired(stored.token)) {
    await logout();
    return null;
  }
  return stored;
}

export async function getAuthToken(): Promise<string | null> {
  const stored = await getAuth();
  return stored?.token ?? null;
}

export async function logout(): Promise<void> {
  await chrome.storage.local.remove(AUTH_KEY);
}

export async function loginWithGoogle(): Promise<AuthUser> {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google login is not configured');

  const redirectUri = chrome.identity.getRedirectURL();
  const nonce = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    response_type: 'id_token',
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    nonce,
    prompt: 'select_account',
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const redirect = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
  if (!redirect) throw new Error('Login was cancelled');

  const idToken = new URLSearchParams(new URL(redirect).hash.slice(1)).get('id_token');
  if (!idToken) throw new Error('No token returned from Google');

  const res = await fetch(`${AUTH_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, nonce }),
  });
  if (!res.ok) throw new Error('Server rejected the login');

  const stored = (await res.json()) as StoredAuth;
  await chrome.storage.local.set({ [AUTH_KEY]: stored });
  await prefillName(stored.user);
  return stored.user;
}

interface LoginResult {
  ok: boolean;
  error?: string;
}

// the popup closes when launchWebAuthFlow takes focus, killing the flow; run it in the
// background instead and let useAuth pick up the stored session via storage events
export async function requestGoogleLogin(): Promise<LoginResult> {
  const res = await chrome.runtime.sendMessage<{ type: 'WB_LOGIN' }, LoginResult | undefined>({ type: 'WB_LOGIN' });
  return res ?? { ok: false };
}

// adopt the google first name only if the name is still a default bear (a chosen name is kept)
async function prefillName(user: AuthUser): Promise<void> {
  const current = await getIdentity();
  const isDefault = BEARS.some((b) => b.name === current.name);
  const given = user.name?.trim().split(/\s+/)[0];
  if (isDefault && given) await setIdentityName(given.slice(0, 20));
}

export function isTokenExpired(token: string): boolean {
  try {
    const json = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export { AUTH_KEY };
