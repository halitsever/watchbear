import { BearFace } from './Bear';
import type { Member, Message } from '@/lib/types';

export function ChatLine({ msg, members }: { msg: Message; members: Member[] }) {
  if (msg.type === 'system') {
    return (
      <div className="my-1 self-center rounded-full bg-[rgba(255,220,180,.05)] px-3 py-1 text-center text-[11px] font-semibold text-wb-faint">
        {msg.text}
      </div>
    );
  }

  const m = members.find((x) => x.name === msg.from) ?? { fur: '#B97C43', furDark: '#9A6230' };
  const mine = msg.mine;

  return (
    <div className={`flex items-end gap-[9px] ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!mine && <BearFace size={26} fur={m.fur} furDark={m.furDark} />}
      <div className="max-w-[76%]">
        {!mine && <div className="mb-[3px] ml-1 text-[11px] font-bold text-wb-dim">{msg.from}</div>}
        <div
          className={
            mine
              ? 'rounded-[14px_4px_14px_14px] bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-3 py-2 text-[13px] font-semibold leading-[1.42] text-[#3a2410]'
              : 'rounded-[4px_14px_14px_14px] bg-wb-panel2 px-3 py-2 text-[13px] font-medium leading-[1.42] text-wb-text'
          }
        >
          {msg.text}
        </div>
      </div>
    </div>
  );
}
