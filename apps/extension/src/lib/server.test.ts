import { describe, it, expect } from 'vitest';
import { normalizeServerUrl } from './server';

describe('normalizeServerUrl', () => {
  it('assumes https when no scheme is typed', () => {
    expect(normalizeServerUrl('watch.example.com')).toBe('https://watch.example.com');
  });

  it('keeps an explicit http scheme', () => {
    expect(normalizeServerUrl('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('returns the bare origin, dropping path and trailing slash', () => {
    expect(normalizeServerUrl('https://example.com/some/path/')).toBe('https://example.com');
  });

  it('rejects non-http(s) schemes instead of rewriting them', () => {
    expect(normalizeServerUrl('ftp://ftp.example.com')).toBeNull();
  });

  it('returns null for empty or unparseable input', () => {
    expect(normalizeServerUrl('')).toBeNull();
    expect(normalizeServerUrl('   ')).toBeNull();
    expect(normalizeServerUrl('http://')).toBeNull();
  });
});
