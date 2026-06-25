import { useEffect, useRef, useState } from "react";
import IconChevronDown from "~icons/lucide/chevron-down";
import { BearFace } from "@/components/Bear";
import { BearPicker } from "@/components/BearPicker";
import type { Identity } from "@/lib/identity";

// the bear button + name input + bear-picker dropdown, shared by the popup
// (pre-room) and the sidepanel (in-room) so identity editing looks the same.
export function IdentityEditor({
  identity,
  onChangeName,
  onChangeBear,
  onSave,
  saveDisabled,
}: {
  identity: Identity | null;
  onChangeName: (name: string) => void;
  onChangeBear: (fur: string, furDark: string) => void;
  // when provided, edits stay local until Save is pressed (used in-room)
  onSave?: () => void;
  saveDisabled?: boolean;
}) {
  const [bearOpen, setBearOpen] = useState(false);
  const [bearClosing, setBearClosing] = useState(false);
  const bearRef = useRef<HTMLDivElement>(null);
  const bearTimer = useRef<number>(0);

  // play the exit animation, then unmount once it finishes
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
          title="Change your bear"
          aria-label="Change your bear"
          aria-haspopup="true"
          aria-expanded={bearOpen && !bearClosing}
          className="group relative shrink-0 rounded-full transition-transform hover:-translate-y-px"
        >
          <BearFace
            size={30}
            fur={identity?.fur ?? "#B97C43"}
            furDark={identity?.furDark ?? "#9A6230"}
            ring="var(--color-wb-honey)"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#2c211a] text-wb-honey shadow-[0_0_0_1.5px_#2c211a] transition-colors group-hover:bg-[#3a2a1d]"
          >
            <IconChevronDown className={`h-[10px] w-[10px] transition-transform ${bearOpen && !bearClosing ? "rotate-180" : ""}`} />
          </span>
        </button>
        <input
          value={identity?.name ?? ""}
          onChange={(e) => onChangeName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSave && !saveDisabled) onSave();
          }}
          placeholder="your bear name"
          maxLength={20}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-wb-line bg-[#1d150f] px-[13px] py-[10px] text-[13.5px] font-bold text-wb-text outline-none transition-colors placeholder:text-wb-faint focus:border-[rgba(255,178,62,.45)]"
        />
        {onSave && (
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
      {(bearOpen || bearClosing) && (
        <div className={`mt-2 origin-top ${bearClosing ? "animate-wb-pop-out" : "animate-wb-pop-in"}`}>
          <BearPicker
            selectedFur={identity?.fur ?? ""}
            onPick={(fur, furDark) => {
              onChangeBear(fur, furDark);
              closeBear();
            }}
          />
        </div>
      )}
    </div>
  );
}
