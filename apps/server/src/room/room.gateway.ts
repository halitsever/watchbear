import { UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { corsOrigin } from '../cors';
import { ChatDto, JoinDto, ReactionDto, SubscribeDto, TypingDto, VideoContentDto, VideoControlDto } from './room.dto';

interface Member {
  id: string;
  name: string;
  fur: string;
  furDark: string;
  host: boolean;
}

interface Content {
  key: string;
  url: string;
  title: string;
}

// curated set the emoji picker can send as floating reactions. keep in sync with
// REACTION_EMOJI in the extension (apps/extension/src/lib/emoji.ts).
const REACTIONS = new Set([
  '🐻', '😂', '❤️', '😱', '😢', '😍', '😡', '👍', '👎', '🔥',
  '🎉', '👏', '🙌', '🤯', '😴', '🥱', '🤔', '😮', '😅', '😭',
  '🥺', '😎', '🤩', '😇', '🙃', '😏', '😬', '🤣', '💀', '👀',
  '✨', '⭐', '💯', '🙏', '🤝', '💪', '🍿', '☕', '🎬', '📺',
  '🐾', '🍯', '🌙', '⚡', '💖', '💔', '🫶', '🤡', '🥳', '😤',
]);
const MAX_ROOMS = 5_000;
const MAX_MEMBERS_PER_ROOM = 50;
const RATE_LIMIT = 25;
const RATE_WINDOW_MS = 1_000;
// drift past this (seconds) counts as a deliberate seek, not normal playback advance
const SEEK_NOTICE = 1.5;

function formatTime(t: number): string {
  const total = Math.max(0, Math.floor(t));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

@WebSocketGateway({ cors: { origin: corsOrigin }, maxHttpBufferSize: 16 * 1024 })
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class RoomGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly rooms = new Map<string, Map<string, Member>>();
  private readonly socketRoom = new Map<string, string>();
  // one playback state per room, keyed by code; control relays to everyone in it
  private readonly videoState = new Map<string, { time: number; paused: boolean; rate?: number; updatedAt: number }>();
  private readonly socketContent = new Map<string, Content>();
  // the bear name carried on a video socket, used to attribute control events in chat
  private readonly socketName = new Map<string, string>();
  // the den's canonical "now playing", defined by the anchor (party starter).
  private readonly roomContent = new Map<string, Content>();
  private readonly roomAnchor = new Map<string, string>();
  private readonly hits = new Map<string, { count: number; reset: number }>();

  private setRoomContent(code: string, content: Content): void {
    this.roomContent.set(code, content);
    this.server.to(code).emit('room:content', content);
  }

  private contentSocketsIn(code: string): string[] {
    const ids: string[] = [];
    for (const id of this.socketContent.keys()) {
      if (this.socketRoom.get(id) === code) ids.push(id);
    }
    return ids;
  }

  // crude per-socket sliding window so one client can't flood join/chat/control;
  // @nestjs/throttler has no first-class ws path, so an inline limiter is simpler.
  private withinRate(client: Socket): boolean {
    const now = Date.now();
    const h = this.hits.get(client.id);
    if (!h || now > h.reset) {
      this.hits.set(client.id, { count: 1, reset: now + RATE_WINDOW_MS });
      return true;
    }
    if (h.count >= RATE_LIMIT) return false;
    h.count += 1;
    return true;
  }

  @SubscribeMessage('room:join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() { code, member }: JoinDto) {
    if (!this.withinRate(client)) return;
    const existing = this.rooms.get(code);
    if (!existing && this.rooms.size >= MAX_ROOMS) return;
    const room = existing ?? new Map<string, Member>();
    if (room.size >= MAX_MEMBERS_PER_ROOM) return;

    void client.join(code);
    this.socketRoom.set(client.id, code);
    room.set(client.id, {
      id: client.id,
      name: member.name,
      fur: member.fur,
      furDark: member.furDark,
      host: room.size === 0,
    });
    this.rooms.set(code, room);
    this.broadcastMembers(code);
    client.to(code).emit('room:system', { text: `🐻 ${member.name} joined the den` });
  }

  @SubscribeMessage('room:leave')
  handleLeave(@ConnectedSocket() client: Socket) {
    this.removeFromRoom(client);
  }

  @SubscribeMessage('chat:send')
  handleChat(@ConnectedSocket() client: Socket, @MessageBody() { text, mid, replyTo }: ChatDto) {
    if (!this.withinRate(client)) return;
    const code = this.socketRoom.get(client.id);
    const member = code ? this.rooms.get(code)?.get(client.id) : undefined;
    if (!code || !member) return;
    client.to(code).emit('chat:message', { fromId: client.id, from: member.name, text, mid, replyTo });
  }

  @SubscribeMessage('reaction:send')
  handleReaction(@ConnectedSocket() client: Socket, @MessageBody() { emoji }: ReactionDto) {
    if (!this.withinRate(client)) return;
    const code = this.socketRoom.get(client.id);
    if (!code || !REACTIONS.has(emoji)) return;
    this.server.to(code).emit('reaction:show', { emoji });
  }

  @SubscribeMessage('chat:typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() { typing }: TypingDto) {
    if (!this.withinRate(client)) return;
    const code = this.socketRoom.get(client.id);
    const member = code ? this.rooms.get(code)?.get(client.id) : undefined;
    if (!code || !member) return;
    client.to(code).emit('chat:typing', { fromId: client.id, from: member.name, typing });
  }

  // silent video-sync channel, joins the room to receive control events without
  // counting as a member. binding the socket to the code here is what later
  // authorizes its video:control emits.
  @SubscribeMessage('video:subscribe')
  handleVideoSubscribe(@ConnectedSocket() client: Socket, @MessageBody() { code, anchor, key, url, title, name }: SubscribeDto) {
    if (!this.withinRate(client)) return;
    void client.join(code);
    this.socketRoom.set(client.id, code);
    if (name) this.socketName.set(client.id, name);

    if (key && url) {
      const content: Content = { key, url, title: title ?? '' };
      this.socketContent.set(client.id, content);
      // the anchor defines what the den watches; otherwise seed it if no one has yet
      if (anchor || !this.roomContent.has(code)) {
        if (anchor) this.roomAnchor.set(code, client.id);
        this.setRoomContent(code, content); // broadcast tells the newcomer too
      } else {
        const canonical = this.roomContent.get(code);
        if (canonical) client.emit('room:content', canonical);
      }
    } else {
      const canonical = this.roomContent.get(code);
      if (canonical) client.emit('room:content', canonical);
    }

    // hand over the room's current playback to any newcomer
    const s = this.videoState.get(code);
    if (s) {
      const elapsed = s.paused ? 0 : (Date.now() - s.updatedAt) / 1000;
      client.emit('video:control', { time: s.time + elapsed, paused: s.paused, rate: s.rate });
    }
  }

  // a client navigated to a different page/video; only the anchor moves the den label.
  @SubscribeMessage('video:content')
  handleVideoContent(@ConnectedSocket() client: Socket, @MessageBody() { key, url, title }: VideoContentDto) {
    if (!this.withinRate(client)) return;
    const code = this.socketRoom.get(client.id);
    if (!code) return;
    const content: Content = { key, url, title };
    this.socketContent.set(client.id, content);
    if (this.roomAnchor.get(code) === client.id) this.setRoomContent(code, content);
  }

  @SubscribeMessage('video:control')
  handleVideoControl(@ConnectedSocket() client: Socket, @MessageBody() { time, paused, rate }: VideoControlDto) {
    if (!this.withinRate(client)) return;
    // trust the server-tracked binding, never the code in the payload, so a client
    // can only drive the room it actually joined or subscribed to.
    const code = this.socketRoom.get(client.id);
    if (!code) return;

    const text = this.describeControl(this.videoState.get(code), { time, paused, rate }, this.socketName.get(client.id));
    if (text) this.server.to(code).emit('room:system', { text });

    // carry the last known rate when a control omits it, so play/pause doesn't drop the speed
    const nextRate = rate ?? this.videoState.get(code)?.rate;
    this.videoState.set(code, { time, paused, rate: nextRate, updatedAt: Date.now() });
    client.to(code).emit('video:control', { time, paused, rate: nextRate });
  }

  // turn a control event into a chat line ("Maple paused the video"), or undefined
  // when the socket has no name or the move is too small to bother announcing.
  private describeControl(
    prev: { time: number; paused: boolean; rate?: number; updatedAt: number } | undefined,
    next: { time: number; paused: boolean; rate?: number },
    name: string | undefined,
  ): string | undefined {
    if (!name) return undefined;
    if (!prev || prev.paused !== next.paused) {
      return next.paused ? `${name} paused the video` : `${name} resumed the video`;
    }
    // speed changes ride the same control event; announce only an actual change (default 1x)
    if (typeof next.rate === 'number' && next.rate !== (prev.rate ?? 1)) {
      return `${name} set the speed to ${next.rate}x`;
    }
    const expected = prev.time + (prev.paused ? 0 : (Date.now() - prev.updatedAt) / 1000);
    const delta = next.time - expected;
    if (Math.abs(delta) <= SEEK_NOTICE) return undefined;
    const dir = delta > 0 ? 'skipped ahead to' : 'skipped back to';
    return `${name} ${dir} ${formatTime(next.time)}`;
  }

  handleDisconnect(client: Socket) {
    this.removeFromRoom(client);
    this.hits.delete(client.id);
  }

  private removeFromRoom(client: Socket) {
    const code = this.socketRoom.get(client.id);
    if (!code) {
      this.socketContent.delete(client.id);
      this.socketName.delete(client.id);
      return;
    }
    this.socketRoom.delete(client.id);
    this.socketContent.delete(client.id);
    this.socketName.delete(client.id);
    void client.leave(code);
    const room = this.rooms.get(code);
    const member = room?.get(client.id);
    if (room) {
      room.delete(client.id);
      // hand the crown to whoever is left
      if (member?.host && room.size > 0) {
        const next = room.values().next().value;
        if (next) next.host = true;
      }
      if (room.size === 0) this.rooms.delete(code);
    }

    // video side: reseat the anchor so remaining bears aren't stuck diverged,
    // and tear the room's content down once nobody's watching anymore.
    const remaining = this.contentSocketsIn(code);
    if (this.roomAnchor.get(code) === client.id) {
      this.roomAnchor.delete(code);
      if (remaining.length > 0) {
        const next = remaining[0];
        this.roomAnchor.set(code, next);
        this.setRoomContent(code, this.socketContent.get(next)!);
      }
    }
    if (remaining.length === 0) {
      this.roomContent.delete(code);
      this.roomAnchor.delete(code);
      this.videoState.delete(code);
    }

    this.broadcastMembers(code);
    if (member) {
      // clear any lingering typing dots for a bear that bailed mid-message
      client.to(code).emit('chat:typing', { fromId: client.id, from: member.name, typing: false });
      client.to(code).emit('room:system', { text: `${member.name} left the den` });
    }
  }

  private broadcastMembers(code: string) {
    const members = [...(this.rooms.get(code)?.values() ?? [])];
    this.server.to(code).emit('room:members', { members });
  }
}
