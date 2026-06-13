import type { TabMessage } from '@/lib/messages';

declare global {
  interface Window {
    __wbLoaded?: boolean;
  }
}

if (!window.__wbLoaded) {
  window.__wbLoaded = true;

  chrome.runtime.onMessage.addListener((msg: TabMessage) => {
    if (msg.type === 'START_ROOM' || msg.type === 'JOIN_ROOM') showLiveTag();
    if (msg.type === 'LEAVE_ROOM') removeLiveTag();
  });

  function showLiveTag(): void {
    if (document.getElementById('wb-live-tag')) return;
    const video = document.querySelector('video');
    if (!video) return;
    const container = (video.closest('[class]') as HTMLElement | null) ?? video.parentElement;
    if (!container) return;

    const pos = container.style.position;
    if (!pos || pos === 'static') container.style.position = 'relative';

    const tag = document.createElement('div');
    tag.id = 'wb-live-tag';
    tag.className = 'wb-live-tag';
    tag.innerHTML = '<span class="wb-live-dot"></span> watching together';
    container.appendChild(tag);
  }

  function removeLiveTag(): void {
    document.getElementById('wb-live-tag')?.remove();
  }
}

export {};
