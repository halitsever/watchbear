import { useEffect, useState } from 'react';
import { AUTH_KEY, getAuth, type AuthUser } from '@/lib/auth';

// logged-in user, kept in sync with storage so login/logout reflects live across popup and sidepanel
export function useAuth(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    void getAuth().then((a) => {
      if (active) setUser(a?.user ?? null);
    });

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !(AUTH_KEY in changes)) return;
      void getAuth().then((a) => {
        if (active) setUser(a?.user ?? null);
      });
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  return user;
}
