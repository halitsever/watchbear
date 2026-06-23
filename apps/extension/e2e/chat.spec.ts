import { test, expect } from '@playwright/test';
import { launchUser, type User } from './fixtures';

const CODE = 'BEAR-CHAT01';

// send a message through the side panel composer
async function say(panel: User['video'], text: string) {
  const input = panel.getByPlaceholder('Message the den…');
  await input.fill(text);
  await input.press('Enter');
}

test('chat messages travel between two users in the same den', async () => {
  let a: User | undefined;
  let b: User | undefined;
  try {
    a = await launchUser();
    b = await launchUser();

    await a.joinRoom(CODE);
    await b.joinRoom(CODE);

    const ap = await a.openSidePanel();
    const bp = await b.openSidePanel();

    // both panels must reach the den before chat can flow
    await expect(ap.getByText('Bear Den', { exact: true })).toBeVisible({ timeout: 8000 });
    await expect(bp.getByText('Bear Den', { exact: true })).toBeVisible({ timeout: 8000 });
    await ap.waitForTimeout(1500);

    // A to B
    await say(ap, 'honey time');
    await expect(bp.getByText('honey time')).toBeVisible({ timeout: 8000 });

    // B to A
    await say(bp, 'paws up');
    await expect(ap.getByText('paws up')).toBeVisible({ timeout: 8000 });
  } finally {
    await a?.close();
    await b?.close();
  }
});
