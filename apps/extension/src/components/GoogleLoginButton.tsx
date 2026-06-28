import { useState } from "react";
import { isGoogleLoginConfigured, loginWithGoogle } from "@/lib/auth";

export function GoogleLoginButton({ onAuthChange }: { onAuthChange?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (!isGoogleLoginConfigured()) return null;

  async function signIn() {
    setBusy(true);
    setError(false);
    try {
      await loginWithGoogle();
      onAuthChange?.();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2.5 rounded-[13px] border border-wb-line bg-[#f7f7f7] px-4 py-2.5 text-[13px] font-bold text-[#3c4043] transition-all hover:bg-white active:scale-[.98] disabled:opacity-50"
      >
        <GoogleMark />
        {busy ? "Connecting…" : "Continue with Google"}
      </button>
      {error && (
        <div className="mt-2 rounded-[10px] border border-[rgba(255,140,107,.25)] bg-[rgba(255,140,107,.1)] px-2.5 py-2 text-center text-[11.5px] font-bold text-wb-coral">
          Couldn't sign in. Try again.
        </div>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-[16px] w-[16px] shrink-0" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
