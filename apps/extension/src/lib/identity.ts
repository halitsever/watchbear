export interface Identity {
  name: string;
  fur: string;
  furDark: string;
}

export const BEARS: Identity[] = [
  { name: 'Cinnamon', fur: '#C06B3A', furDark: '#9E5328' },
  { name: 'Cocoa', fur: '#7A4A2B', furDark: '#5E3720' },
  { name: 'Pumpkin', fur: '#D9A441', furDark: '#B6822A' },
  { name: 'Maple', fur: '#C98A4B', furDark: '#A86B30' },
  { name: 'Hazel', fur: '#B97C43', furDark: '#9A6230' },
  { name: 'Cloud', fur: '#E6DCCB', furDark: '#CDBFA8' },
  { name: 'Smoke', fur: '#9AA0A6', furDark: '#757B80' },
  { name: 'Olive', fur: '#A7B07A', furDark: '#838C58' },
];

// stable per-browser identity, kept in storage so name/fur survive reconnects
// and panel reopens. fur is random, name defaults to a random bear until the
// user picks their own.
export async function getIdentity(): Promise<Identity> {
  const data = await chrome.storage.local.get('wb_identity');
  const stored = data.wb_identity as Partial<Identity> | undefined;
  if (stored && typeof stored.name === 'string' && stored.name.trim() && stored.fur && stored.furDark) {
    return stored as Identity;
  }
  const picked = BEARS[Math.floor(Math.random() * BEARS.length)];
  const next: Identity = {
    name: stored?.name?.trim() || picked.name,
    fur: stored?.fur ?? picked.fur,
    furDark: stored?.furDark ?? picked.furDark,
  };
  await chrome.storage.local.set({ wb_identity: next });
  return next;
}

export async function setIdentityName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const current = await getIdentity();
  await chrome.storage.local.set({ wb_identity: { ...current, name: trimmed } });
}

export async function setIdentityCharacter(fur: string, furDark: string): Promise<void> {
  const current = await getIdentity();
  await chrome.storage.local.set({ wb_identity: { ...current, fur, furDark } });
}
