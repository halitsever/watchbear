import { describe, it, expect, beforeEach } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { RoomGateway } from './room.gateway';

interface Emit {
  room?: string;
  event: string;
  payload: unknown;
}

function makeServer(sink: Emit[]): Server {
  return {
    to: (room: string) => ({ emit: (event: string, payload?: unknown) => sink.push({ room, event, payload }) }),
  } as unknown as Server;
}

let nextId = 0;
function makeClient(sink: Emit[]): Socket {
  return {
    id: `sock-${nextId++}`,
    join() {},
    leave() {},
    emit(event: string, payload?: unknown) {
      sink.push({ event, payload });
    },
    to: (room: string) => ({ emit: (event: string, payload?: unknown) => sink.push({ room, event, payload }) }),
  } as unknown as Socket;
}

const CODE = 'BEAR-TEST01';
const member = (name: string) => ({ name, fur: '#aabbcc', furDark: '#001122' });

describe('RoomGateway membership', () => {
  let gw: RoomGateway;
  let sink: Emit[];

  beforeEach(() => {
    gw = new RoomGateway();
    sink = [];
    (gw as unknown as { server: Server }).server = makeServer(sink);
  });

  const rooms = () => (gw as unknown as { rooms: Map<string, Map<string, { host: boolean }>> }).rooms;

  it('makes the first joiner host and later joiners non-host', () => {
    const a = makeClient(sink);
    const b = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    gw.handleJoin(b, { code: CODE, member: member('B') });
    expect(rooms().get(CODE)!.get(a.id)!.host).toBe(true);
    expect(rooms().get(CODE)!.get(b.id)!.host).toBe(false);
    expect(sink.some((e) => e.event === 'room:members')).toBe(true);
  });

  it('rejects joins once the room is full', () => {
    for (let i = 0; i < 50; i++) gw.handleJoin(makeClient(sink), { code: CODE, member: member(`m${i}`) });
    const extra = makeClient(sink);
    gw.handleJoin(extra, { code: CODE, member: member('overflow') });
    expect(rooms().get(CODE)!.size).toBe(50);
    expect(rooms().get(CODE)!.has(extra.id)).toBe(false);
  });

  it('hands the crown to a remaining member when the host leaves', () => {
    const a = makeClient(sink);
    const b = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    gw.handleJoin(b, { code: CODE, member: member('B') });
    gw.handleDisconnect(a);
    expect(rooms().get(CODE)!.get(b.id)!.host).toBe(true);
  });

  it('drops the room once everyone leaves', () => {
    const a = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    gw.handleDisconnect(a);
    expect(rooms().has(CODE)).toBe(false);
  });

  it('broadcasts typing to the rest of the den with the sender name', () => {
    const a = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    sink.length = 0;
    gw.handleTyping(a, { typing: true });
    const ev = sink.find((e) => e.event === 'chat:typing');
    expect(ev).toEqual({ room: CODE, event: 'chat:typing', payload: { fromId: a.id, from: 'A', typing: true } });
  });

  it('ignores typing from a socket that never joined', () => {
    const stranger = makeClient(sink);
    gw.handleTyping(stranger, { typing: true });
    expect(sink.some((e) => e.event === 'chat:typing')).toBe(false);
  });

  it('clears the typing dots when a typing member disconnects', () => {
    const a = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    sink.length = 0;
    gw.handleDisconnect(a);
    expect(sink.some((e) => e.event === 'chat:typing' && (e.payload as { typing: boolean }).typing === false)).toBe(true);
  });
});

describe('RoomGateway video sync', () => {
  let gw: RoomGateway;
  let sink: Emit[];

  beforeEach(() => {
    gw = new RoomGateway();
    sink = [];
    (gw as unknown as { server: Server }).server = makeServer(sink);
  });

  const roomContent = () =>
    (gw as unknown as { roomContent: Map<string, { key: string }> }).roomContent;

  it('only lets the canonical video drive control events', () => {
    const a = makeClient(sink);
    const b = makeClient(sink);
    // A anchors the den on video K1
    gw.handleVideoSubscribe(a, { code: CODE, anchor: true, key: 'K1', url: 'https://x/1' });
    // B is watching a different video K2
    gw.handleVideoSubscribe(b, { code: CODE, key: 'K2', url: 'https://x/2' });

    sink.length = 0;
    gw.handleVideoControl(a, { code: CODE, time: 10, paused: false });
    expect(sink.some((e) => e.event === 'video:control')).toBe(true);

    sink.length = 0;
    gw.handleVideoControl(b, { code: CODE, time: 99, paused: true });
    expect(sink.some((e) => e.event === 'video:control')).toBe(false);
  });

  it('reseats the anchor to a remaining watcher when the anchor disconnects', () => {
    const a = makeClient(sink);
    const b = makeClient(sink);
    gw.handleVideoSubscribe(a, { code: CODE, anchor: true, key: 'K1', url: 'https://x/1' });
    gw.handleVideoSubscribe(b, { code: CODE, key: 'K2', url: 'https://x/2' });

    gw.handleDisconnect(a);
    expect(roomContent().get(CODE)!.key).toBe('K2');
  });

  it('tears down room content when the last watcher leaves', () => {
    const a = makeClient(sink);
    gw.handleVideoSubscribe(a, { code: CODE, anchor: true, key: 'K1', url: 'https://x/1' });
    gw.handleDisconnect(a);
    expect(roomContent().has(CODE)).toBe(false);
  });
});

describe('RoomGateway rate limiting', () => {
  it('allows up to the limit then blocks within the window', () => {
    const gw = new RoomGateway();
    const within = (gw as unknown as { withinRate: (c: Socket) => boolean }).withinRate.bind(gw);
    const client = makeClient([]);
    for (let i = 0; i < 25; i++) expect(within(client)).toBe(true);
    expect(within(client)).toBe(false);
  });
});
