export type PopupMessage =
  | { type: 'WB_START_ROOM'; code: string; tabId: number }
  | { type: 'WB_JOIN_ROOM'; code: string; tabId: number }
  | { type: 'WB_LEAVE_ROOM'; tabId?: number };

export type ContentMessage = { type: 'ROOM_STATE'; inRoom: boolean; memberCount: number };

export type TabMessage =
  | { type: 'START_ROOM'; code: string }
  | { type: 'JOIN_ROOM'; code: string }
  | { type: 'LEAVE_ROOM' };

export interface VideoState {
  currentTime: number;
  duration: number;
  paused: boolean;
}

export type RuntimeMessage = PopupMessage | ContentMessage;

export function sendToBackground(msg: RuntimeMessage): void {
  void chrome.runtime.sendMessage(msg).catch(() => {});
}

export function sendToTab(tabId: number, msg: TabMessage): void {
  void chrome.tabs.sendMessage(tabId, msg).catch(() => {});
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function readBestVideoInPage(): { currentTime: number; duration: number; paused: boolean } | null {
  let videos = [...document.querySelectorAll('video')];
  if (videos.length === 0) {
    const collect = (root: Document | ShadowRoot) => {
      root.querySelectorAll('*').forEach((el) => {
        const sr = (el as HTMLElement).shadowRoot;
        if (sr) {
          videos.push(...sr.querySelectorAll('video'));
          collect(sr);
        }
      });
    };
    collect(document);
  }
  if (videos.length === 0) return null;
  // playing first, then longest (the feature, not a hero/ad clip), then largest
  const best = videos
    .map((v) => ({
      v,
      playing: v.paused ? 0 : 1,
      dur: Number.isFinite(v.duration) ? v.duration : 0,
      area: v.clientWidth * v.clientHeight,
    }))
    .sort((a, b) => b.playing - a.playing || b.dur - a.dur || b.area - a.area)[0].v;
  return { currentTime: best.currentTime, duration: best.duration, paused: best.paused };
}

// null = no video anywhere, undefined = page not injectable (keep last value)
export async function getVideoTime(tabId: number): Promise<VideoState | null | undefined> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: readBestVideoInPage,
    });
    const states = results
      .map((r) => r.result)
      .filter((s): s is VideoState => s != null);
    if (states.length === 0) return null;
    states.sort((a, b) => Number(!b.paused) - Number(!a.paused) || b.duration - a.duration);
    return states[0];
  } catch {
    return undefined;
  }
}
