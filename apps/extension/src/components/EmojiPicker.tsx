import { useEffect, useRef } from "react";
import { REACTION_EMOJI } from "@/lib/emoji";

// popover grid of every reaction emoji; pops up above its trigger. picking one
// fires a floating reaction through the existing reaction channel.
export function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 mb-2 w-[244px] animate-wb-pop-in rounded-[13px] border border-wb-line bg-wb-panel2 p-2 shadow-lg"
    >
      <div className="grid max-h-[180px] grid-cols-8 gap-0.5 overflow-y-auto">
        {REACTION_EMOJI.map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => onPick(emoji)}
            className="rounded-[8px] py-1 text-[15px] transition-all hover:scale-125 hover:bg-[rgba(255,178,62,.12)] active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
