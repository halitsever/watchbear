import type { TabMessage } from '@/lib/messages';
import { joinVideoChannel, type VideoChannel, type VideoContentInfo, type VideoControl } from '@/lib/socket';
import { STORAGE_KEYS, parseInviteCode, parseInviteUrl, INVITE_BASE_URL } from '@/lib/room';
import { getServerUrl } from '@/lib/server';
import { contentKey } from '@/lib/content';
import { getIdentity } from '@/lib/identity';

declare global {
  interface Window {
    __wbLoaded?: boolean;
  }
}

// the script runs in every frame: the top frame owns the socket and state, a
// child frame just bridges its video to the top over postMessage.
const MIN_AREA = 120 * 90; // ignore tracking pixels / ad clips
const SEEK_THRESHOLD = 0.5; // seconds of drift we tolerate before scrubbing
const REMOTE_GUARD_MS = 400; // suppress echo right after applying a remote change

const IS_NETFLIX = location.hostname.endsWith('netflix.com');
// the landing /j page is the consent step; we don't sync there, just bridge its join click
const INVITE_HOST = new URL(INVITE_BASE_URL).hostname;

// writing video.currentTime crashes netflix; seek through its own player api via netflix-main.ts
function postNetflixSeek(time: number): void {
  window.postMessage({ __wbnf: 1, kind: 'seek', time }, '*');
}

type WbBridgeMsg =
  | { __wb: 1; kind: 'announce'; area: number; duration: number }
  | { __wb: 1; kind: 'state'; time: number; paused: boolean; rate?: number }
  | { __wb: 1; kind: 'gone' }
  | { __wb: 1; kind: 'apply'; time: number; paused: boolean; rate?: number };

function pickVideo(): HTMLVideoElement | null {
  const vids = [...document.querySelectorAll('video')];
  if (vids.length === 0) return null;
  return vids.map((v) => ({ v, area: v.clientWidth * v.clientHeight })).sort((a, b) => b.area - a.area)[0].v;
}

function applyTo(v: HTMLVideoElement, c: VideoControl): void {
  if (Math.abs(v.currentTime - c.time) > SEEK_THRESHOLD) {
    if (IS_NETFLIX) postNetflixSeek(c.time);
    else v.currentTime = c.time;
  }
  if (typeof c.rate === 'number' && v.playbackRate !== c.rate) v.playbackRate = c.rate;
  if (c.paused && !v.paused) v.pause();
  else if (!c.paused && v.paused) void v.play();
}

// abstracts away whether the synced video sits in this frame or a child iframe
interface VideoTarget {
  getState(): VideoControl | null;
  apply(c: VideoControl): void;
  setRate(rate: number): void;
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
    video.addEventListener('ratechange', this.onEv);
  }

  private onEv = () => {
    if (!this.applyingRemote) this.cb?.();
  };

  getState(): VideoControl {
    return { time: this.video.currentTime, paused: this.video.paused, rate: this.video.playbackRate };
  }

  apply(c: VideoControl): void {
    this.applyingRemote = true;
    window.clearTimeout(this.timer);
    applyTo(this.video, c);
    this.timer = window.setTimeout(() => {
      this.applyingRemote = false;
    }, REMOTE_GUARD_MS);
  }

  // a local rate change fires ratechange, which broadcasts the new state
  setRate(rate: number): void {
    this.video.playbackRate = rate;
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
    this.video.removeEventListener('ratechange', this.onEv);
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
    this.post({ __wb: 1, kind: 'apply', time: c.time, paused: c.paused, rate: c.rate });
  }

  // broadcast the new rate from the top, then push it down to the iframe video
  setRate(rate: number): void {
    if (!this.last) return;
    this.last = { ...this.last, rate };
    this.cb?.();
    this.apply(this.last);
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

// top frame: owns the socket, content identity, and which video to drive
function runTop(): void {
  let channel: VideoChannel | null = null;
  let target: VideoTarget | null = null;
  let pending: VideoControl | null = null;
  let targetTimer: number | undefined;

  let isAnchor = false;
  let navWatching = false;
  let navTimer: number | undefined;
  let lastHref = location.href;
  let currentCode: string | null = null;

  // landing consent page: don't sync. mark it so it shows "join", and turn the
  // click (a real user gesture) into a background message so sidePanel.open() works.
  if (location.hostname === INVITE_HOST) {
    document.documentElement.dataset.wbInstalled = '1';
    document.addEventListener('click', (e) => {
      const target = e.target as Element | null;
      if (!target?.closest('#join-link')) return;
      const code = parseInviteCode(location.hash);
      const url = parseInviteUrl(location.hash);
      if (!code || !url) return; // not a valid invite; let the link behave normally
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'WB_JOIN_INVITE', code, url }).catch(() => {
        location.href = url; // extension unreachable: at least get them to the video
      });
    });
    return;
  }

  // only the visible tab syncs; a hidden tab banks the latest control and catches up when shown
  let visible = document.visibilityState === 'visible';
  document.addEventListener('visibilitychange', () => {
    visible = document.visibilityState === 'visible';
    if (visible) flushPending();
  });

  // fullscreen swaps the painted subtree; move the reaction overlay so emojis follow the video
  document.addEventListener('fullscreenchange', () => {
    const layer = document.getElementById('wb-reactions');
    if (!layer) return;
    const host = reactionHost();
    if (layer.parentElement !== host) host.appendChild(layer);
  });

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
    if (msg.type === 'SET_RATE') {
      target?.setRate(msg.rate);
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
      if (target instanceof RemoteVideoTarget && target.win === src) target.pushState({ time: d.time, paused: d.paused, rate: d.rate });
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
        // switching rooms: tear the old socket down, since startSync won't reconnect over a live one
        if (channel && currentCode && currentCode !== code) stopSync();
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
    currentCode = code;
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
          onReaction: (p) => spawnReaction(p.emoji),
        });
      }
    } else if (anchor) {
      channel.claimAnchor(currentContent());
    }
    syncTarget();
    startTargetWatch();
    startNavWatch();
  }

  function stopSync() {
    channel?.disconnect();
    channel = null;
    target?.teardown();
    target = null;
    pending = null;
    announced.clear();
    isAnchor = false;
    currentCode = null;
    stopTargetWatch();
    stopNavWatch();
    document.getElementById('wb-reactions')?.remove();
  }

  // in fullscreen only that subtree paints, so host the overlay inside it; a raw <video> uses its parent
  function reactionHost(): Element {
    const fs = document.fullscreenElement;
    if (!fs) return document.documentElement;
    return fs.tagName === 'VIDEO' ? (fs.parentElement ?? document.documentElement) : fs;
  }

  // big emoji that floats up over the video's box (or the viewport) and fades
  function spawnReaction(emoji: string): void {
    let layer = document.getElementById('wb-reactions');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'wb-reactions';
      layer.className = 'wb-reactions';
    }
    const host = reactionHost();
    if (layer.parentElement !== host) host.appendChild(layer);

    const v = pickVideo();
    const rect = v && v.clientWidth * v.clientHeight >= MIN_AREA ? v.getBoundingClientRect() : null;
    const zone = rect ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    const el = document.createElement('div');
    el.className = 'wb-reaction';
    el.textContent = emoji;
    el.style.left = `${zone.left + zone.width * (0.2 + Math.random() * 0.6)}px`;
    el.style.top = `${zone.top + zone.height * 0.88}px`;
    el.style.setProperty('--wb-drift', `${Math.round(Math.random() * 80 - 40)}px`);
    el.addEventListener('animationend', () => el.remove());
    layer.appendChild(el);
  }

  // pick the largest video clearing the min-area floor so ad/background clips don't win
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
    flushPending();
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
    if (!channel || !target || !visible) return; // only the focused tab broadcasts
    const s = target.getState();
    if (s) channel.send(s);
  }

  function applyControl(c: VideoControl) {
    if (!visible || !target) {
      pending = c; // hidden (or no target yet): bank the latest, don't touch the video
      return;
    }
    target.apply(c);
  }

  function flushPending() {
    if (!visible || !target || !pending) return;
    const c = pending;
    pending = null;
    target.apply(c);
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
  }
}

// child frame: finds its <video>, relays it to the top frame, and applies remote control
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
    post({ __wb: 1, kind: 'state', time: v.currentTime, paused: v.paused, rate: v.playbackRate });
  };

  function attach(): void {
    const found = pickVideo();
    if (!found || found.clientWidth * found.clientHeight < MIN_AREA) return;
    v = found;
    v.addEventListener('play', onEv);
    v.addEventListener('pause', onEv);
    v.addEventListener('seeked', onEv);
    v.addEventListener('ratechange', onEv);
    announce();
  }

  function detach(notify: boolean): void {
    if (v) {
      v.removeEventListener('play', onEv);
      v.removeEventListener('pause', onEv);
      v.removeEventListener('seeked', onEv);
      v.removeEventListener('ratechange', onEv);
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
    if (d.kind === 'apply') applyFromTop({ time: d.time, paused: d.paused, rate: d.rate });
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
