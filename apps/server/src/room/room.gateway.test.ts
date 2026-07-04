import { describe, it, expect, beforeEach } from 'vitest';
import type { Server, Socket } from 'socket.io';
import type { AuthService } from '../auth/auth.service';
import { RoomGateway } from './room.gateway';

// the gateway only calls verifyToken on connect; tests never set a handshake token.
const fakeAuth = { verifyToken: () => null, isConfigured: () => true, customizeRequiresLogin: () => true, joinRequiresLogin: () => false } as unknown as AuthService;

// enforcement disabled: guests keep their chosen name/color (extension-rollout mode)
const lenientAuth = { verifyToken: () => null, isConfigured: () => true, customizeRequiresLogin: () => false, joinRequiresLogin: () => false } as unknown as AuthService;

// full enforcement: guests cannot join at all
const strictAuth = { verifyToken: () => null, isConfigured: () => true, customizeRequiresLogin: () => true, joinRequiresLogin: () => true } as unknown as AuthService;

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
function makeClient(sink: Emit[], opts: { guest?: boolean } = {}): Socket {
  return {
    id: `sock-${nextId++}`,
    // logged-in by default so name/color assertions hold; pass guest:true to test enforcement.
    data: opts.guest ? {} : { user: { id: 'u1', plan: 'free' } },
    join() { },
    leave() { },
    emit(event: string, payload?: unknown) {
      sink.push({ event, payload });
    },
    to: (room: string) => ({ emit: (event: string, payload?: unknown) => sink.push({ room, event, payload }) }),
  } as unknown as Socket;
}

const BEAR_NAMES = ['Cinnamon', 'Cocoa', 'Pumpkin', 'Maple', 'Hazel', 'Cloud', 'Smoke', 'Olive'];

const CODE = 'BEAR-TEST01';
const member = (name: string) => ({ name, fur: '#aabbcc', furDark: '#001122' });

describe('RoomGateway membership', () => {
  let gw: RoomGateway;
  let sink: Emit[];

  beforeEach(() => {
    gw = new RoomGateway(fakeAuth);
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

  it('relays a chat message with its id and reply snapshot', () => {
    const a = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    sink.length = 0;
    const replyTo = { mid: 'm1', from: 'B', text: 'hello' };
    gw.handleChat(a, { text: 'hi', mid: 'm2', replyTo });
    expect(sink).toContainEqual({
      room: CODE,
      event: 'chat:message',
      payload: { fromId: a.id, from: 'A', text: 'hi', mid: 'm2', replyTo },
    });
  });

  it('ignores chat from a socket that never joined', () => {
    const stranger = makeClient(sink);
    gw.handleChat(stranger, { text: 'hi' });
    expect(sink.some((e) => e.event === 'chat:message')).toBe(false);
  });

  it('broadcasts an expanded-set reaction and drops an unknown one', () => {
    const a = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    sink.length = 0;
    gw.handleReaction(a, { emoji: '🔥' });
    expect(sink.some((e) => e.event === 'reaction:show' && (e.payload as { emoji: string }).emoji === '🔥')).toBe(true);

    sink.length = 0;
    gw.handleReaction(a, { emoji: '🦄' });
    expect(sink.some((e) => e.event === 'reaction:show')).toBe(false);
  });

  it('updates a member in place and announces a rename', () => {
    const a = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    sink.length = 0;
    gw.handleMemberUpdate(a, { member: { name: 'Cocoa', fur: '#7A4A2B', furDark: '#5E3720' } });
    const stored = rooms().get(CODE)!.get(a.id)! as unknown as { name: string; fur: string };
    expect(stored.name).toBe('Cocoa');
    expect(stored.fur).toBe('#7A4A2B');
    expect(sink.some((e) => e.event === 'room:members')).toBe(true);
    expect(sink.some((e) => e.event === 'room:system' && (e.payload as { text: string }).text === '🐻 A is now Cocoa')).toBe(true);
  });

  it('announces a look change when only the bear changes', () => {
    const a = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    sink.length = 0;
    gw.handleMemberUpdate(a, { member: { name: 'A', fur: '#7A4A2B', furDark: '#5E3720' } });
    expect(sink.some((e) => e.event === 'room:system' && (e.payload as { text: string }).text === '🐻 A changed their look')).toBe(true);
  });

  it('ignores a member update from a socket that never joined', () => {
    const stranger = makeClient(sink);
    gw.handleMemberUpdate(stranger, { member: member('ghost') });
    expect(sink.some((e) => e.event === 'room:members')).toBe(false);
  });

  it('clears the typing dots when a typing member disconnects', () => {
    const a = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    sink.length = 0;
    gw.handleDisconnect(a);
    expect(sink.some((e) => e.event === 'chat:typing' && (e.payload as { typing: boolean }).typing === false)).toBe(true);
  });

  it('assigns a guest a random bear, ignoring their requested name, color and avatar', () => {
    const guest = makeClient(sink, { guest: true });
    gw.handleJoin(guest, { code: CODE, member: { name: 'Hacker', fur: '#000000', furDark: '#111111', avatar: 'https://evil/x.png' } });
    const stored = rooms().get(CODE)!.get(guest.id)! as unknown as { name: string; fur: string; avatar?: string };
    expect(stored.name).not.toBe('Hacker');
    expect(stored.fur).not.toBe('#000000');
    expect(stored.avatar).toBeUndefined();
    expect(BEAR_NAMES).toContain(stored.name);
  });

  it('ignores a member update from a guest', () => {
    const guest = makeClient(sink, { guest: true });
    gw.handleJoin(guest, { code: CODE, member: member('ignored') });
    const before = (rooms().get(CODE)!.get(guest.id)! as unknown as { name: string }).name;
    sink.length = 0;
    gw.handleMemberUpdate(guest, { member: { name: 'Custom', fur: '#7A4A2B', furDark: '#5E3720' } });
    const after = (rooms().get(CODE)!.get(guest.id)! as unknown as { name: string }).name;
    expect(after).toBe(before);
    expect(sink.some((e) => e.event === 'room:members')).toBe(false);
  });

  it('keeps a guest chosen name when login is not enforced', () => {
    const lenient = new RoomGateway(lenientAuth);
    (lenient as unknown as { server: Server }).server = makeServer(sink);
    const guest = makeClient(sink, { guest: true });
    lenient.handleJoin(guest, { code: CODE, member: { name: 'Maple-Lover', fur: '#C06B3A', furDark: '#9E5328' } });
    const roomsOf = (lenient as unknown as { rooms: Map<string, Map<string, { name: string; fur: string }>> }).rooms;
    const stored = roomsOf.get(CODE)!.get(guest.id)!;
    expect(stored.name).toBe('Maple-Lover');
    expect(stored.fur).toBe('#C06B3A');
  });
});

describe('RoomGateway video sync', () => {
  let gw: RoomGateway;
  let sink: Emit[];

  beforeEach(() => {
    gw = new RoomGateway(fakeAuth);
    sink = [];
    (gw as unknown as { server: Server }).server = makeServer(sink);
  });

  const roomContent = () =>
    (gw as unknown as { roomContent: Map<string, { key: string }> }).roomContent;

  it('relays control to the whole room regardless of content key', () => {
    const a = makeClient(sink);
    const b = makeClient(sink);
    // A and B are on different videos (different keys), no content gate anymore
    gw.handleVideoSubscribe(a, { code: CODE, anchor: true, key: 'K1', url: 'https://x/1' });
    gw.handleVideoSubscribe(b, { code: CODE, key: 'K2', url: 'https://x/2' });

    sink.length = 0;
    gw.handleVideoControl(a, { code: CODE, time: 10, paused: false });
    expect(sink).toContainEqual({ room: CODE, event: 'video:control', payload: { time: 10, paused: false } });

    sink.length = 0;
    gw.handleVideoControl(b, { code: CODE, time: 99, paused: true });
    expect(sink).toContainEqual({ room: CODE, event: 'video:control', payload: { time: 99, paused: true } });
  });

  const systemTexts = () =>
    sink.filter((e) => e.event === 'room:system').map((e) => (e.payload as { text: string }).text);

  it('announces pause and resume to the whole den with the bear name', () => {
    const a = makeClient(sink);
    gw.handleVideoSubscribe(a, { code: CODE, anchor: true, key: 'K1', url: 'https://x/1', name: 'Maple' });

    sink.length = 0;
    gw.handleVideoControl(a, { code: CODE, time: 30, paused: true });
    expect(sink).toContainEqual({ room: CODE, event: 'room:system', payload: { text: 'Maple paused the video' } });

    sink.length = 0;
    gw.handleVideoControl(a, { code: CODE, time: 30, paused: false });
    expect(systemTexts()).toContain('Maple resumed the video');
  });

  it('announces a forward seek with direction and timestamp', () => {
    const a = makeClient(sink);
    gw.handleVideoSubscribe(a, { code: CODE, anchor: true, key: 'K1', url: 'https://x/1', name: 'Maple' });
    gw.handleVideoControl(a, { code: CODE, time: 10, paused: false });

    sink.length = 0;
    gw.handleVideoControl(a, { code: CODE, time: 100, paused: false });
    expect(systemTexts()).toContain('Maple skipped ahead to 1:40');
  });

  it('announces a speed change with the new rate', () => {
    const a = makeClient(sink);
    gw.handleVideoSubscribe(a, { code: CODE, anchor: true, key: 'K1', url: 'https://x/1', name: 'Maple' });
    gw.handleVideoControl(a, { code: CODE, time: 10, paused: false });

    sink.length = 0;
    gw.handleVideoControl(a, { code: CODE, time: 10, paused: false, rate: 1.5 });
    expect(systemTexts()).toContain('Maple set the speed to 1.5x');
  });

  it('stays silent when the video socket carries no name', () => {
    const a = makeClient(sink);
    gw.handleVideoSubscribe(a, { code: CODE, anchor: true, key: 'K1', url: 'https://x/1' });

    sink.length = 0;
    gw.handleVideoControl(a, { code: CODE, time: 30, paused: true });
    expect(sink.some((e) => e.event === 'room:system')).toBe(false);
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
    const gw = new RoomGateway(fakeAuth);
    const within = (gw as unknown as { withinRate: (c: Socket) => boolean }).withinRate.bind(gw);
    const client = makeClient([]);
    for (let i = 0; i < 25; i++) expect(within(client)).toBe(true);
    expect(within(client)).toBe(false);
  });
});

describe('RoomGateway join enforcement', () => {
  let gw: RoomGateway;
  let sink: Emit[];

  beforeEach(() => {
    gw = new RoomGateway(strictAuth);
    sink = [];
    (gw as unknown as { server: Server }).server = makeServer(sink);
  });

  const rooms = () => (gw as unknown as { rooms: Map<string, Map<string, unknown>> }).rooms;

  it('denies a guest join and tells the socket why', () => {
    const guest = makeClient(sink, { guest: true });
    gw.handleJoin(guest, { code: CODE, member: member('Guest') });
    expect(rooms().has(CODE)).toBe(false);
    expect(sink).toContainEqual({ event: 'room:denied', payload: { reason: 'auth' } });
  });

  it('lets an authenticated user join when login is enforced', () => {
    const a = makeClient(sink);
    gw.handleJoin(a, { code: CODE, member: member('A') });
    expect(rooms().get(CODE)!.has(a.id)).toBe(true);
    expect(sink.some((e) => e.event === 'room:denied')).toBe(false);
  });

  it('denies a guest video subscribe and tells the socket why', () => {
    const guest = makeClient(sink, { guest: true });
    gw.handleVideoSubscribe(guest, { code: CODE, anchor: true, key: 'K1', url: 'https://x/1' });
    const roomContent = (gw as unknown as { roomContent: Map<string, unknown> }).roomContent;
    expect(roomContent.has(CODE)).toBe(false);
    expect(sink).toContainEqual({ event: 'room:denied', payload: { reason: 'auth' } });
  });

  it('lets a guest join when enforcement is off', () => {
    const lenient = new RoomGateway(fakeAuth);
    (lenient as unknown as { server: Server }).server = makeServer(sink);
    const guest = makeClient(sink, { guest: true });
    lenient.handleJoin(guest, { code: CODE, member: member('Guest') });
    const roomsOf = (lenient as unknown as { rooms: Map<string, Map<string, unknown>> }).rooms;
    expect(roomsOf.get(CODE)!.has(guest.id)).toBe(true);
  });
});
