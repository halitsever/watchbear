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

    // A starts playing and B should follow
    await setVideo(a.video, 'play', 5);
    await expect.poll(() => videoPaused(b!.video), { timeout: 8000 }).toBe(false);

    // A pauses and B should pause
    await setVideo(a.video, 'pause');
    await expect.poll(() => videoPaused(b!.video), { timeout: 8000 }).toBe(true);
  } finally {
    await a?.close();
    await b?.close();
  }
});

// no content matching: a user on a different url still syncs, no callout
test('a user on a different url still syncs and shows no callout', async () => {
  let a: User | undefined;
  let b: User | undefined;
  try {
    a = await launchUser();
    b = await launchUser();

    // B watches a different url (same page, distinct query)
    await b.video.goto(`${VIDEO_URL}?other=1`);
    await b.video.waitForSelector('video');

    await a.video.waitForFunction(() => (window as { __wbVideoReady?: boolean }).__wbVideoReady === true);
    await b.video.waitForFunction(() => (window as { __wbVideoReady?: boolean }).__wbVideoReady === true);

    await a.joinRoom(CODE);
    await a.video.waitForTimeout(1000);
    await b.joinRoom(CODE);
    await b.video.waitForTimeout(2000);

    // no diverged callout exists anymore
    await expect(b.video.locator('#wb-diverged')).toHaveCount(0);

    // A starts playing and B follows even though it's a different url
    await setVideo(b.video, 'pause');
    await setVideo(a.video, 'play', 5);
    await expect.poll(() => videoPaused(b!.video), { timeout: 8000 }).toBe(false);
  } finally {
    await a?.close();
    await b?.close();
  }
});
