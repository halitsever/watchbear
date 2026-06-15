import { chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(dir, '../dist');

export const VIDEO_URL = 'http://127.0.0.1:5190/video.html';

export interface User {
  context: BrowserContext;
  extensionId: string;
  worker: Worker;
  video: Page;
  joinRoom: (code: string) => Promise<void>;
  openSidePanel: () => Promise<Page>;
  close: () => Promise<void>;
}

// one persistent context == one isolated browser profile == one "bear".
// launching it twice gives us two independent users sharing a room code.
export async function launchUser(): Promise<User> {
  const context = await chromium.launchPersistentContext('', {
    headless: process.env.PW_HEADLESS === '1',
    ignoreHTTPSErrors: true,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
    ],
  });

  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  const extensionId = worker.url().split('/')[2];

  const video = await context.newPage();
  await video.goto(VIDEO_URL);
  await video.waitForSelector('video');

  // skip the popup UI and drop the room straight into storage; the content
  // script's storage.onChanged listener then arms the video sync.
  const joinRoom = (code: string) =>
    worker.evaluate((c) => chrome.storage.local.set({ wb_inRoom: true, wb_roomCode: c }), code);

  const openSidePanel = async () => {
    const url = await worker.evaluate(() =>
      chrome.runtime.getURL(chrome.runtime.getManifest().side_panel!.default_path),
    );
    const p = await context.newPage();
    await p.goto(url);
    return p;
  };

  return { context, extensionId, worker, video, joinRoom, openSidePanel, close: () => context.close() };
}

export const videoPaused = (p: Page) =>
  p.evaluate(() => document.querySelector('video')!.paused);

export const setVideo = (p: Page, action: 'play' | 'pause', time?: number) =>
  p.evaluate(
    ({ action, time }) => {
      const v = document.querySelector('video')!;
      if (time != null) v.currentTime = time;
      return action === 'play' ? v.play() : v.pause();
    },
    { action, time },
  );
