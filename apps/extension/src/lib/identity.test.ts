import { describe, it, expect } from 'vitest';
import { BEARS, getIdentity, setIdentityName, setIdentityCharacter } from './identity';

describe('getIdentity', () => {
  it('assigns a known bear and persists it on first read', async () => {
    const id = await getIdentity();
    expect(BEARS).toContainEqual(id);
    const stored = await chrome.storage.local.get('wb_identity');
    expect(stored.wb_identity).toEqual(id);
  });

  it('returns the stored identity unchanged when complete', async () => {
    const mine = { name: 'Halit', fur: '#123456', furDark: '#000000' };
    await chrome.storage.local.set({ wb_identity: mine });
    expect(await getIdentity()).toEqual(mine);
  });

  it('recovers from a partial record by filling missing fields', async () => {
    await chrome.storage.local.set({ wb_identity: { name: '   ' } });
    const id = await getIdentity();
    expect(id.name).toBeTruthy();
    expect(id.fur).toBeTruthy();
    expect(id.furDark).toBeTruthy();
  });
});

describe('setIdentityName', () => {
  it('trims the name before storing', async () => {
    await setIdentityName('  Cub  ');
    expect((await getIdentity()).name).toBe('Cub');
  });

  it('ignores a blank name', async () => {
    await setIdentityName('Cub');
    await setIdentityName('   ');
    expect((await getIdentity()).name).toBe('Cub');
  });
});

describe('setIdentityCharacter', () => {
  it('swaps fur colors while keeping the name', async () => {
    await setIdentityName('Cub');
    await setIdentityCharacter('#abcdef', '#012345');
    const id = await getIdentity();
    expect(id).toMatchObject({ name: 'Cub', fur: '#abcdef', furDark: '#012345' });
  });
});
