import { useState } from 'react';
import IconCheck from '~icons/lucide/check';
import { BearMark } from '@/components/Bear';
import { GoogleMark } from '@/components/GoogleMark';
import { useAuth } from '@/hooks/useAuth';
import { requestGoogleLogin } from '@/lib/auth';

export function Onboarding() {
  const user = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      const res = await requestGoogleLogin();
      // the background reports failures as String(e); strip the Error prefix for display
      if (!res.ok) setError(res.error?.replace(/^Error:\s*/, "") || "Login didn't complete. Give it another try.");
    } catch {
      setError("Login didn't complete. Give it another try.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 font-nunito">
      <div className="w-full max-w-[380px] animate-wb-pop-in rounded-[22px] border border-[rgba(255,200,140,.12)] bg-[linear-gradient(180deg,#2c211a,#241a13)] px-8 py-10 text-center shadow-[0_26px_70px_rgba(0,0,0,.55)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_50%_35%,#3a2a1d,#271b12)] shadow-[inset_0_0_0_1px_rgba(255,200,140,.12)]">
          <div className="animate-wb-float">
            <BearMark size={56} />
          </div>
        </div>
        <h1 className="mt-4 font-fredoka text-[26px] font-semibold leading-none text-wb-text">
          Watch<span className="wb-shimmer-text animate-wb-shimmer">bear</span>
        </h1>
        <p className="mt-2 text-[13.5px] font-medium text-wb-dim">the sweet way to watch together</p>

        {user ? (
          <>
            <div className="mt-7 flex items-center justify-center gap-2 rounded-xl border border-[rgba(123,201,111,.24)] bg-[rgba(123,201,111,.1)] px-4 py-3 text-[13.5px] font-bold text-[#9fd98f]">
              <IconCheck className="h-4 w-4 shrink-0" />
              You're set, {user.name ?? user.email}!
            </div>
            <p className="mt-4 text-[13px] font-semibold leading-[1.5] text-wb-dim">
              Click the bear in your toolbar to start a watch party, or open an invite link a friend sent you.
            </p>
          </>
        ) : (
          <>
            <p className="mt-6 text-[13px] font-semibold leading-[1.55] text-wb-dim">
              Sign in with Google to start watching together. Your name and bear travel with you to every den.
            </p>
            <button
              type="button"
              onClick={() => void signIn()}
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-5 py-3 text-[14.5px] font-extrabold text-[#3a2410] shadow-[0_8px_20px_rgba(242,145,42,.32)] transition-all enabled:animate-wb-glow enabled:hover:scale-[1.02] enabled:hover:brightness-105 enabled:active:scale-95 disabled:opacity-50"
            >
              <GoogleMark />
              {busy ? 'Waiting for Google…' : 'Continue with Google'}
            </button>
            {error && (
              <div className="mt-3 rounded-xl border border-[rgba(255,140,107,.25)] bg-[rgba(255,140,107,.1)] px-4 py-2.5 text-[12.5px] font-bold text-wb-coral">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
