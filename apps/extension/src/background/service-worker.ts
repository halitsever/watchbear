import { STORAGE_KEYS, isValidCode } from '@/lib/room';
import { PANEL_PORT_NAME } from '@/lib/panelPort';
import type { PopupMessage, ContentMessage } from '@/lib/messages';

function clearRoomState() {
  void chrome.storage.local.set({ [STORAGE_KEYS.inRoom]: false, [STORAGE_KEYS.roomCode]: '', [STORAGE_KEYS.anchorTabId]: null });
}

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
    // the anchor tab's video is what the den watches; anchorTabId keeps that mark across reloads
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

  // one-click join from the landing page: open the panel, write room state, then navigate the tab
  if (msg.type === 'WB_JOIN_INVITE') {
    const tabId = sender.tab?.id;
    if (!tabId || !isValidCode(msg.code)) return;
    let url: string | null = null;
    try {
      const u = new URL(msg.url);
      if (u.protocol === 'http:' || u.protocol === 'https:') url = u.href;
    } catch {
      url = null;
    }
    chrome.sidePanel.open({ tabId }).catch(() => {});
    chrome.storage.local.set(
      { [STORAGE_KEYS.inRoom]: true, [STORAGE_KEYS.roomCode]: msg.code, [STORAGE_KEYS.anchorTabId]: null },
      () => {
        if (url) chrome.tabs.update(tabId, { url }).catch(() => {});
      },
    );
    return;
  }

  if (msg.type === 'WB_LEAVE_ROOM') {
    clearRoomState();
    if (msg.tabId) chrome.tabs.sendMessage(msg.tabId, { type: 'LEAVE_ROOM' }).catch(() => {});
    return;
  }
});

// closing the side panel drops this port; treat it as leaving the room
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PANEL_PORT_NAME) return;
  port.onDisconnect.addListener(() => {
    chrome.storage.local.get(STORAGE_KEYS.inRoom, (d) => {
      if (d[STORAGE_KEYS.inRoom]) clearRoomState();
    });
  });
});

// re-arm the anchor after it navigates, so the fresh content script knows it's still the anchor
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  chrome.storage.local.get([STORAGE_KEYS.inRoom, STORAGE_KEYS.roomCode, STORAGE_KEYS.anchorTabId], (d) => {
    const code = d[STORAGE_KEYS.roomCode];
    if (!d[STORAGE_KEYS.inRoom] || typeof code !== 'string' || d[STORAGE_KEYS.anchorTabId] !== tabId) return;
    chrome.tabs.sendMessage(tabId, { type: 'START_ROOM', code, anchor: true }).catch(() => {});
  });
});
