import { describe, it, expect } from 'vitest';
import { generateCode, isValidCode, ROOM_CODE_RE } from './room';

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
    expect(isValidCode('A-BCDE')).toBe(false); // word too short
    expect(isValidCode('BEAR-AB')).toBe(false); // suffix too short
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
