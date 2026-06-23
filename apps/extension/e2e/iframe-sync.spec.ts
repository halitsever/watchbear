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

    // A plays inside its iframe and B's iframe video follows via the bridge
    await setVideo(af, 'play', 5);
    await expect.poll(() => videoPaused(bf), { timeout: 8000 }).toBe(false);

    await setVideo(af, 'pause');
    await expect.poll(() => videoPaused(bf), { timeout: 8000 }).toBe(true);
  } finally {
    await a?.close();
    await b?.close();
  }
});

// no content matching: A in an iframe still drives B's plain top-frame video
test('a user off the den page still syncs with no callout', async () => {
  let a: User | undefined;
  let b: User | undefined;
  try {
    a = await launchUser({ url: HOST_IFRAME_URL });
    b = await launchUser(); // plain top-frame video page, different url

    const af = await videoFrame(a.video);
    await frameReady(af);
    await b.video.waitForFunction(() => (window as { __wbVideoReady?: boolean }).__wbVideoReady === true);

    await a.joinRoom(CODE);
    await a.video.waitForTimeout(1500);
    await b.joinRoom(CODE);
    await b.video.waitForTimeout(2000);

    // no diverged callout exists anymore
    await expect(b.video.locator('#wb-diverged')).toHaveCount(0);

    // A playing inside its iframe still moves B's top-frame video
    await setVideo(b.video, 'pause');
    await setVideo(af, 'play', 5);
    await expect.poll(() => videoPaused(b!.video), { timeout: 8000 }).toBe(false);
  } finally {
    await a?.close();
    await b?.close();
  }
});
