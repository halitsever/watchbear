import { useEffect, useRef, useState } from "react";
import IconChevronDown from "~icons/lucide/chevron-down";
import IconLock from "~icons/lucide/lock";
import { Avatar } from "@/components/Avatar";
import { BearPicker } from "@/components/BearPicker";
import type { Identity } from "@/lib/identity";

// the inline name + bear-picker editor used by the pre-room popup
export function IdentityEditor({
  identity,
  onChangeName,
  onChangeBear,
  onSave,
  saveDisabled,
  locked,
  googlePhoto,
  onToggleAvatar,
}: {
  identity: Identity | null;
  onChangeName: (name: string) => void;
  onChangeBear: (fur: string, furDark: string) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  locked?: boolean;
  googlePhoto?: string | null;
  onToggleAvatar?: (use: boolean) => void;
}) {
  const usingPhoto = !!identity?.avatar;
  const [bearOpen, setBearOpen] = useState(false);
  const [bearClosing, setBearClosing] = useState(false);
  const bearRef = useRef<HTMLDivElement>(null);
  const bearTimer = useRef<number>(0);

  function closeBear() {
    setBearClosing(true);
    window.clearTimeout(bearTimer.current);
    bearTimer.current = window.setTimeout(() => {
      setBearOpen(false);
      setBearClosing(false);
    }, 200);
  }

  function openBear() {
    window.clearTimeout(bearTimer.current);
    setBearClosing(false);
    setBearOpen(true);
  }

  useEffect(() => {
    if (!bearOpen) return;
    function onDown(e: MouseEvent) {
      if (!bearRef.current?.contains(e.target as Node)) closeBear();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeBear();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [bearOpen]);

  return (
    <div ref={bearRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (bearOpen && !bearClosing ? closeBear() : openBear())}
          disabled={locked}
          title={locked ? "Sign in to change your look" : "Change your look"}
          aria-label="Change your look"
          aria-haspopup="true"
          aria-expanded={bearOpen && !bearClosing}
          className="group relative shrink-0 rounded-full transition-transform enabled:hover:-translate-y-px disabled:opacity-70"
        >
          <Avatar
            size={30}
            fur={identity?.fur ?? "#B97C43"}
            furDark={identity?.furDark ?? "#9A6230"}
            avatar={identity?.avatar}
            ring="var(--color-wb-honey)"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#2c211a] text-wb-honey shadow-[0_0_0_1.5px_#2c211a] transition-colors group-enabled:group-hover:bg-[#3a2a1d]"
          >
            {locked ? (
              <IconLock className="h-[9px] w-[9px]" />
            ) : (
              <IconChevronDown className={`h-[10px] w-[10px] transition-transform ${bearOpen && !bearClosing ? "rotate-180" : ""}`} />
            )}
          </span>
        </button>
        <input
          value={identity?.name ?? ""}
          onChange={(e) => onChangeName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSave && !saveDisabled) onSave();
          }}
          disabled={locked}
          placeholder="your bear name"
          maxLength={20}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-wb-line bg-[#1d150f] px-[13px] py-[10px] text-[13.5px] font-bold text-wb-text outline-none transition-colors placeholder:text-wb-faint focus:border-[rgba(255,178,62,.45)] disabled:cursor-default disabled:opacity-60"
        />
        {!locked && onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            title="Save your bear and name"
            className="shrink-0 rounded-xl bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-3.5 py-[10px] text-[13px] font-bold text-[#3a2410] shadow-md transition-all enabled:hover:scale-[1.03] enabled:active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            Save
          </button>
        )}
      </div>
      {locked && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-wb-faint">
          <IconLock className="h-[11px] w-[11px] shrink-0" />
          Sign in to pick your bear and keep your name.
        </div>
      )}
      {!locked && (bearOpen || bearClosing) && (
        <div className={`mt-2 origin-top ${bearClosing ? "animate-wb-pop-out" : "animate-wb-pop-in"}`}>
          <BearPicker
            selectedFur={identity?.fur ?? ""}
            googlePhoto={googlePhoto}
            usingPhoto={usingPhoto}
            onPickPhoto={
              onToggleAvatar
                ? () => {
                    onToggleAvatar(true);
                    closeBear();
                  }
                : undefined
            }
            onPick={(fur, furDark) => {
              onChangeBear(fur, furDark);
              if (usingPhoto) onToggleAvatar?.(false);
              closeBear();
            }}
          />
        </div>
      )}
    </div>
  );
}
