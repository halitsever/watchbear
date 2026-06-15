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
import { ChatDto, JoinDto, SubscribeDto, VideoControlDto } from './room.dto';

interface Member {
  id: string;
  name: string;
  fur: string;
  furDark: string;
  host: boolean;
}

const MAX_ROOMS = 5_000;
const MAX_MEMBERS_PER_ROOM = 50;
const RATE_LIMIT = 25;
const RATE_WINDOW_MS = 1_000;

@WebSocketGateway({ cors: { origin: corsOrigin }, maxHttpBufferSize: 16 * 1024 })
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class RoomGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly rooms = new Map<string, Map<string, Member>>();
  private readonly socketRoom = new Map<string, string>();
  private readonly videoState = new Map<string, { time: number; paused: boolean; updatedAt: number }>();
  private readonly hits = new Map<string, { count: number; reset: number }>();

  // crude per-socket sliding window so a single client can't flood join/chat/control.
  // @nestjs/throttler has no first-class ws path (it needs a custom guard subclass
  // either way), so a small inline limiter is the clearer option here.
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
  handleChat(@ConnectedSocket() client: Socket, @MessageBody() { text }: ChatDto) {
    if (!this.withinRate(client)) return;
    const code = this.socketRoom.get(client.id);
    const member = code ? this.rooms.get(code)?.get(client.id) : undefined;
    if (!code || !member) return;
    client.to(code).emit('chat:message', { fromId: client.id, from: member.name, text });
  }

  // silent video-sync channel, joins the room to receive control events without
  // counting as a member. binding the socket to the code here is what later
  // authorizes its video:control emits.
  @SubscribeMessage('video:subscribe')
  handleVideoSubscribe(@ConnectedSocket() client: Socket, @MessageBody() { code }: SubscribeDto) {
    if (!this.withinRate(client)) return;
    void client.join(code);
    this.socketRoom.set(client.id, code);
    const s = this.videoState.get(code);
    if (s) {
      const elapsed = s.paused ? 0 : (Date.now() - s.updatedAt) / 1000;
      client.emit('video:control', { time: s.time + elapsed, paused: s.paused });
    }
  }

  @SubscribeMessage('video:control')
  handleVideoControl(@ConnectedSocket() client: Socket, @MessageBody() { time, paused }: VideoControlDto) {
    if (!this.withinRate(client)) return;
    // trust the server-tracked binding, never the code in the payload, so a client
    // can only drive the room it actually joined or subscribed to.
    const code = this.socketRoom.get(client.id);
    if (!code) return;
    this.videoState.set(code, { time, paused, updatedAt: Date.now() });
    client.to(code).emit('video:control', { time, paused });
  }

  handleDisconnect(client: Socket) {
    this.removeFromRoom(client);
    this.hits.delete(client.id);
  }

  private removeFromRoom(client: Socket) {
    const code = this.socketRoom.get(client.id);
    if (!code) return;
    this.socketRoom.delete(client.id);
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
      if (room.size === 0) {
        this.rooms.delete(code);
        this.videoState.delete(code);
      }
    }
    this.broadcastMembers(code);
    if (member) client.to(code).emit('room:system', { text: `${member.name} left the den` });
  }

  private broadcastMembers(code: string) {
    const members = [...(this.rooms.get(code)?.values() ?? [])];
    this.server.to(code).emit('room:members', { members });
  }
}
