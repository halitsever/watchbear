export const STORAGE_KEYS = {
  inRoom: 'wb_inRoom',
  roomCode: 'wb_roomCode',
  anchorTabId: 'wb_anchorTabId',
} as const;

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

export async function readRoomState(): Promise<RoomState> {
  const data = await chrome.storage.local.get([STORAGE_KEYS.inRoom, STORAGE_KEYS.roomCode]);
  const code = data[STORAGE_KEYS.roomCode];
  return {
    inRoom: Boolean(data[STORAGE_KEYS.inRoom]),
    roomCode: typeof code === 'string' ? code : '',
  };
}
