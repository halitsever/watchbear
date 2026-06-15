import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(dir, '../dist');
const VIDEO_URL = 'http://127.0.0.1:5190/video.html';
const SERVER_URL = 'https://localhost:3000';

// only the static video page is ours to run; the watchbear server is your own
// `pnpm dev:server` on :3000 (https, self-signed), so the browsers ignore cert errors.
const children = [];
const serve = spawn('node', [path.join(dir, 'serve.mjs')], { stdio: 'inherit', env: process.env });
children.push(serve);

async function devServerUp() {
  // self-signed cert, so don't reject it during the probe
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(SERVER_URL);
      if (r.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function launch(x) {
  const ctx = await chromium.launchPersistentContext('', {
    headless: false,
    ignoreHTTPSErrors: true,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--ignore-certificate-errors',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
      `--window-position=${x},0`,
      '--window-size=760,820',
    ],
  });
  const page = await ctx.newPage();
  await page.goto(VIDEO_URL);
  return ctx;
}

if (!(await devServerUp())) {
  console.log(`\n  ⚠  ${SERVER_URL} is not responding. Start it first:  pnpm dev:server`);
  console.log('     (launching anyway; the extension will connect once it is up)\n');
}

console.log('launching two browsers...');
const contexts = [await launch(0), await launch(780)];

console.log(`
  Ready. Two browsers are open on the test video page, talking to ${SERVER_URL}.
    1. Browser A: click the Watchbear toolbar icon -> "Start a party", copy the code.
    2. Browser B: click the icon -> paste the code -> Join.
    3. Play/pause in either window and watch the other follow.
  Ctrl+C here closes everything.
`);

// keep the process (and the browsers) alive until Ctrl+C, even if a window is closed
const keepAlive = setInterval(() => {}, 1 << 30);

function cleanup() {
  clearInterval(keepAlive);
  for (const c of contexts) c.close().catch(() => {});
  for (const c of children) c.kill();
  process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
