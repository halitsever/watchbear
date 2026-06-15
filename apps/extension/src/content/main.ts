import type { TabMessage } from '@/lib/messages';
import { joinVideoChannel, type VideoChannel, type VideoContentInfo, type VideoControl } from '@/lib/socket';
import { STORAGE_KEYS } from '@/lib/room';
import { getServerUrl } from '@/lib/server';
import { contentKey } from '@/lib/content';

declare global {
  interface Window {
    __wbLoaded?: boolean;
  }
}

if (!window.__wbLoaded) {
  window.__wbLoaded = true;

  let channel: VideoChannel | null = null;
  let video: HTMLVideoElement | null = null;
  let applyingRemote = false;
  let applyTimer: number | undefined;
  let bindTries = 0;
  let pending: VideoControl | null = null;

  let isAnchor = false;
  let canonical: VideoContentInfo | null = null;
  let diverged = false;
  let navWatching = false;
  let navTimer: number | undefined;
  let lastHref = location.href;

  chrome.runtime.onMessage.addListener((msg: TabMessage, sender) => {
    if (sender.id !== chrome.runtime.id) return;
    if (msg.type === 'START_ROOM' || msg.type === 'JOIN_ROOM') {
      void startSync(msg.code, msg.anchor);
    }
    if (msg.type === 'LEAVE_ROOM') {
      stopSync();
    }
  });

  function armFromStorage() {
    chrome.storage.local.get([STORAGE_KEYS.inRoom, STORAGE_KEYS.roomCode], (d) => {
      const code = d[STORAGE_KEYS.roomCode];
      if (d[STORAGE_KEYS.inRoom] && typeof code === 'string') {
        void startSync(code, false);
      } else {
        stopSync();
      }
    });
  }

  armFromStorage();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (STORAGE_KEYS.inRoom in changes || STORAGE_KEYS.roomCode in changes)) {
      armFromStorage();
    }
  });

  function currentContent(): VideoContentInfo {
    return { key: contentKey(location.href), url: location.href, title: document.title || location.hostname };
  }

  function pickVideo(): HTMLVideoElement | null {
    const vids = [...document.querySelectorAll('video')];
    if (vids.length === 0) return null;
    return vids.map((v) => ({ v, area: v.clientWidth * v.clientHeight })).sort((a, b) => b.area - a.area)[0].v;
  }

  async function startSync(code: string, anchor: boolean) {
    if (anchor) isAnchor = true; // the explicit message wins over the storage-arm path
    if (!channel) {
      const url = await getServerUrl();
      if (!channel) {
        channel = joinVideoChannel(url, code, {
          anchor: isAnchor,
          content: currentContent(),
          onControl: applyControl,
          onContent: onCanonical,
        });
      }
    } else if (anchor) {
      channel.claimAnchor(currentContent());
    }
    bindTries = 0;
    attachVideo();
    startNavWatch();
    refreshTags();
  }

  function stopSync() {
    channel?.disconnect();
    channel = null;
    detachVideo();
    canonical = null;
    diverged = false;
    isAnchor = false;
    stopNavWatch();
    removeLiveTag();
    hideDivergedCallout();
  }

  function attachVideo() {
    if (video) return;
    const v = pickVideo();
    if (!v) {
      if (bindTries++ < 20) window.setTimeout(attachVideo, 500);
      return;
    }
    video = v;
    v.addEventListener('play', onLocal);
    v.addEventListener('pause', onLocal);
    v.addEventListener('seeked', onLocal);

    if (pending) {
      const p = pending;
      pending = null;
      applyControl(p);
    }
  }

  function detachVideo() {
    video?.removeEventListener('play', onLocal);
    video?.removeEventListener('pause', onLocal);
    video?.removeEventListener('seeked', onLocal);
    video = null;
  }

  function onLocal() {
    if (applyingRemote || diverged || !channel || !video) return;
    channel.send({ time: video.currentTime, paused: video.paused });
  }

  function applyControl(c: VideoControl) {
    if (diverged) return;
    if (!video) {
      pending = c;
      return;
    }
    applyingRemote = true;
    window.clearTimeout(applyTimer);
    if (Math.abs(video.currentTime - c.time) > 0.5) video.currentTime = c.time;
    if (c.paused && !video.paused) video.pause();
    else if (!c.paused && video.paused) void video.play();

    applyTimer = window.setTimeout(() => {
      applyingRemote = false;
    }, 400);
  }

  function onCanonical(c: VideoContentInfo) {
    canonical = c;
    refreshTags();
  }

  // recompute whether we're on the den's video and show the right overlay
  function refreshTags() {
    diverged = !!canonical && canonical.key !== contentKey(location.href);
    if (diverged && canonical) {
      removeLiveTag();
      showDivergedCallout(canonical);
    } else {
      hideDivergedCallout();
      showLiveTag();
    }
  }

  function startNavWatch() {
    if (navWatching) return;
    navWatching = true;
    lastHref = location.href;
    window.addEventListener('popstate', onUrlMaybeChanged);
    navTimer = window.setInterval(onUrlMaybeChanged, 1000);
  }

  function stopNavWatch() {
    if (!navWatching) return;
    navWatching = false;
    window.removeEventListener('popstate', onUrlMaybeChanged);
    window.clearInterval(navTimer);
  }

  // catches SPA navigations (e.g. youtube) where the page swaps the video in place
  function onUrlMaybeChanged() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    detachVideo();
    bindTries = 0;
    attachVideo();
    channel?.setContent(currentContent());
    refreshTags();
  }

  function showLiveTag(): void {
    if (document.getElementById('wb-live-tag')) return;
    const v = document.querySelector('video');
    if (!v) return;
    const container = (v.closest('[class]') as HTMLElement | null) ?? v.parentElement;
    if (!container) return;

    const pos = container.style.position;
    if (!pos || pos === 'static') container.style.position = 'relative';

    const tag = document.createElement('div');
    tag.id = 'wb-live-tag';
    tag.className = 'wb-live-tag';
    const dot = document.createElement('span');
    dot.className = 'wb-live-dot';
    tag.append(dot, ' watching together');
    container.appendChild(tag);
  }

  function removeLiveTag(): void {
    document.getElementById('wb-live-tag')?.remove();
  }

  function showDivergedCallout(c: VideoContentInfo): void {
    let box = document.getElementById('wb-diverged');
    if (!box) {
      box = document.createElement('div');
      box.id = 'wb-diverged';
      box.className = 'wb-diverged';
      document.documentElement.appendChild(box);
    }
    box.replaceChildren();

    const text = document.createElement('div');
    text.className = 'wb-diverged-text';
    const small = document.createElement('div');
    small.className = 'wb-diverged-small';
    small.textContent = "You're watching something else";
    const title = document.createElement('div');
    title.className = 'wb-diverged-title';
    title.textContent = `The den is watching: ${c.title || c.url}`;
    text.append(small, title);

    const btn = document.createElement('button');
    btn.className = 'wb-diverged-btn';
    btn.textContent = 'Open it';
    btn.addEventListener('click', () => {
      location.href = c.url;
    });

    box.append(text, btn);
  }

  function hideDivergedCallout(): void {
    document.getElementById('wb-diverged')?.remove();
  }
}

export {};
