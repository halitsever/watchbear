import { Avatar } from './Avatar';
import { linkify } from '@/lib/linkify';
import type { Member, Message } from '@/lib/types';
import type { MenuAnchor } from './MessageMenu';

const formatClock = (ts?: number) =>
  ts == null ? '' : new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function ChatLine({
  msg,
  members,
  grouped,
  highlighted,
  onContext,
  onJumpTo,
}: {
  msg: Message;
  members: Member[];
  grouped?: boolean;
  highlighted?: boolean;
  onContext?: (msg: Message, anchor: MenuAnchor) => void;
  onJumpTo?: (mid: string) => void;
}) {
  if (msg.type === 'system') {
    return (
      <div className="mt-2.5 animate-wb-msg-in self-center rounded-full bg-[rgba(255,220,180,.05)] px-3 py-1 text-center text-[11px] font-semibold text-wb-faint">
        {msg.text}
      </div>
    );
  }

  const m = members.find((x) => x.name === msg.from) ?? { fur: '#B97C43', furDark: '#9A6230' };
  const mine = msg.mine;
  const tail = mine ? 'rounded-[14px_4px_14px_14px]' : 'rounded-[4px_14px_14px_14px]';
  const linkClass = mine
    ? 'underline decoration-2 underline-offset-2 font-bold text-[#7a3d00] hover:text-[#5a2c00]'
    : 'underline underline-offset-2 text-wb-honey hover:text-wb-coral';

  const openMenu = (e: React.MouseEvent) => {
    if (!onContext) return;
    e.preventDefault();
    onContext(msg, { x: e.clientX, y: e.clientY });
  };

  return (
    <div
      data-mid={msg.mid}
      className={`flex animate-wb-msg-in items-end gap-2 rounded-[14px] ${grouped ? 'mt-0.5' : 'mt-2'} ${mine ? 'flex-row-reverse' : 'flex-row'} ${highlighted ? 'wb-flash' : ''}`}
    >
      {!mine && (grouped ? <span className="w-[24px] shrink-0" /> : <Avatar size={24} fur={m.fur} furDark={m.furDark} avatar={(m as { avatar?: string }).avatar} />)}
      <div className="min-w-0 max-w-[76%]">
        {!mine && !grouped && <div className="mb-[3px] ml-1 text-[11px] font-bold text-wb-dim">{msg.from}</div>}

        {msg.replyTo && (
          <button
            type="button"
            onClick={() => msg.replyTo?.mid && onJumpTo?.(msg.replyTo.mid)}
            className={`mb-0.5 flex max-w-full flex-col items-start gap-0.5 rounded-[9px] border-l-2 border-wb-honey bg-[rgba(255,220,180,.06)] px-2 py-1 text-left transition-colors hover:bg-[rgba(255,220,180,.1)] ${mine ? 'ml-auto' : ''}`}
          >
            <span className="text-[10.5px] font-bold text-wb-honey">{msg.replyTo.from}</span>
            <span className="line-clamp-1 max-w-[180px] truncate text-[11px] font-medium text-wb-faint">
              {msg.replyTo.text}
            </span>
          </button>
        )}

        <div className={`flex items-end gap-1.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
          <div
            onContextMenu={openMenu}
            className={
              mine
                ? `${grouped ? 'rounded-[14px]' : tail} min-w-0 [overflow-wrap:anywhere] bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-2.5 py-1.5 text-[13px] font-semibold leading-[1.42] text-[#3a2410]`
                : `${grouped ? 'rounded-[14px]' : tail} min-w-0 [overflow-wrap:anywhere] bg-wb-panel2 px-2.5 py-1.5 text-[13px] font-medium leading-[1.42] text-wb-text`
            }
          >
            {linkify(msg.text, linkClass)}
          </div>
          <span className="mb-0.5 shrink-0 text-[10px] text-wb-faint">{formatClock(msg.ts)}</span>
        </div>
      </div>
    </div>
  );
}
