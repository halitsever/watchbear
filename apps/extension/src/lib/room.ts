export const STORAGE_KEYS = {
  inRoom: 'wb_inRoom',
  roomCode: 'wb_roomCode',
  anchorTabId: 'wb_anchorTabId',
  // a durable backup of an invite: written on the landing page so the join still
  // works if the #wb= hash is lost during a netflix/SPA redirect (see main.ts)
  pendingInvite: 'wb_pendingInvite',
} as const;

export interface PendingInvite {
  code: string;
  url: string;
  ts: number;
}

export interface RoomState {
  inRoom: boolean;
  roomCode: string;
}

// must mirror the server's CODE regex in apps/server/src/room/room.dto.ts, or the
// popup accepts codes the server silently rejects (leaving you alone in a phantom room)
export const ROOM_CODE_RE = /^[A-Z]{2,8}-[A-Z0-9]{4,12}$/;
export const isValidCode = (code: string): boolean => ROOM_CODE_RE.test(code.trim());

const CODE_WORDS = ['BEAR', 'DEN', 'CUB', 'PAW', 'FUR', 'HONEY', 'OAK', 'PINE'];
// no 0/O/1/I so the code stays easy to read out loud. 32 chars divides 256
// evenly, so the byte % 32 below is unbiased.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(): string {
  const word = CODE_WORDS[crypto.getRandomValues(new Uint32Array(1))[0] % CODE_WORDS.length];
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length];
  return `${word}-${suffix}`;
}

// the room code and destination video ride in the link's hash fragment (never
// sent to the server, so a viewing url isn't logged). the landing page reads
// both; the on-video content script reads just the code after redirect.
const HASH_KEY = 'wb';
export const INVITE_BASE_URL = import.meta.env.VITE_INVITE_BASE_URL || 'https://watchbear.deepfeld.com/j';

// landing consent link: friend opens it, sees where they're headed, then jumps
// to the video with #wb=CODE appended (which the content script picks up).
export function buildInviteLink(videoUrl: string, code: string): string {
  return `${INVITE_BASE_URL}#${HASH_KEY}=${code}&u=${encodeURIComponent(videoUrl)}`;
}

// reads a valid room code out of a url hash. handles both "#wb=CODE&u=..." (the
// landing link) and "#wb=CODE" (the redirected video page). codes are uppercase.
export function parseInviteCode(hash: string): string | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  for (const part of h.split('&')) {
    const [k, v] = part.split('=');
    if (k === HASH_KEY && v) {
      const code = decodeURIComponent(v).toUpperCase();
      if (isValidCode(code)) return code;
    }
  }
  return null;
}

// reads the u= (destination video url) out of a landing-link hash. only http(s)
// is allowed so a crafted u= can't smuggle a javascript:/data: url into a join.
export function parseInviteUrl(hash: string): string | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  for (const part of h.split('&')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i) !== 'u') continue;
    try {
      const url = new URL(decodeURIComponent(part.slice(i + 1)));
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
      return null;
    }
  }
  return null;
}

// drops the wb= entry, keeping any other fragment content; returns the remaining
// hash ("" or "#other"). used to scrub the code from the address bar after join.
export function stripWbHash(hash: string): string {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const kept = h.split('&').filter((p) => p && p.split('=')[0] !== HASH_KEY);
  return kept.length ? `#${kept.join('&')}` : '';
}

export async function readRoomState(): Promise<RoomState> {
  const data = await chrome.storage.local.get([STORAGE_KEYS.inRoom, STORAGE_KEYS.roomCode]);
  const code = data[STORAGE_KEYS.roomCode];
  return {
    inRoom: Boolean(data[STORAGE_KEYS.inRoom]),
    roomCode: typeof code === 'string' ? code : '',
  };
}
