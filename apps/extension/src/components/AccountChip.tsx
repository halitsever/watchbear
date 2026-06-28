import { useEffect, useRef, useState } from "react";
import IconLogOut from "~icons/lucide/log-out";
import { isGoogleLoginConfigured, requestGoogleLogin, logout } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

export function AccountChip({ onAuthChange }: { onAuthChange?: () => void }) {
  const user = useAuth();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isGoogleLoginConfigured()) return null;

  async function signIn() {
    setBusy(true);
    try {
      const res = await requestGoogleLogin();
      if (res.ok) onAuthChange?.();
      // failure/cancel: nothing to surface in the header
    } catch {
      // popup may have closed mid-flow; the background finishes and useAuth updates
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setOpen(false);
    await logout();
    onAuthChange?.();
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-wb-line bg-[#1d150f] px-2.5 py-1 text-[11.5px] font-bold text-wb-dim transition-colors hover:border-[rgba(255,178,62,.3)] hover:text-wb-honey disabled:opacity-50"
      >
        <GoogleMark />
        {busy ? "…" : "Sign in"}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        title={user.email}
        className="block h-7 w-7 overflow-hidden rounded-full border border-wb-line transition-transform hover:-translate-y-px active:scale-95"
      >
        {user.picture ? (
          <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-[#3a2c20] text-[12px] font-extrabold text-wb-cream">
            {(user.name ?? user.email).slice(0, 1).toUpperCase()}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[180px] animate-wb-pop-in rounded-xl border border-wb-line bg-[#1d150f] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <div className="truncate px-2 pb-1.5 pt-1 text-[11px] font-semibold text-wb-faint">{user.email}</div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-bold text-wb-dim transition-colors hover:bg-[#2e2018] hover:text-wb-coral"
          >
            <IconLogOut className="h-[13px] w-[13px]" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-[13px] w-[13px] shrink-0" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
