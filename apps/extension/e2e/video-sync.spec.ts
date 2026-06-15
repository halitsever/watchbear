import { test, expect } from '@playwright/test';
import { launchUser, videoPaused, setVideo, VIDEO_URL, type User } from './fixtures';

// must satisfy the server's code regex ^[A-Z]{2,8}-[A-Z0-9]{4,12}$
const CODE = 'BEAR-TEST01';

test('play/pause stays in sync between two users', async () => {
  let a: User | undefined;
  let b: User | undefined;
  try {
    a = await launchUser();
    b = await launchUser();

    // both open the side panel so the room/member UI is visible while watching
    await a.openSidePanel();
    await b.openSidePanel();

    // wait until each <video> can actually play (real source or synthetic fallback)
    await a.video.waitForFunction(() => (window as { __wbVideoReady?: boolean }).__wbVideoReady === true);
    await b.video.waitForFunction(() => (window as { __wbVideoReady?: boolean }).__wbVideoReady === true);

    await a.joinRoom(CODE);
    await b.joinRoom(CODE);

    // let both content scripts connect and video:subscribe
    await a.video.waitForTimeout(2000);

    // A starts playing -> B should follow
    await setVideo(a.video, 'play', 5);
    await expect.poll(() => videoPaused(b!.video), { timeout: 8000 }).toBe(false);

    // A pauses -> B should pause
    await setVideo(a.video, 'pause');
    await expect.poll(() => videoPaused(b!.video), { timeout: 8000 }).toBe(true);
  } finally {
    await a?.close();
    await b?.close();
  }
});

test('a user on a different video is flagged and not cross-synced', async () => {
  let a: User | undefined;
  let b: User | undefined;
  try {
    a = await launchUser();
    b = await launchUser();

    // B watches a different url (same page, distinct content key via query)
    await b.video.goto(`${VIDEO_URL}?other=1`);
    await b.video.waitForSelector('video');

    await a.video.waitForFunction(() => (window as { __wbVideoReady?: boolean }).__wbVideoReady === true);
    await b.video.waitForFunction(() => (window as { __wbVideoReady?: boolean }).__wbVideoReady === true);

    // A subscribes first, so A's video becomes the den's canonical content
    await a.joinRoom(CODE);
    await a.video.waitForTimeout(1000);
    await b.joinRoom(CODE);

    // B is on the wrong video -> gets the prominent "open it" callout
    await expect(b.video.locator('#wb-diverged')).toBeVisible({ timeout: 8000 });

    // A starts playing -> B must NOT follow, since they're not on the same video
    await setVideo(b.video, 'pause');
    await setVideo(a.video, 'play', 5);
    await b.video.waitForTimeout(3000);
    expect(await videoPaused(b.video)).toBe(true);

    // clicking "open it" moves B onto the den's video, then sync resumes
    await b.video.locator('.wb-diverged-btn').click();
    await b.video.waitForFunction(() => (window as { __wbVideoReady?: boolean }).__wbVideoReady === true);
    await expect(b.video.locator('#wb-diverged')).toHaveCount(0, { timeout: 8000 });
    await setVideo(a.video, 'play', 7);
    await expect.poll(() => videoPaused(b!.video), { timeout: 8000 }).toBe(false);
  } finally {
    await a?.close();
    await b?.close();
  }
});
