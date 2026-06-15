import { describe, it, expect } from 'vitest';
import { contentKey } from './content';

describe('contentKey', () => {
  it('extracts the youtube video id from a watch url', () => {
    expect(contentKey('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('yt:dQw4w9WgXcQ');
  });

  it('extracts the id from youtu.be short links', () => {
    expect(contentKey('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('yt:dQw4w9WgXcQ');
  });

  it('treats m. and www. youtube hosts the same', () => {
    expect(contentKey('https://m.youtube.com/watch?v=abc123')).toBe('yt:abc123');
  });

  it('drops volatile timestamp/tracking params', () => {
    const a = contentKey('https://vimeo.com/123?t=10&utm_source=x&keep=1');
    const b = contentKey('https://vimeo.com/123?keep=1');
    expect(a).toBe(b);
  });

  it('sorts surviving query params so order does not matter', () => {
    expect(contentKey('https://site.com/v?b=2&a=1')).toBe(contentKey('https://site.com/v?a=1&b=2'));
  });

  it('keeps host + path for non-youtube urls', () => {
    expect(contentKey('https://www.example.com/video/9')).toBe('example.com/video/9');
  });

  it('returns the raw input when the url cannot be parsed', () => {
    expect(contentKey('not a url')).toBe('not a url');
  });
});
