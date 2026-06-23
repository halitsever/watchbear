import { useEffect, useRef, useState } from "react";
import IconReply from "~icons/lucide/reply";
import IconCopy from "~icons/lucide/copy";

export interface MenuAnchor {
  x: number;
  y: number;
}

// small right-click menu over a chat bubble. positions at the cursor, clamped to
// the viewport, and closes on outside click / escape / scroll.
export function MessageMenu({
  anchor,
  canCopy,
  onReply,
  onCopy,
  onClose,
}: {
  anchor: MenuAnchor;
  canCopy: boolean;
  onReply: () => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(anchor);

  // keep the menu inside the panel after it has measured itself
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      x: Math.min(anchor.x, window.innerWidth - width - 8),
      y: Math.min(anchor.y, window.innerHeight - height - 8),
    });
  }, [anchor]);

  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      // stop the opening pointerdown from immediately closing the menu
      onPointerDown={(e) => e.stopPropagation()}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-50 min-w-[132px] animate-wb-pop-in overflow-hidden rounded-[11px] border border-wb-line bg-wb-panel2 py-1 shadow-lg"
    >
      <button
        type="button"
        onClick={() => {
          onReply();
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] font-bold text-wb-text transition-colors hover:bg-[rgba(255,178,62,.12)] hover:text-wb-honey"
      >
        <IconReply className="h-[14px] w-[14px]" />
        Reply
      </button>
      {canCopy && (
        <button
          type="button"
          onClick={() => {
            onCopy();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] font-bold text-wb-text transition-colors hover:bg-[rgba(255,178,62,.12)] hover:text-wb-honey"
        >
          <IconCopy className="h-[14px] w-[14px]" />
          Copy text
        </button>
      )}
    </div>
  );
}
