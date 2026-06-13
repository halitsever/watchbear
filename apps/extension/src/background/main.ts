import { STORAGE_KEYS } from '@/lib/room';
import type { PopupMessage, ContentMessage } from '@/lib/messages';

chrome.runtime.onMessage.addListener((msg: PopupMessage | ContentMessage, sender) => {
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
    const contentType = msg.type === 'WB_START_ROOM' ? 'START_ROOM' : 'JOIN_ROOM';
    void chrome.storage.local.set({ [STORAGE_KEYS.inRoom]: true, [STORAGE_KEYS.roomCode]: code }, () => {
      chrome.sidePanel.open({ tabId }).catch(() => {});
    });
    chrome.tabs.sendMessage(tabId, { type: contentType, code }).catch(() => {});
    return;
  }

  if (msg.type === 'WB_LEAVE_ROOM') {
    void chrome.storage.local.set({ [STORAGE_KEYS.inRoom]: false, [STORAGE_KEYS.roomCode]: '' });
    if (msg.tabId) chrome.tabs.sendMessage(msg.tabId, { type: 'LEAVE_ROOM' }).catch(() => {});
    return;
  }
});
