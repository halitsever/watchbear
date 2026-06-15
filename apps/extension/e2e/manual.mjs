import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(dir, '../dist');
const VIDEO_URL = 'http://127.0.0.1:5190/video.html';
const SERVER_URL = 'https://localhost:3000';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // self-signed dev cert, so probes don't reject it

const children = [];
function run(cmd, args, env, detached = false) {
  const proc = spawn(cmd, args, { stdio: 'inherit', detached, env: { ...process.env, ...env } });
  children.push({ proc, detached });
  return proc;
}

async function serverUp() {
  try {
    return (await fetch(SERVER_URL)).ok;
  } catch {
    return false;
  }
}

async function waitForServer(tries) {
  for (let i = 0; i < tries; i++) {
    if (await serverUp()) return true;
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

// our static video page
run('node', [path.join(dir, 'serve.mjs')]);

// the watchbear server: reuse one already on :3000, otherwise start dev:server
if (await serverUp()) {
  console.log(`reusing the server already running on ${SERVER_URL}`);
} else {
  console.log('starting dev:server (https://localhost:3000)...');
  run('pnpm', ['--filter', '@watchbear/server', 'start:dev'], { CORS_ORIGINS: 'http://127.0.0.1:5190,http://localhost:5190' }, true);
  if (!(await waitForServer(45))) {
    console.log(`\n  ⚠  couldn't reach ${SERVER_URL}. Did you run "pnpm cert"? Launching anyway.\n`);
  }
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
  for (const { proc, detached } of children) {
    try {
      if (detached && proc.pid) process.kill(-proc.pid);
      else proc.kill();
    } catch {
      // already gone
    }
  }
  process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
