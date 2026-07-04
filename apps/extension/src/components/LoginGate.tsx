import { BearMark } from '@/components/Bear';
import { GoogleMark } from '@/components/GoogleMark';
import { openOnboarding } from '@/lib/auth';

// full-surface lock shown in popup and sidepanel when signed out; the actual
// login runs on the onboarding page so the flow survives the popup closing
export function LoginGate({ onOpen }: { onOpen?: () => void }) {
  function open() {
    openOnboarding();
    onOpen?.();
  }

  return (
    <div className="flex animate-wb-fade-in flex-col items-center px-6 py-9 text-center font-nunito">
      <div className="animate-wb-float">
        <BearMark size={56} />
      </div>
      <div className="mt-3 font-fredoka text-[17px] font-semibold text-wb-text">
        Watch<span className="wb-shimmer-text animate-wb-shimmer">bear</span>
      </div>
      <div className="mt-2 text-[12.5px] font-medium leading-[1.5] text-wb-dim">Sign in with Google to start watching together.</div>
      <button
        type="button"
        onClick={open}
        className="mt-4 flex items-center gap-2 rounded-[12px] bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-5 py-2 text-[13.5px] font-bold text-[#3a2410] shadow-md transition-all hover:scale-[1.02] hover:brightness-105 active:scale-95"
      >
        <GoogleMark />
        Sign in with Google
      </button>
    </div>
  );
}
