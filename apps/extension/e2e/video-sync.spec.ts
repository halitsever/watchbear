import { test, expect } from '@playwright/test';
import { launchUser, videoPaused, setVideo, type User } from './fixtures';

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
