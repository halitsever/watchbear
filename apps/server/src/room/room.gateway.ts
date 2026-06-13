import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface Member {
  id: string;
  name: string;
  fur: string;
  furDark: string;
  host: boolean;
}

interface JoinPayload {
  code: string;
  member: { name: string; fur: string; furDark: string };
}

@WebSocketGateway({ cors: { origin: '*' } })
export class RoomGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly rooms = new Map<string, Map<string, Member>>();
  private readonly socketRoom = new Map<string, string>();

  @SubscribeMessage('room:join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() { code, member }: JoinPayload) {
    void client.join(code);
    this.socketRoom.set(client.id, code);
    const room = this.rooms.get(code) ?? new Map<string, Member>();
    room.set(client.id, { id: client.id, ...member, host: room.size === 0 });
    this.rooms.set(code, room);
    this.broadcastMembers(code);
    client.to(code).emit('room:system', { text: `🐻 ${member.name} joined the den` });
  }

  @SubscribeMessage('room:leave')
  handleLeave(@ConnectedSocket() client: Socket) {
    this.removeFromRoom(client);
  }

  @SubscribeMessage('chat:send')
  handleChat(@ConnectedSocket() client: Socket, @MessageBody() { text }: { text: string }) {
    const code = this.socketRoom.get(client.id);
    const member = code ? this.rooms.get(code)?.get(client.id) : undefined;
    if (!code || !member) return;
    client.to(code).emit('chat:message', { fromId: client.id, from: member.name, text });
  }

  // Silent video-sync channel: joins the room to receive control events without
  // counting as a member.
  @SubscribeMessage('video:subscribe')
  handleVideoSubscribe(@ConnectedSocket() client: Socket, @MessageBody() { code }: { code: string }) {
    void client.join(code);
  }

  @SubscribeMessage('video:control')
  handleVideoControl(
    @ConnectedSocket() client: Socket,
    @MessageBody() { code, action, time }: { code: string; action: string; time: number },
  ) {
    client.to(code).emit('video:control', { action, time });
  }

  handleDisconnect(client: Socket) {
    this.removeFromRoom(client);
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
      if (room.size === 0) this.rooms.delete(code);
    }
    this.broadcastMembers(code);
    if (member) client.to(code).emit('room:system', { text: `${member.name} left the den` });
  }

  private broadcastMembers(code: string) {
    const members = [...(this.rooms.get(code)?.values() ?? [])];
    this.server.to(code).emit('room:members', { members });
  }
}
