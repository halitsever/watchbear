import { BearFace } from './Bear';
import type { Member } from '@/lib/types';

export function MemberChip({ m }: { m: Member }) {
  return (
    <div className="group relative shrink-0 animate-wb-chip-in">
      <BearFace size={26} fur={m.fur} furDark={m.furDark} ring={m.you ? 'var(--color-wb-honey)' : undefined} />
      {m.host && (
        <span className="absolute -top-[7px] left-1/2 -translate-x-1/2 rotate-[8deg] text-[11px]">👑</span>
      )}
      <span className="absolute -bottom-px -right-px h-[9px] w-[9px] animate-wb-breathe rounded-full border-2 border-wb-panel bg-wb-online" />

      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-wb-line bg-[#1d150f] px-2 py-1 text-[11px] font-bold text-wb-text opacity-0 shadow-[0_6px_16px_rgba(0,0,0,.4)] transition-opacity duration-150 group-hover:opacity-100">
        {m.name}
        {m.you && <span className="text-wb-faint"> (you)</span>}
        {m.host && <span className="text-wb-honey"> · host</span>}
      </span>
    </div>
  );
}
