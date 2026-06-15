import { STORAGE_KEYS } from '@/lib/room';
import type { PopupMessage, ContentMessage } from '@/lib/messages';

chrome.runtime.onMessage.addListener((msg: PopupMessage | ContentMessage, sender) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg.type === 'ROOM_STATE') {
    const tabId = sender.tab?.id;
    if (!tabId) return;
    if (msg.inRoom && msg.memberCount > 1) {
      void chrome.action.setBadgeText({ text: String(msg.memberCount), tabId });
      void chrome.action.setBadgeBackgroundColor({ color: '#FF8C6B', tabId });
    } else {
      void chrome.action.setBadgeText({ text: '', tabId });
    }
    return;
  }

  if (msg.type === 'WB_START_ROOM' || msg.type === 'WB_JOIN_ROOM') {
    const { code, tabId } = msg;
    // the tab that starts the party is the anchor: its video defines what the
    // den watches. joiners follow it. anchorTabId lets us keep that mark across
    // full-page reloads (see tabs.onUpdated below).
    const isAnchor = msg.type === 'WB_START_ROOM';
    const contentType = isAnchor ? 'START_ROOM' : 'JOIN_ROOM';
    void chrome.storage.local.set(
      { [STORAGE_KEYS.inRoom]: true, [STORAGE_KEYS.roomCode]: code, [STORAGE_KEYS.anchorTabId]: isAnchor ? tabId : null },
      () => {
        chrome.sidePanel.open({ tabId }).catch(() => {});
      },
    );
    chrome.tabs.sendMessage(tabId, { type: contentType, code, anchor: isAnchor }).catch(() => {});
    return;
  }

  if (msg.type === 'WB_LEAVE_ROOM') {
    void chrome.storage.local.set({ [STORAGE_KEYS.inRoom]: false, [STORAGE_KEYS.roomCode]: '', [STORAGE_KEYS.anchorTabId]: null });
    if (msg.tabId) chrome.tabs.sendMessage(msg.tabId, { type: 'LEAVE_ROOM' }).catch(() => {});
    return;
  }
});

// re-arm the anchor after it navigates to a new page, so the freshly injected
// content script knows it's still the anchor (the flag came from a one-off message).
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  chrome.storage.local.get([STORAGE_KEYS.inRoom, STORAGE_KEYS.roomCode, STORAGE_KEYS.anchorTabId], (d) => {
    const code = d[STORAGE_KEYS.roomCode];
    if (!d[STORAGE_KEYS.inRoom] || typeof code !== 'string' || d[STORAGE_KEYS.anchorTabId] !== tabId) return;
    chrome.tabs.sendMessage(tabId, { type: 'START_ROOM', code, anchor: true }).catch(() => {});
  });
});
