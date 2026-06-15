import { io, type Socket } from 'socket.io-client';
import type { Member } from './types';
import type { Identity } from './identity';

// the server url is chosen at runtime (self-host), so every entry point takes it
// as an argument; callers resolve it with getServerUrl() from ./server.
export async function pingServer(serverUrl: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(serverUrl, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return false;

    const data = await res.json().catch(() => null);
    return data?.name === 'watchbear-server';
  } catch {
    return false;
  }
}

interface ChatPayload {
  fromId: string;
  from: string;
  text: string;
}

export type ConnStatus = 'connecting' | 'connected' | 'error';

export interface RoomHandlers {
  onMembers: (members: Member[], selfId: string | undefined) => void;
  onChat: (msg: ChatPayload) => void;
  onSystem: (text: string) => void;
  onStatus: (status: ConnStatus) => void;
}

export interface RoomConnection {
  sendChat: (text: string) => void;
  disconnect: () => void;
}

export interface VideoControl {
  time: number;
  paused: boolean;
}

export interface VideoChannel {
  send: (c: VideoControl) => void;
  disconnect: () => void;
}

// connection used only to sync the page video. joins the room to receive
// control events but isn't registered as a member.
export function joinVideoChannel(serverUrl: string, code: string, onControl: (c: VideoControl) => void): VideoChannel {
  const socket: Socket = io(serverUrl, { transports: ['websocket'] });
  socket.on('connect', () => socket.emit('video:subscribe', { code }));
  socket.on('connect_error', (e) => console.warn('[Watchbear] video sync connection failed:', e.message));
  socket.on('video:control', (c: VideoControl) => onControl(c));
  return {
    send: (c) => socket.emit('video:control', { code, ...c }),
    disconnect: () => socket.disconnect(),
  };
}

export function joinRoom(serverUrl: string, code: string, member: Identity, handlers: RoomHandlers): RoomConnection {
  const socket: Socket = io(serverUrl, { transports: ['websocket'] });

  socket.on('connect', () => {
    handlers.onStatus('connected');
    socket.emit('room:join', { code, member });
  });
  socket.on('connect_error', () => handlers.onStatus('error'));
  socket.on('disconnect', () => handlers.onStatus('connecting'));
  socket.on('room:members', (p: { members: Member[] }) => handlers.onMembers(p.members, socket.id));
  socket.on('chat:message', (p: ChatPayload) => handlers.onChat(p));
  socket.on('room:system', (p: { text: string }) => handlers.onSystem(p.text));

  return {
    sendChat: (text) => socket.emit('chat:send', { text }),
    disconnect: () => {
      socket.emit('room:leave');
      socket.disconnect();
    },
  };
}
