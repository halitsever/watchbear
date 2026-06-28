import { defineManifest } from '@crxjs/vite-plugin';

const icons = {
  16: 'icons/icon16.png',
  32: 'icons/icon32.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png',
};

// store public key, pins the extension id (ldegfikaldilbcpgmiopdnnhpkpcnepn) so
// dev matches production and the OAuth redirect URL stays constant. public, safe
// to commit. override with WB_EXTENSION_KEY if ever needed.
const extensionKey =
  process.env.WB_EXTENSION_KEY ??
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzBA76TLJP9mQj/JKd5hpTNpxARFkF+2Nc+urQhJmxuIZ8E4THB0uQScR9kokhMgGInj7/kYnbzR27hnXA0YMKMlvGSGVmtb67RPmP9mrJEVeJCPsO5PsHVGRERYjzyChjFPevxbjDnNivhxPfUYl/TymL0eiNXhVS3XaIyLK+VKRwxzHGjNOxkpqbsGw6cCk20owLwGPhf3YmiQ7ysp6KgG+dwQ3xZiekMRyh7Zrrmj4NzB29ckJdqvXapfldnAYeoXn6uxzThRHmUR/spUZbumBYlO60kO6g5vgonl1MG4L4pFfyPNjEYwG/KfkjHbhHLQLMwZ2oDS+ugHMlU++VQIDAQAB';

export default defineManifest({
  manifest_version: 3,
  ...(extensionKey ? { key: extensionKey } : {}),
  name: 'Watchbear: Watch Together & Watch Party Sync',
  short_name: 'Watchbear',
  description: 'The sweet way to watch together',
  version: '0.3.1',
  icons,
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Watchbear',
    default_icon: icons,
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/main.ts'],
      css: ['src/content/content.css'],
      run_at: 'document_idle',
      // the real <video> often lives in a cross-origin iframe (embedded players),
      // so we run in every frame; about:blank covers players that mount into a
      // srcdoc/blank frame.
      all_frames: true,
      match_about_blank: true,
    },
    {
      // netflix crashes when we write video.currentTime, so on netflix we route
      // only the seek through its player api, which lives on the page window. this
      // entry runs in the MAIN world; main.ts (isolated) bridges the seek over
      // postMessage.
      matches: ['*://*.netflix.com/*'],
      js: ['src/content/netflix-main.ts'],
      run_at: 'document_idle',
      world: 'MAIN',
    },
  ],
  permissions: ['storage', 'activeTab', 'scripting', 'sidePanel', 'identity'],
  host_permissions: ['<all_urls>'],
});
