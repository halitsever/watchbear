import { defineConfig } from '@playwright/test';

// the content-script sync socket leaves with the page's origin, so we force the
// server onto its own port (no clash with your dev server on 3000), make it serve
// plain http (no cert needed), and allow the test page origin through CORS.
const SERVER_ENV = 'PORT=3100 SSL_KEY=__none__ SSL_CERT=__none__ CORS_ORIGINS=http://127.0.0.1:5190,http://localhost:5190';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  reporter: [['list']],
  webServer: [
    {
      command: 'node e2e/serve.mjs',
      url: 'http://127.0.0.1:5190/video.html',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `${SERVER_ENV} pnpm --filter @watchbear/server start`,
      url: 'http://localhost:3100',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
