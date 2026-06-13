import { BearFace } from './Bear';
import type { Member } from '@/lib/types';

export function MemberChip({ m }: { m: Member }) {
  return (
    <div className="relative shrink-0" title={m.name + (m.host ? ' · host' : '')}>
      <BearFace size={30} fur={m.fur} furDark={m.furDark} ring={m.you ? 'var(--color-wb-honey)' : undefined} />
      {m.host && (
        <span className="absolute -top-[7px] left-1/2 -translate-x-1/2 rotate-[8deg] text-[11px]">👑</span>
      )}
      <span className="absolute -bottom-px -right-px h-[9px] w-[9px] rounded-full border-2 border-wb-panel bg-wb-online" />
    </div>
  );
}
