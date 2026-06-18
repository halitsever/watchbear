import { defineManifest } from '@crxjs/vite-plugin';

const icons = {
  16: 'icons/icon16.png',
  32: 'icons/icon32.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png',
};

export default defineManifest({
  manifest_version: 3,
  name: 'Watchbear',
  short_name: 'Watchbear',
  description: 'The sweet way to watch together',
  version: '0.1.3',
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
  permissions: ['storage', 'activeTab', 'scripting', 'sidePanel'],
  host_permissions: ['<all_urls>'],
});
