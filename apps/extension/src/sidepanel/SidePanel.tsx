import { useEffect, useRef, useState } from "react";
import IconSend from "~icons/lucide/send";
import IconCopy from "~icons/lucide/copy";
import IconCheck from "~icons/lucide/check";
import IconClock from "~icons/lucide/clock";
import IconTv from "~icons/lucide/tv";
import { BearMark } from "@/components/Bear";
import { MemberChip } from "@/components/MemberChip";
import { ChatLine } from "@/components/ChatLine";
import { useRoomState } from "@/hooks/useRoomState";
import { getActiveTab, getVideoTime, sendToBackground } from "@/lib/messages";
import { getIdentity, type Identity } from "@/lib/identity";
import { buildInviteLink, STORAGE_KEYS } from "@/lib/room";
import { getServerUrl } from "@/lib/server";
import { joinRoom, type RoomConnection, type ConnStatus, type VideoContentInfo } from "@/lib/socket";
import type { Member, Message } from "@/lib/types";

const REACTIONS = ["🐻", "😂", "❤️", "😱", "😢", "😍", "😡"];

// group key for collapsing a run of messages from the same sender
const sender = (m: Message) => (m.mine ? "me" : m.from);

function typingLabel(typers: Map<string, string>): string {
  const names = [...typers.values()];
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return "Several bears are typing";
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function SidePanel() {
  const { inRoom, roomCode } = useRoomState();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typers, setTypers] = useState<Map<string, string>>(new Map());
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [popupHint, setPopupHint] = useState(false);
  const [videoTime, setVideoTime] = useState<number | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [content, setContent] = useState<VideoContentInfo | null>(null);
  const activeTabId = useRef<number | null>(null);
  const msgId = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const conn = useRef<RoomConnection | null>(null);
  // per-sender expiry so dots clear even if a "stopped" event never arrives
  const typerTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastTypingSent = useRef(0);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextId = () => ++msgId.current;

  useEffect(() => {
    void getIdentity().then(setIdentity);
    void getServerUrl().then(setServerUrl);
  }, []);

  // optimistic local state until the server sends the real roster
  useEffect(() => {
    if (inRoom && roomCode && identity) {
      msgId.current = 0;
      setMembers([{ ...identity, you: true, host: true }]);
      setMessages([{ id: nextId(), type: "system", text: `🐻 Bear Den opened · code ${roomCode}` }]);
    } else {
      setMembers([]);
      setMessages([]);
      setContent(null);
      clearTypers();
    }
  }, [inRoom, roomCode, identity]);

  // live room over websocket
  useEffect(() => {
    if (!inRoom || !roomCode || !identity || !serverUrl) return;
    setStatus("connecting");
    conn.current = joinRoom(serverUrl, roomCode, identity, {
      onMembers: (list, selfId) => setMembers(list.map((m) => ({ ...m, you: m.id === selfId }))),
      onChat: ({ from, text }) => setMessages((m) => [...m, { id: nextId(), type: "chat", from, text, ts: Date.now() }]),
      onTyping: ({ fromId, from, typing }) => applyTyping(fromId, from, typing),
      onSystem: (text) => setMessages((m) => [...m, { id: nextId(), type: "system", text }]),
      onStatus: setStatus,
      onContent: setContent,
    });
    return () => {
      conn.current?.disconnect();
      conn.current = null;
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      lastTypingSent.current = 0;
      clearTypers();
    };
  }, [inRoom, roomCode, identity, serverUrl]);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!inRoom) {
      setVideoTime(null);
      return;
    }
    let active = true;
    const poll = async () => {
      const tab = await getActiveTab();
      activeTabId.current = tab?.id ?? null;
      const res = tab?.id != null ? await getVideoTime(tab.id) : undefined;
      if (!active || res === undefined) return; // unreachable: keep last value
      setVideoTime(res?.currentTime ?? null);
    };
    void poll();
    const iv = setInterval(() => void poll(), 500);
    const onActivated = () => void poll();
    chrome.tabs.onActivated.addListener(onActivated);
    return () => {
      active = false;
      clearInterval(iv);
      chrome.tabs.onActivated.removeListener(onActivated);
    };
  }, [inRoom]);

  function clearTypers() {
    typerTimers.current.forEach(clearTimeout);
    typerTimers.current.clear();
    setTypers(new Map());
  }

  function applyTyping(fromId: string, from: string, typing: boolean) {
    const timers = typerTimers.current;
    const existing = timers.get(fromId);
    if (existing) clearTimeout(existing);
    if (typing) {
      setTypers((m) => new Map(m).set(fromId, from));
      timers.set(
        fromId,
        setTimeout(() => {
          timers.delete(fromId);
          setTypers((m) => {
            const n = new Map(m);
            n.delete(fromId);
            return n;
          });
        }, 4000),
      );
    } else {
      timers.delete(fromId);
      setTypers((m) => {
        const n = new Map(m);
        n.delete(fromId);
        return n;
      });
    }
  }

  function notifyTyping() {
    const now = Date.now();
    // leading-edge throttle so we don't burn the server rate limit on every keystroke
    if (now - lastTypingSent.current > 1500) {
      lastTypingSent.current = now;
      conn.current?.sendTyping(true);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(stopTyping, 2000);
  }

  function stopTyping() {
    if (typingStopTimer.current) {
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = null;
    }
    if (lastTypingSent.current === 0) return;
    lastTypingSent.current = 0;
    conn.current?.sendTyping(false);
  }

  function postChat(text: string) {
    const from = identity?.name ?? "You";
    setMessages((m) => [...m, { id: nextId(), type: "chat", from, text, mine: true, ts: Date.now() }]);
    conn.current?.sendChat(text);
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    postChat(text);
    setDraft("");
    stopTyping();
  }

  async function copyInvite() {
    // prefer the anchor tab's current url (what the den is actually watching);
    // fall back to this tab. host_permissions <all_urls> means tab.url is populated.
    const data = await chrome.storage.local.get(STORAGE_KEYS.anchorTabId);
    const anchorId = data[STORAGE_KEYS.anchorTabId];
    let tab: chrome.tabs.Tab | undefined;
    if (typeof anchorId === "number") tab = await chrome.tabs.get(anchorId).catch(() => undefined);
    if (!tab?.url) tab = await getActiveTab();
    if (!tab?.url || !roomCode) return;
    navigator.clipboard?.writeText(buildInviteLink(tab.url, roomCode)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function leave() {
    const tab = await getActiveTab();
    sendToBackground({ type: "WB_LEAVE_ROOM", tabId: tab?.id });
  }

  function openPopup() {
    // chrome.action.openPopup() is stable since Chrome 127; it can reject on
    // older/unsupported builds, in which case we fall back to the toolbar hint.
    chrome.action.openPopup().catch(() => setPopupHint(true));
  }

  if (!inRoom) {
    return (
      <div className="flex h-full animate-wb-fade-in flex-col items-center justify-center px-6 text-center font-nunito">
        <div className="animate-wb-float opacity-60">
          <BearMark size={56} />
        </div>
        <div className="mt-3 font-fredoka text-[16px] font-semibold text-wb-text">
          Watch<span className="wb-shimmer-text animate-wb-shimmer">bear</span>
        </div>
        <div className="mt-2 text-[12.5px] font-medium leading-[1.5] text-wb-dim">
          Start a watch party, or open an invite link a friend sent you.
        </div>
        <button
          type="button"
          onClick={openPopup}
          className="mt-4 animate-wb-glow rounded-[12px] bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-5 py-2 text-[13.5px] font-bold text-[#3a2410] shadow-md transition-all hover:scale-[1.02] hover:brightness-105 active:scale-95"
        >
          Start a Party
        </button>
        {popupHint && <div className="mt-3 text-[12px] font-medium text-wb-dim">Click the bear in the toolbar to start a party.</div>}
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col font-nunito">
      {/* header */}
      <div className="flex items-center justify-between gap-2 border-b border-wb-line px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="animate-wb-float">
            <BearMark size={22} />
          </div>
          <div className="font-fredoka text-[14px] font-semibold leading-none text-wb-text">Bear Den</div>
        </div>
        <button
          type="button"
          onClick={() => void leave()}
          title="leave room"
          className="shrink-0 rounded-[10px] border border-wb-line bg-[#2e2018] px-2.5 py-1 text-xs font-bold text-wb-dim transition-all hover:border-[rgba(255,140,107,.3)] hover:bg-[#3a2418] hover:text-wb-coral active:scale-95"
        >
          Leave
        </button>
      </div>

      {/* invite bar */}
      <div className="border-b border-wb-line px-3 py-2.5">
        <button
          type="button"
          onClick={() => void copyInvite()}
          title="copy invite link"
          className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(180deg,#FFC156,#F2912A)] py-2 text-[13px] font-bold text-[#3a2410] shadow-md transition-all hover:scale-[1.02] hover:brightness-105 active:scale-95"
        >
          {copied ? <IconCheck className="h-[15px] w-[15px] animate-wb-pop-in" /> : <IconCopy className="h-[15px] w-[15px]" />}
          {copied ? "Link copied!" : "Copy invite link"}
        </button>
      </div>

      {status !== "connected" && (
        <div
          className={`animate-wb-slide-down px-3 py-1.5 text-center text-[11.5px] font-bold ${
            status === "error" ? "bg-[rgba(255,140,107,.12)] text-wb-coral" : "bg-[rgba(255,178,62,.1)] text-wb-honey"
          }`}
        >
          {status === "error" ? "Can't reach the server, retrying…" : "Connecting to the den…"}
        </div>
      )}

      {/* members + sync */}
      <div className="border-b border-wb-line px-3 py-2.5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {members.map((m) => (
            <MemberChip key={m.id ?? m.name} m={m} />
          ))}
          <span className="ml-0.5 text-[12px] font-semibold text-wb-faint">
            {members.length} {members.length === 1 ? "bear" : "bears"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-wb-dim">
          <IconClock className="h-[13px] w-[13px]" />
          {videoTime == null ? "No video playing" : formatTime(videoTime)}
        </div>

        {content && (
          <div className="mt-1.5 flex animate-wb-fade-in items-center gap-1.5 text-[12px] font-semibold text-wb-dim">
            <IconTv className="h-[13px] w-[13px] shrink-0" />
            <span className="truncate">Now playing: {content.title || content.url}</span>
          </div>
        )}
      </div>

      {/* chat feed */}
      <div ref={feedRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2.5">
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const grouped = msg.type === "chat" && prev?.type === "chat" && sender(prev) === sender(msg);
          return <ChatLine key={msg.id} msg={msg} members={members} grouped={grouped} />;
        })}
      </div>

      {/* typing indicator */}
      <div className="h-[18px] px-3 text-[11.5px] font-semibold leading-[18px] text-wb-faint">
        {typers.size > 0 && (
          <span className="inline-flex animate-wb-fade-in">
            {typingLabel(typers)}
            <span className="inline-flex">
              <span className="animate-bounce [animation-delay:-0.3s]">.</span>
              <span className="animate-bounce [animation-delay:-0.15s]">.</span>
              <span className="animate-bounce">.</span>
            </span>
          </span>
        )}
      </div>

      {/* quick reactions */}
      <div className="flex gap-1.5 px-3 pt-1.5">
        {REACTIONS.map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => conn.current?.sendReaction(emoji)}
            className="flex-1 rounded-[11px] border border-wb-line bg-wb-panel py-1 text-[14px] transition-all hover:-translate-y-0.5 hover:scale-110 hover:border-[rgba(255,178,62,.26)] hover:bg-wb-panel2 hover:animate-wb-wiggle active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-1.5 p-3"
      >
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value) notifyTyping();
            else stopTyping();
          }}
          placeholder="Message the den…"
          maxLength={300}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-[13px] border border-wb-line bg-[#1d150f] px-3 py-2 text-[13px] font-semibold text-wb-text outline-none transition-colors placeholder:text-wb-faint focus:border-[rgba(255,178,62,.45)]"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="send"
          className="flex shrink-0 items-center justify-center rounded-[13px] bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-3 text-[#3a2410] transition-all enabled:hover:scale-110 enabled:active:scale-90 disabled:opacity-40"
        >
          <IconSend className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
