import { chromium, type BrowserContext, type Frame, type Page, type Worker } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(dir, '../dist');

export const VIDEO_URL = 'http://127.0.0.1:5190/video.html';
// host page on one origin embedding the player on another == cross-origin iframe
export const HOST_IFRAME_URL = 'http://127.0.0.1:5190/host-iframe.html';

export interface User {
  context: BrowserContext;
  extensionId: string;
  worker: Worker;
  video: Page;
  joinRoom: (code: string) => Promise<void>;
  openSidePanel: () => Promise<Page>;
  openPopup: () => Promise<Page>;
  close: () => Promise<void>;
}

// one persistent context == one isolated browser profile == one "bear".
// launching it twice gives us two independent users sharing a room code.
export async function launchUser(opts: { url?: string } = {}): Promise<User> {
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
  await video.goto(opts.url ?? VIDEO_URL);
  // for iframe pages the <video> lives in a child frame, so wait on the frame
  if (opts.url === HOST_IFRAME_URL) await (await videoFrame(video)).waitForSelector('video');
  else await video.waitForSelector('video');

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

  // the toolbar popup is a normal extension page, so we can just open it in a tab
  const openPopup = async () => {
    const url = await worker.evaluate(() =>
      chrome.runtime.getURL(chrome.runtime.getManifest().action!.default_popup),
    );
    const p = await context.newPage();
    await p.goto(url);
    return p;
  };

  return { context, extensionId, worker, video, joinRoom, openSidePanel, openPopup, close: () => context.close() };
}

// the player frame embedded in HOST_IFRAME_URL
export async function videoFrame(p: Page): Promise<Frame> {
  const handle = await p.waitForSelector('iframe');
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('iframe content frame not available');
  return frame;
}

export const videoPaused = (p: Page | Frame) =>
  p.evaluate(() => document.querySelector('video')!.paused);

export const setVideo = (p: Page | Frame, action: 'play' | 'pause', time?: number) =>
  p.evaluate(
    ({ action, time }) => {
      const v = document.querySelector('video')!;
      if (time != null) v.currentTime = time;
      return action === 'play' ? v.play() : v.pause();
    },
    { action, time },
  );
