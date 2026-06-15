import { test, expect } from '@playwright/test';
import { launchUser, type User } from './fixtures';

test('the popup rejects an invalid room code and accepts a valid one', async () => {
  let u: User | undefined;
  try {
    u = await launchUser();
    const popup = await u.openPopup();

    const codeInput = popup.getByPlaceholder('ROOM CODE');
    const badCode = popup.getByText("That doesn't look like a room code", { exact: false });

    // partial / malformed code surfaces the prominent callout
    await codeInput.fill('NOPE');
    await expect(badCode).toBeVisible();

    // a well-formed code clears it (mirrors isValidCode / server CODE regex)
    await codeInput.fill('BEAR-AB12CD');
    await expect(badCode).toHaveCount(0);
  } finally {
    await u?.close();
  }
});

test('picking a name and a bear persists the identity', async () => {
  let u: User | undefined;
  try {
    u = await launchUser();
    const popup = await u.openPopup();

    await popup.getByPlaceholder('your bear name').fill('Halit');

    // pick a specific bear so the expected fur is deterministic (Olive == #A7B07A)
    await popup.getByTitle('Olive').click();

    await expect
      .poll(async () => {
        const data = await u!.worker.evaluate(() => chrome.storage.local.get('wb_identity'));
        return data.wb_identity as { name?: string; fur?: string };
      })
      .toMatchObject({ name: 'Halit', fur: '#A7B07A' });
  } finally {
    await u?.close();
  }
});
