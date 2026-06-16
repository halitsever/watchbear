import { useEffect, useState } from 'react';
import { getServerUrl, SERVER_KEY } from '@/lib/server';

// current server url, kept in sync with storage so edits elsewhere reflect live.
export function useServerUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getServerUrl().then((u) => {
      if (active) setUrl(u);
    });

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !(SERVER_KEY in changes)) return;
      void getServerUrl().then((u) => {
        if (active) setUrl(u);
      });
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  return url;
}
