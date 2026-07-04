import { useEffect, useRef, useState } from "react";
import IconLogOut from "~icons/lucide/log-out";
import { isGoogleLoginConfigured, requestGoogleLogin, logout } from "@/lib/auth";
import { sendToBackground } from "@/lib/messages";
import { useAuth } from "@/hooks/useAuth";
import { GoogleMark } from "@/components/GoogleMark";

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
    // login is mandatory, so a signed-out user cannot stay in a room
    sendToBackground({ type: "WB_LEAVE_ROOM" });
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

