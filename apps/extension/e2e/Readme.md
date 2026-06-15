# E2E tests

Two isolated Chrome profiles (two "bears") load the built extension, join the same
room through a real server instance, and assert that play/pause stays in sync.

## Run

```bash
pnpm --filter @watchbear/extension test:e2e
```

That command:

1. builds the extension in test mode (`vite build --mode test`, so it points at
   `http://localhost:3100` via `.env.test`),
2. starts a static server for the local test video page (`e2e/serve.mjs`),
3. starts a fresh Watchbear server on port 3100 (plain http, no cert, test page
   origin allow-listed via `CORS_ORIGINS`),
4. launches two persistent Chromium contexts with the extension loaded and runs the spec.

## Manual mode

To drive it by hand instead of asserting (run `pnpm cert` once first):

```bash
pnpm --filter @watchbear/extension e2e:manual
```

This one command does everything: builds the extension in development mode
(-> `https://localhost:3000`), serves the local test video page, **starts the
dev server** on :3000 if one isn't already running (reuses it if it is), and opens
two browsers (with `--ignore-certificate-errors` for the self-signed cert) that stay
open. Click the Watchbear toolbar icon in browser A -> "Start a party", copy the code,
paste it into browser B's Join field, then play/pause in either window. Ctrl+C closes
everything (including the server it started).

> Don't run the full `pnpm dev` / `npm run dev` alongside this. That also starts the
> extension's vite HMR dev server, which keeps rewriting `dist` and fights with the
> static build the two browsers load, so the loaded extension breaks. `e2e:manual`
> already starts the server it needs.

## Notes

- Runs **headed** by default; you see both browsers.
- The test video is a remote WebM (plays in Playwright's Chromium, which ships no
  h264). If the network is blocked it falls back to a synthetic canvas stream, so the
  suite still passes offline.
- The room is set by writing `wb_inRoom`/`wb_roomCode` straight into extension storage
  from the service worker, which is what the content script listens on. This skips the
  popup UI on purpose so the test targets the sync path, not the form.
