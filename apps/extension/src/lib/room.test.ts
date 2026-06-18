import { describe, it, expect } from 'vitest';
import {
  generateCode,
  isValidCode,
  ROOM_CODE_RE,
  buildInviteLink,
  parseInviteCode,
  parseInviteUrl,
  INVITE_BASE_URL,
} from './room';

describe('isValidCode', () => {
  it('accepts well-formed codes', () => {
    expect(isValidCode('BEAR-TEST01')).toBe(true);
    expect(isValidCode('DEN-AB3K')).toBe(true);
  });

  it('trims surrounding whitespace before testing', () => {
    expect(isValidCode('  BEAR-TEST01  ')).toBe(true);
  });

  it('rejects lowercase, missing dash, and bad lengths', () => {
    expect(isValidCode('bear-test01')).toBe(false);
    expect(isValidCode('BEARTEST01')).toBe(false);
    expect(isValidCode('A-BCDE')).toBe(false);
    expect(isValidCode('BEAR-AB')).toBe(false);
    expect(isValidCode('')).toBe(false);
  });
});

describe('generateCode', () => {
  it('produces a code that passes its own validator', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(ROOM_CODE_RE.test(code)).toBe(true);
    }
  });

  it('never uses the ambiguous 0/O/1/I in the suffix', () => {
    for (let i = 0; i < 200; i++) {
      const suffix = generateCode().split('-')[1];
      expect(suffix).not.toMatch(/[01OI]/);
    }
  });
});

describe('buildInviteLink', () => {
  it('points at the landing page with the code and encoded video url in the hash', () => {
    const link = buildInviteLink('https://www.netflix.com/watch/123?x=1', 'BEAR-AB12CD');
    expect(link.startsWith(`${INVITE_BASE_URL}#`)).toBe(true);
    expect(link).toContain('wb=BEAR-AB12CD');
    expect(link).toContain(`u=${encodeURIComponent('https://www.netflix.com/watch/123?x=1')}`);
    // the inner url's own query must not break the outer hash parsing
    expect(link.split('#')[1].split('&').length).toBe(2);
  });

  it('round-trips the code through parseInviteCode', () => {
    const link = buildInviteLink('https://youtu.be/abc', 'DEN-XY9Z');
    expect(parseInviteCode(new URL(link).hash)).toBe('DEN-XY9Z');
  });
});

describe('parseInviteCode', () => {
  it('reads the code from a landing hash and a bare video hash', () => {
    expect(parseInviteCode('#wb=BEAR-AB12CD&u=https%3A%2F%2Fx.com')).toBe('BEAR-AB12CD');
    expect(parseInviteCode('#wb=BEAR-AB12CD')).toBe('BEAR-AB12CD');
    expect(parseInviteCode('#t=30&wb=DEN-XY9Z')).toBe('DEN-XY9Z'); // not first
  });

  it('uppercases and validates', () => {
    expect(parseInviteCode('#wb=bear-ab12cd')).toBe('BEAR-AB12CD');
    expect(parseInviteCode('#wb=not-a-code!')).toBeNull();
    expect(parseInviteCode('#wb=')).toBeNull();
    expect(parseInviteCode('')).toBeNull();
    expect(parseInviteCode('#t=30')).toBeNull();
  });
});

describe('parseInviteUrl', () => {
  it('decodes the u= http(s) destination from a landing hash', () => {
    const link = buildInviteLink('https://www.netflix.com/watch/123?x=1', 'BEAR-AB12CD');
    expect(parseInviteUrl(new URL(link).hash)).toBe('https://www.netflix.com/watch/123?x=1');
    expect(parseInviteUrl('#wb=BEAR-AB12CD&u=https%3A%2F%2Fyoutu.be%2Fabc')).toBe('https://youtu.be/abc');
  });

  it('rejects non-http(s) and missing/invalid urls (no javascript:/data: smuggling)', () => {
    expect(parseInviteUrl('#wb=BEAR-AB12CD&u=javascript%3Aalert(1)')).toBeNull();
    expect(parseInviteUrl('#wb=BEAR-AB12CD&u=data%3Atext%2Fhtml%2Cx')).toBeNull();
    expect(parseInviteUrl('#wb=BEAR-AB12CD&u=not%20a%20url')).toBeNull();
    expect(parseInviteUrl('#wb=BEAR-AB12CD')).toBeNull();
    expect(parseInviteUrl('')).toBeNull();
  });
});
