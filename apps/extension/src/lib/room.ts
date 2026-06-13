export const STORAGE_KEYS = {
  inRoom: 'wb_inRoom',
  roomCode: 'wb_roomCode',
} as const;

export interface RoomState {
  inRoom: boolean;
  roomCode: string;
}

const CODE_WORDS = ['BEAR', 'DEN', 'CUB', 'PAW', 'FUR', 'HONEY', 'OAK', 'PINE'];

export function generateCode(): string {
  const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const num = String(Math.floor(Math.random() * 900) + 100);
  return `${word}-${num}`;
}

export async function readRoomState(): Promise<RoomState> {
  const data = await chrome.storage.local.get([STORAGE_KEYS.inRoom, STORAGE_KEYS.roomCode]);
  const code = data[STORAGE_KEYS.roomCode];
  return {
    inRoom: Boolean(data[STORAGE_KEYS.inRoom]),
    roomCode: typeof code === 'string' ? code : '',
  };
}
