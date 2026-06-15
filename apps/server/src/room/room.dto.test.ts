import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ChatDto, JoinDto, VideoControlDto } from './room.dto';

function errorsFor<T>(cls: new () => T, payload: unknown): string[] {
  const instance = plainToInstance(cls, payload);
  return validateSync(instance as object, { whitelist: true, forbidNonWhitelisted: true }).flatMap(
    (e) => Object.keys(e.constraints ?? {}).concat(e.children?.flatMap((c) => Object.keys(c.constraints ?? {})) ?? []),
  );
}

const member = { name: 'Cub', fur: '#aabbcc', furDark: '#001122' };

describe('JoinDto', () => {
  it('accepts a valid code + member', () => {
    expect(errorsFor(JoinDto, { code: 'BEAR-TEST01', member })).toHaveLength(0);
  });

  it('rejects a code that fails the regex (mirrors the extension)', () => {
    expect(errorsFor(JoinDto, { code: 'bear-test01', member }).length).toBeGreaterThan(0);
    expect(errorsFor(JoinDto, { code: 'BEARTEST01', member }).length).toBeGreaterThan(0);
  });

  it('rejects a name over 24 chars', () => {
    expect(errorsFor(JoinDto, { code: 'BEAR-TEST01', member: { ...member, name: 'x'.repeat(25) } }).length).toBeGreaterThan(0);
  });

  it('rejects non-hex fur colors', () => {
    expect(errorsFor(JoinDto, { code: 'BEAR-TEST01', member: { ...member, fur: 'red' } }).length).toBeGreaterThan(0);
  });
});

describe('ChatDto', () => {
  it('accepts text up to 500 chars and rejects beyond', () => {
    expect(errorsFor(ChatDto, { text: 'x'.repeat(500) })).toHaveLength(0);
    expect(errorsFor(ChatDto, { text: 'x'.repeat(501) }).length).toBeGreaterThan(0);
  });
});

describe('VideoControlDto', () => {
  it('accepts an in-range time', () => {
    expect(errorsFor(VideoControlDto, { code: 'BEAR-TEST01', time: 42, paused: false })).toHaveLength(0);
  });

  it('rejects time outside 0..86400', () => {
    expect(errorsFor(VideoControlDto, { code: 'BEAR-TEST01', time: -1, paused: false }).length).toBeGreaterThan(0);
    expect(errorsFor(VideoControlDto, { code: 'BEAR-TEST01', time: 86_401, paused: false }).length).toBeGreaterThan(0);
  });
});
