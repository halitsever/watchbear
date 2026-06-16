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

    const data = (await res.json().catch(() => null)) as { name?: string } | null;
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

interface TypingPayload {
  fromId: string;
  from: string;
  typing: boolean;
}

export type ConnStatus = 'connecting' | 'connected' | 'error';

export interface RoomHandlers {
  onMembers: (members: Member[], selfId: string | undefined) => void;
  onChat: (msg: ChatPayload) => void;
  onTyping: (msg: TypingPayload) => void;
  onSystem: (text: string) => void;
  onStatus: (status: ConnStatus) => void;
  onContent: (c: VideoContentInfo) => void;
}

export interface RoomConnection {
  sendChat: (text: string) => void;
  sendTyping: (typing: boolean) => void;
  sendReaction: (emoji: string) => void;
  disconnect: () => void;
}

export interface VideoControl {
  time: number;
  paused: boolean;
}

// what the page is watching, used to keep everyone on the same video
export interface VideoContentInfo {
  key: string;
  url: string;
  title: string;
}

export interface VideoChannelOpts {
  anchor: boolean;
  content: VideoContentInfo;
  // attributes control events (pause/play/seek) to a bear in the chat feed
  name: string;
  onControl: (c: VideoControl) => void;
  onReaction: (p: { emoji: string }) => void;
}

export interface VideoChannel {
  send: (c: VideoControl) => void;
  // call after a same-tab (SPA) navigation so the server knows our new content
  setContent: (c: VideoContentInfo) => void;
  // promote this socket to anchor (covers the storage-arm vs message race)
  claimAnchor: (c: VideoContentInfo) => void;
  disconnect: () => void;
}

// connection used only to sync the page video. joins the room to receive
// control events but isn't registered as a member.
export function joinVideoChannel(serverUrl: string, code: string, opts: VideoChannelOpts): VideoChannel {
  const socket: Socket = io(serverUrl, { transports: ['websocket'] });
  let anchor = opts.anchor;
  let content = opts.content;
  const name = opts.name;
  socket.on('connect', () => socket.emit('video:subscribe', { code, anchor, name, ...content }));
  socket.on('connect_error', (e) => console.warn('[Watchbear] video sync connection failed:', e.message));
  socket.on('video:control', (c: VideoControl) => opts.onControl(c));
  socket.on('reaction:show', (p: { emoji: string }) => opts.onReaction(p));
  return {
    send: (c) => socket.emit('video:control', { code, ...c }),
    setContent: (c) => {
      content = c;
      if (socket.connected) socket.emit('video:content', c);
    },
    claimAnchor: (c) => {
      anchor = true;
      content = c;
      if (socket.connected) socket.emit('video:subscribe', { code, anchor: true, name, ...c });
    },
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
  // server rejected the payload (e.g. malformed code); don't show a fake "connected"
  socket.on('exception', () => handlers.onStatus('error'));
  socket.on('room:members', (p: { members: Member[] }) => handlers.onMembers(p.members, socket.id));
  socket.on('chat:message', (p: ChatPayload) => handlers.onChat(p));
  socket.on('chat:typing', (p: TypingPayload) => handlers.onTyping(p));
  socket.on('room:system', (p: { text: string }) => handlers.onSystem(p.text));
  socket.on('room:content', (c: VideoContentInfo) => handlers.onContent(c));

  return {
    sendChat: (text) => socket.emit('chat:send', { text }),
    sendTyping: (typing) => socket.emit('chat:typing', { typing }),
    sendReaction: (emoji) => socket.emit('reaction:send', { emoji }),
    disconnect: () => {
      socket.emit('room:leave');
      socket.disconnect();
    },
  };
}
