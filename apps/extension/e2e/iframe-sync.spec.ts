import { test, expect } from '@playwright/test';
import { launchUser, videoFrame, videoPaused, setVideo, HOST_IFRAME_URL, type User } from './fixtures';

const CODE = 'BEAR-IFRAME1';

const frameReady = (p: Awaited<ReturnType<typeof videoFrame>>) =>
  p.waitForFunction(() => (window as { __wbVideoReady?: boolean }).__wbVideoReady === true);

test('play/pause syncs when the video is in a cross-origin iframe', async () => {
  let a: User | undefined;
  let b: User | undefined;
  try {
    a = await launchUser({ url: HOST_IFRAME_URL });
    b = await launchUser({ url: HOST_IFRAME_URL });

    await a.openSidePanel();
    await b.openSidePanel();

    const af = await videoFrame(a.video);
    const bf = await videoFrame(b.video);
    await frameReady(af);
    await frameReady(bf);

    await a.joinRoom(CODE);
    await b.joinRoom(CODE);

    // let both top frames connect, video:subscribe, and bind their iframe video
    await a.video.waitForTimeout(2500);

    // A plays inside its iframe -> B's iframe video follows via the bridge
    await setVideo(af, 'play', 5);
    await expect.poll(() => videoPaused(bf), { timeout: 8000 }).toBe(false);

    await setVideo(af, 'pause');
    await expect.poll(() => videoPaused(bf), { timeout: 8000 }).toBe(true);
  } finally {
    await a?.close();
    await b?.close();
  }
});

test('a user off the den page is flagged at the top level', async () => {
  let a: User | undefined;
  let b: User | undefined;
  try {
    a = await launchUser({ url: HOST_IFRAME_URL });
    b = await launchUser(); // plain top-frame video page == different content key

    const af = await videoFrame(a.video);
    await frameReady(af);
    await b.video.waitForFunction(() => (window as { __wbVideoReady?: boolean }).__wbVideoReady === true);

    // A subscribes first, so the iframe host page becomes the den's canonical content
    await a.joinRoom(CODE);
    await a.video.waitForTimeout(1500);
    await b.joinRoom(CODE);

    // B is on a different page -> the diverged callout shows in B's top frame
    await expect(b.video.locator('#wb-diverged')).toBeVisible({ timeout: 8000 });

    // A playing must not move B, since they are not on the same video
    await setVideo(b.video, 'pause');
    await setVideo(af, 'play', 5);
    await b.video.waitForTimeout(3000);
    expect(await videoPaused(b.video)).toBe(true);
  } finally {
    await a?.close();
    await b?.close();
  }
});
