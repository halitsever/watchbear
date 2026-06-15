import type { TabMessage } from '@/lib/messages';
import { joinVideoChannel, type VideoChannel, type VideoControl } from '@/lib/socket';
import { STORAGE_KEYS } from '@/lib/room';

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

  chrome.runtime.onMessage.addListener((msg: TabMessage, sender) => {
    if (sender.id !== chrome.runtime.id) return;
    if (msg.type === 'START_ROOM' || msg.type === 'JOIN_ROOM') {
      showLiveTag();
      startSync(msg.code);
    }
    if (msg.type === 'LEAVE_ROOM') {
      removeLiveTag();
      stopSync();
    }
  });

  function armFromStorage() {
    chrome.storage.local.get([STORAGE_KEYS.inRoom, STORAGE_KEYS.roomCode], (d) => {
      const code = d[STORAGE_KEYS.roomCode];
      if (d[STORAGE_KEYS.inRoom] && typeof code === 'string') {
        showLiveTag();
        startSync(code);
      } else {
        removeLiveTag();
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

  function pickVideo(): HTMLVideoElement | null {
    const vids = [...document.querySelectorAll('video')];
    if (vids.length === 0) return null;
    return vids.map((v) => ({ v, area: v.clientWidth * v.clientHeight })).sort((a, b) => b.area - a.area)[0].v;
  }

  function startSync(code: string) {
    if (!channel) channel = joinVideoChannel(code, applyControl);
    bindTries = 0;
    attachVideo();
  }

  function stopSync() {
    channel?.disconnect();
    channel = null;
    detachVideo();
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
    if (applyingRemote || !channel || !video) return;
    channel.send({ time: video.currentTime, paused: video.paused });
  }

  function applyControl(c: VideoControl) {
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
}

export { };
