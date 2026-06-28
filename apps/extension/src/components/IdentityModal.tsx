import { useEffect } from "react";
import IconX from "~icons/lucide/x";
import IconLock from "~icons/lucide/lock";
import { Avatar } from "@/components/Avatar";
import { BearPicker } from "@/components/BearPicker";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import type { Identity } from "@/lib/identity";

// edits live on the parent's draft until Save; the pre-room popup keeps the inline IdentityEditor.
export function IdentityModal({
  identity,
  onChangeName,
  onChangeBear,
  onToggleAvatar,
  onSave,
  saveDisabled,
  onClose,
  closing,
  locked,
  googlePhoto,
  onLogin,
}: {
  identity: Identity | null;
  onChangeName: (name: string) => void;
  onChangeBear: (fur: string, furDark: string) => void;
  onToggleAvatar?: (use: boolean) => void;
  onSave: () => void;
  saveDisabled?: boolean;
  onClose: () => void;
  closing?: boolean;
  locked?: boolean;
  googlePhoto?: string | null;
  onLogin?: () => void;
}) {
  const usingPhoto = !!identity?.avatar;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onMouseDown={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${closing ? "animate-wb-backdrop-out" : "animate-wb-backdrop-in"}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit your bear"
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full max-w-[300px] origin-center rounded-2xl border border-wb-line bg-wb-bg2 p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] ${closing ? "animate-wb-pop-out" : "animate-wb-pop-in"}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-fredoka text-[15px] font-semibold text-wb-honey">Your bear</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-wb-faint transition-colors hover:bg-[#3a2c20] hover:text-wb-text"
          >
            <IconX className="h-[15px] w-[15px]" />
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <Avatar
            size={52}
            fur={identity?.fur ?? "#B97C43"}
            furDark={identity?.furDark ?? "#9A6230"}
            avatar={identity?.avatar}
            ring="var(--color-wb-honey)"
          />
        </div>

        {locked ? (
          <>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] font-semibold text-wb-faint">
              <IconLock className="h-[12px] w-[12px] shrink-0" />
              Sign in to pick your bear and keep your name.
            </div>
            <div className="mt-3">
              <GoogleLoginButton onAuthChange={onLogin} />
            </div>
          </>
        ) : (
          <>
            <input
              value={identity?.name ?? ""}
              onChange={(e) => onChangeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !saveDisabled) onSave();
              }}
              placeholder="your bear name"
              maxLength={20}
              autoComplete="off"
              autoFocus
              className="mt-3 w-full rounded-xl border border-wb-line bg-[#1d150f] px-[13px] py-[10px] text-[13.5px] font-bold text-wb-text outline-none transition-colors placeholder:text-wb-faint focus:border-[rgba(255,178,62,.45)]"
            />

            <div className="mt-3">
              <BearPicker
                selectedFur={identity?.fur ?? ""}
                googlePhoto={googlePhoto}
                usingPhoto={usingPhoto}
                onPickPhoto={onToggleAvatar ? () => onToggleAvatar(true) : undefined}
                onPick={(fur, furDark) => {
                  onChangeBear(fur, furDark);
                  if (usingPhoto) onToggleAvatar?.(false);
                }}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#3a2c20] px-3.5 py-[10px] text-[13px] font-bold text-wb-dim transition-colors hover:bg-[#4a3826] hover:text-wb-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saveDisabled}
                title="Save your bear and name"
                className="rounded-xl bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-3.5 py-[10px] text-[13px] font-bold text-[#3a2410] shadow-md transition-all enabled:hover:scale-[1.03] enabled:active:scale-95 disabled:opacity-40 disabled:shadow-none"
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
