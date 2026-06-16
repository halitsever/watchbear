import { useEffect, useState } from 'react';
import { readRoomState, STORAGE_KEYS, type RoomState } from '@/lib/room';

export function useRoomState(): RoomState {
  const [state, setState] = useState<RoomState>({ inRoom: false, roomCode: '' });

  useEffect(() => {
    let active = true;
    void readRoomState().then((s) => {
      if (active) setState(s);
    });

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;
      if (STORAGE_KEYS.inRoom in changes || STORAGE_KEYS.roomCode in changes) {
        void readRoomState().then((s) => {
          if (active) setState(s);
        });
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  return state;
}
