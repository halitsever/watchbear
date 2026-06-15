import { beforeEach, vi } from 'vitest';

// minimal in-memory chrome.storage.local so lib code that reads/writes storage
// runs unchanged under node. reset before each test for isolation.
const store = new Map<string, unknown>();

function get(keys?: string | string[] | Record<string, unknown> | null): Record<string, unknown> {
  if (keys == null) return Object.fromEntries(store);
  const names = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
  const out: Record<string, unknown> = {};
  for (const k of names) if (store.has(k)) out[k] = store.get(k);
  return out;
}

const chromeStub = {
  storage: {
    local: {
      get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => get(keys)),
      set: vi.fn(async (items: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(items)) store.set(k, v);
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        for (const k of typeof keys === 'string' ? [keys] : keys) store.delete(k);
      }),
    },
  },
};

vi.stubGlobal('chrome', chromeStub);

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});
