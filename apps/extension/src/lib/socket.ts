import { io, type Socket } from 'socket.io-client';
import type { Member } from './types';
import type { Identity } from './identity';

// Set VITE_SERVER_URL in .env.production for deployed builds (must be https/wss).
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

interface ChatPayload {
  fromId: string;
  from: string;
  text: string;
}

export interface RoomHandlers {
  onMembers: (members: Member[], selfId: string | undefined) => void;
  onChat: (msg: ChatPayload) => void;
  onSystem: (text: string) => void;
}

export interface RoomConnection {
  sendChat: (text: string) => void;
  disconnect: () => void;
}

export interface VideoControl {
  action: 'play' | 'pause' | 'seek';
  time: number;
}

export interface VideoChannel {
  send: (c: VideoControl) => void;
  disconnect: () => void;
}

// A connection used only to sync the page video. It joins the room to receive
// control events but is not registered as a member.
export function joinVideoChannel(code: string, onControl: (c: VideoControl) => void): VideoChannel {
  const socket: Socket = io(SERVER_URL, { transports: ['websocket'] });
  socket.on('connect', () => {
    console.log('[WB sync] connected');
    socket.emit('video:subscribe', { code });
  });
  socket.on('connect_error', (e) => console.log('[WB sync] connect error:', e.message));
  socket.on('video:control', (c: VideoControl) => onControl(c));
  return {
    send: (c) => socket.emit('video:control', { code, ...c }),
    disconnect: () => socket.disconnect(),
  };
}

export function joinRoom(code: string, member: Identity, handlers: RoomHandlers): RoomConnection {
  const socket: Socket = io(SERVER_URL, { transports: ['websocket'] });

  socket.on('connect', () => socket.emit('room:join', { code, member }));
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
