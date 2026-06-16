import type { TabMessage } from '@/lib/messages';
import { joinVideoChannel, type VideoChannel, type VideoContentInfo, type VideoControl } from '@/lib/socket';
import { STORAGE_KEYS } from '@/lib/room';
import { getServerUrl } from '@/lib/server';
import { contentKey } from '@/lib/content';
import { getIdentity } from '@/lib/identity';

declare global {
  interface Window {
    __wbLoaded?: boolean;
  }
}

// embedded players put the <video> in a cross-origin iframe, so the script runs
// in every frame. the top frame owns the socket and the room/overlay state; a
// child frame just bridges its video to the top over postMessage.
const MIN_AREA = 120 * 90; // ignore tracking pixels / ad clips
const SEEK_THRESHOLD = 0.5; // seconds of drift we tolerate before scrubbing
const REMOTE_GUARD_MS = 400; // suppress echo right after applying a remote change

type WbBridgeMsg =
  | { __wb: 1; kind: 'announce'; area: number; duration: number }
  | { __wb: 1; kind: 'state'; time: number; paused: boolean }
  | { __wb: 1; kind: 'gone' }
  | { __wb: 1; kind: 'apply'; time: number; paused: boolean };

function pickVideo(): HTMLVideoElement | null {
  const vids = [...document.querySelectorAll('video')];
  if (vids.length === 0) return null;
  return vids.map((v) => ({ v, area: v.clientWidth * v.clientHeight })).sort((a, b) => b.area - a.area)[0].v;
}

function applyTo(v: HTMLVideoElement, c: VideoControl): void {
  if (Math.abs(v.currentTime - c.time) > SEEK_THRESHOLD) v.currentTime = c.time;
  if (c.paused && !v.paused) v.pause();
  else if (!c.paused && v.paused) void v.play();
}

// abstracts away whether the synced video sits in this frame or a child iframe
interface VideoTarget {
  getState(): VideoControl | null;
  apply(c: VideoControl): void;
  onLocalChange(cb: () => void): void;
  area(): number;
  teardown(): void;
}

class LocalVideoTarget implements VideoTarget {
  private applyingRemote = false;
  private timer?: number;
  private cb: (() => void) | null = null;

  constructor(readonly video: HTMLVideoElement) {
    video.addEventListener('play', this.onEv);
    video.addEventListener('pause', this.onEv);
    video.addEventListener('seeked', this.onEv);
  }

  private onEv = () => {
    if (!this.applyingRemote) this.cb?.();
  };

  getState(): VideoControl {
    return { time: this.video.currentTime, paused: this.video.paused };
  }

  apply(c: VideoControl): void {
    this.applyingRemote = true;
    window.clearTimeout(this.timer);
    applyTo(this.video, c);
    this.timer = window.setTimeout(() => {
      this.applyingRemote = false;
    }, REMOTE_GUARD_MS);
  }

  onLocalChange(cb: () => void): void {
    this.cb = cb;
  }

  area(): number {
    return this.video.clientWidth * this.video.clientHeight;
  }

  teardown(): void {
    this.video.removeEventListener('play', this.onEv);
    this.video.removeEventListener('pause', this.onEv);
    this.video.removeEventListener('seeked', this.onEv);
  }
}

class RemoteVideoTarget implements VideoTarget {
  private last: VideoControl | null = null;
  private cb: (() => void) | null = null;

  constructor(
    readonly win: Window,
    private _area: number,
  ) {}

  pushState(c: VideoControl): void {
    this.last = c;
    this.cb?.();
  }

  setArea(a: number): void {
    this._area = a;
  }

  getState(): VideoControl | null {
    return this.last;
  }

  apply(c: VideoControl): void {
    this.post({ __wb: 1, kind: 'apply', time: c.time, paused: c.paused });
  }

  onLocalChange(cb: () => void): void {
    this.cb = cb;
  }

  area(): number {
    return this._area;
  }

  teardown(): void {}

  private post(m: WbBridgeMsg): void {
    try {
      this.win.postMessage(m, '*');
    } catch {
      // child frame may have unloaded
    }
  }
}

if (!window.__wbLoaded) {
  window.__wbLoaded = true;
  if (window.top === window) runTop();
  else runBridge();
}

// top frame: owns the socket, content identity (this page's url), the diverged
// callout, and selecting which video (local or in a child frame) to drive.
function runTop(): void {
  let channel: VideoChannel | null = null;
  let target: VideoTarget | null = null;
  let pending: VideoControl | null = null;
  let targetTimer: number | undefined;

  let isAnchor = false;
  let canonical: VideoContentInfo | null = null;
  let diverged = false;
  let navWatching = false;
  let navTimer: number | undefined;
  let lastHref = location.href;

  // child frames that have announced a video, keyed by their window
  const announced = new Map<Window, { area: number }>();

  chrome.runtime.onMessage.addListener((msg: TabMessage, sender) => {
    if (sender.id !== chrome.runtime.id) return;
    if (msg.type === 'START_ROOM' || msg.type === 'JOIN_ROOM') {
      void startSync(msg.code, msg.anchor);
    }
    if (msg.type === 'LEAVE_ROOM') {
      stopSync();
    }
  });

  window.addEventListener('message', (e) => {
    const d = e.data as WbBridgeMsg | undefined;
    if (!d || d.__wb !== 1) return;
    const src = e.source as Window | null;
    if (!src) return;
    if (d.kind === 'announce') {
      announced.set(src, { area: d.area });
      syncTarget();
    } else if (d.kind === 'state') {
      if (target instanceof RemoteVideoTarget && target.win === src) target.pushState({ time: d.time, paused: d.paused });
    } else if (d.kind === 'gone') {
      announced.delete(src);
      if (target instanceof RemoteVideoTarget && target.win === src) {
        target.teardown();
        target = null;
      }
      syncTarget();
    }
  });

  armFromStorage();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (STORAGE_KEYS.inRoom in changes || STORAGE_KEYS.roomCode in changes)) {
      armFromStorage();
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

  function currentContent(): VideoContentInfo {
    return { key: contentKey(location.href), url: location.href, title: document.title || location.hostname };
  }

  async function startSync(code: string, anchor: boolean) {
    if (anchor) isAnchor = true; // the explicit message wins over the storage-arm path
    if (!channel) {
      const url = await getServerUrl();
      const { name } = await getIdentity();
      if (!channel) {
        channel = joinVideoChannel(url, code, {
          anchor: isAnchor,
          content: currentContent(),
          name,
          onControl: applyControl,
          onContent: onCanonical,
        });
      }
    } else if (anchor) {
      channel.claimAnchor(currentContent());
    }
    syncTarget();
    startTargetWatch();
    startNavWatch();
    refreshTags();
  }

  function stopSync() {
    channel?.disconnect();
    channel = null;
    target?.teardown();
    target = null;
    pending = null;
    announced.clear();
    canonical = null;
    diverged = false;
    isAnchor = false;
    stopTargetWatch();
    stopNavWatch();
    hideDivergedCallout();
  }

  // pick the largest video across this frame and announcing children, preferring
  // anything that clears the min-area floor so ad/background clips don't win.
  function syncTarget() {
    const local = pickVideo();
    const localArea = local ? local.clientWidth * local.clientHeight : 0;

    let bestWin: Window | null = null;
    let bestArea = 0;
    for (const [win, info] of announced) {
      if (info.area >= MIN_AREA && info.area > bestArea) {
        bestWin = win;
        bestArea = info.area;
      }
    }

    let useLocal = false;
    if (local && localArea >= MIN_AREA && localArea >= bestArea) useLocal = true;
    else if (!bestWin && local) useLocal = true; // nothing qualified, fall back to a small local video

    if (useLocal && local) {
      if (target instanceof LocalVideoTarget && target.video === local) return;
      setTarget(new LocalVideoTarget(local));
    } else if (bestWin) {
      if (target instanceof RemoteVideoTarget && target.win === bestWin) {
        target.setArea(bestArea);
        return;
      }
      setTarget(new RemoteVideoTarget(bestWin, bestArea));
    }
  }

  function setTarget(next: VideoTarget) {
    target?.teardown();
    target = next;
    target.onLocalChange(onLocal);
    if (pending) {
      const p = pending;
      pending = null;
      target.apply(p);
    }
    refreshTags();
  }

  function startTargetWatch() {
    if (targetTimer) return;
    // a top-frame player can load late; child players announce on their own.
    targetTimer = window.setInterval(syncTarget, 1000);
  }

  function stopTargetWatch() {
    window.clearInterval(targetTimer);
    targetTimer = undefined;
  }

  function onLocal() {
    if (diverged || !channel || !target) return;
    const s = target.getState();
    if (s) channel.send(s);
  }

  function applyControl(c: VideoControl) {
    if (diverged) return;
    if (!target) {
      pending = c;
      return;
    }
    target.apply(c);
  }

  function onCanonical(c: VideoContentInfo) {
    canonical = c;
    refreshTags();
  }

  // recompute whether we're on the den's video and show the right overlay
  function refreshTags() {
    diverged = !!canonical && canonical.key !== contentKey(location.href);
    if (diverged && canonical) {
      showDivergedCallout(canonical);
    } else {
      hideDivergedCallout();
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
    target?.teardown();
    target = null;
    announced.clear();
    syncTarget();
    channel?.setContent(currentContent());
    refreshTags();
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
      // always move the top page, never an embedded player frame
      if (window.top) window.top.location.href = c.url;
    });

    box.append(text, btn);
  }

  function hideDivergedCallout(): void {
    document.getElementById('wb-diverged')?.remove();
  }
}

// child frame: no socket, no room state. finds its <video> and relays it to the
// top frame, applying remote control and showing the live tag on request.
function runBridge(): void {
  let v: HTMLVideoElement | null = null;
  let armed = false;
  let applyingRemote = false;
  let applyTimer: number | undefined;
  let loopTimer: number | undefined;
  let announcedArea = 0;

  function post(m: WbBridgeMsg): void {
    try {
      window.top?.postMessage(m, '*');
    } catch {
      // top may be unreachable
    }
  }

  function announce(): void {
    if (!v) return;
    announcedArea = v.clientWidth * v.clientHeight;
    post({ __wb: 1, kind: 'announce', area: announcedArea, duration: Number.isFinite(v.duration) ? v.duration : 0 });
  }

  const onEv = () => {
    if (applyingRemote || !v) return;
    post({ __wb: 1, kind: 'state', time: v.currentTime, paused: v.paused });
  };

  function attach(): void {
    const found = pickVideo();
    if (!found || found.clientWidth * found.clientHeight < MIN_AREA) return;
    v = found;
    v.addEventListener('play', onEv);
    v.addEventListener('pause', onEv);
    v.addEventListener('seeked', onEv);
    announce();
  }

  function detach(notify: boolean): void {
    if (v) {
      v.removeEventListener('play', onEv);
      v.removeEventListener('pause', onEv);
      v.removeEventListener('seeked', onEv);
      if (notify) post({ __wb: 1, kind: 'gone' });
    }
    v = null;
    announcedArea = 0;
  }

  function tick(): void {
    if (!armed) return;
    if (!v) {
      attach();
      return;
    }
    if (!document.contains(v)) {
      detach(true);
      return;
    }
    const area = v.clientWidth * v.clientHeight;
    if (Math.abs(area - announcedArea) > 1000) announce();
  }

  function applyFromTop(c: VideoControl): void {
    if (!v) return;
    applyingRemote = true;
    window.clearTimeout(applyTimer);
    applyTo(v, c);
    applyTimer = window.setTimeout(() => {
      applyingRemote = false;
    }, REMOTE_GUARD_MS);
  }

  window.addEventListener('message', (e) => {
    const d = e.data as WbBridgeMsg | undefined;
    if (!d || d.__wb !== 1) return;
    if (e.source !== window.top) return; // only honor commands from our top frame
    if (d.kind === 'apply') applyFromTop({ time: d.time, paused: d.paused });
  });

  function arm(): void {
    if (armed) return;
    armed = true;
    attach();
    if (!loopTimer) loopTimer = window.setInterval(tick, 1000);
  }

  function disarm(): void {
    armed = false;
    detach(true);
    window.clearInterval(loopTimer);
    loopTimer = undefined;
  }

  function armFromStorage(): void {
    chrome.storage.local.get([STORAGE_KEYS.inRoom, STORAGE_KEYS.roomCode], (d) => {
      if (d[STORAGE_KEYS.inRoom] && typeof d[STORAGE_KEYS.roomCode] === 'string') arm();
      else disarm();
    });
  }

  chrome.runtime.onMessage.addListener((msg: TabMessage, sender) => {
    if (sender.id !== chrome.runtime.id) return;
    if (msg.type === 'START_ROOM' || msg.type === 'JOIN_ROOM') arm();
    if (msg.type === 'LEAVE_ROOM') disarm();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (STORAGE_KEYS.inRoom in changes || STORAGE_KEYS.roomCode in changes)) {
      armFromStorage();
    }
  });
  armFromStorage();
}

export {};
